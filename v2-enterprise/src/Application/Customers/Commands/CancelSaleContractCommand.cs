using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Application.Customers.Commands
{
    public class CancelSaleContractCommand : IRequest<bool>
    {
        public Guid ContractId { get; set; }
    }

    public class CancelSaleContractCommandValidator : AbstractValidator<CancelSaleContractCommand>
    {
        public CancelSaleContractCommandValidator()
        {
            RuleFor(x => x.ContractId).NotEmpty().WithMessage("معرف العقد مطلوب لإلغاء العملية.");
        }
    }

    public class CancelSaleContractCommandHandler : IRequestHandler<CancelSaleContractCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CancelSaleContractCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<bool> Handle(CancelSaleContractCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // 1. جلب عقد البيع والتحقق منه
            var contract = await _context.SalesContracts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(sc => sc.Id == request.ContractId, cancellationToken);

            if (contract == null)
            {
                throw new InvalidOperationException("عقد البيع المحدد غير موجود في النظام.");
            }

            if (contract.Status == "Cancelled")
            {
                throw new InvalidOperationException("عقد البيع هذا ملغي بالفعل.");
            }

            var effectiveBranchId = contract.BranchId != Guid.Empty
                ? contract.BranchId
                : (branchId != Guid.Empty ? branchId : new Guid("11111111-1111-1111-1111-111111111111"));

            // 2. جلب السيارة المرتبطة
            var vehicle = await _context.Vehicles
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(v => v.Id == contract.VehicleId, cancellationToken);

            if (vehicle == null)
            {
                throw new InvalidOperationException("السيارة المرتبطة بالعقد غير موجودة.");
            }

            // 3. جلب القيد المحاسبي الأصلي للعملية إن وجد
            var originalJournalEntry = await _context.JournalEntries
                .IgnoreQueryFilters()
                .Include(je => je.Lines)
                .FirstOrDefaultAsync(je => je.ReferenceType == "SaleContract" && je.ReferenceId == contract.Id, cancellationToken);

            var dbContext = _context as DbContext;
            if (dbContext == null)
            {
                throw new InvalidOperationException("DbContext context is invalid.");
            }

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // 4. تحديث حالة العقد
                contract.Status = "Cancelled";
                _context.SalesContracts.Update(contract);

                // 5. استعادة السيارة للمخزون
                vehicle.IsSold = false;
                vehicle.Status = "Available";
                _context.Vehicles.Update(vehicle);

                // 6. حذف خطة التقسيط والأقساط التابعة لها إن وجدت
                var plan = await _context.InstallmentPlans
                    .IgnoreQueryFilters()
                    .Include(ip => ip.Installments)
                    .FirstOrDefaultAsync(ip => ip.SalesContractId == contract.Id, cancellationToken);

                if (plan != null)
                {
                    var hasPaid = plan.Installments.Any(i => i.Status == "Paid" || i.PaidAmount > 0);
                    if (hasPaid)
                    {
                        throw new InvalidOperationException("لا يمكن إلغاء عقد البيع لوجود أقساط مسددة بالفعل. يجب استرجاع المبالغ أو معالجتها محاسبياً أولاً.");
                    }

                    _context.Installments.RemoveRange(plan.Installments);
                    _context.InstallmentPlans.Remove(plan);
                }

                await _context.SaveChangesAsync(cancellationToken);

                // 7. إنشاء القيد العكسي المتوازن لتصفير الأثر المالي للفاتورة إن وجد قيد أصلي
                if (originalJournalEntry != null)
                {
                    var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                    var reversalEntryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

                    var reversalJournalEntry = new JournalEntry
                    {
                        Id = Guid.NewGuid(),
                        EntryNumber = reversalEntryNumber,
                        EntryDate = DateTime.UtcNow,
                        Description = $"قيد تسوية عكسي لإلغاء الفاتورة/العقد رقم: {contract.ContractNumber}",
                        IsPosted = true,
                        BranchId = effectiveBranchId,
                        ReferenceType = "SaleContractCancel",
                        ReferenceId = contract.Id,
                        ReversedEntryId = originalJournalEntry.Id,
                        IsReversed = false,
                        CreatedBy = _currentUserService.UserId
                    };

                    // نسخ السطور وعكس المدين والدائن
                    foreach (var originalLine in originalJournalEntry.Lines)
                    {
                        var reversalLine = new JournalLine
                        {
                            Id = Guid.NewGuid(),
                            JournalEntryId = reversalJournalEntry.Id,
                            AccountId = originalLine.AccountId,
                            Debit = originalLine.Credit, // عكس المدين والدائن
                            Credit = originalLine.Debit,
                            Description = $"إلغاء وعكس السطر: {originalLine.Description}"
                        };
                        reversalJournalEntry.Lines.Add(reversalLine);
                    }

                    if (!reversalJournalEntry.IsBalanced)
                    {
                        throw new InvalidOperationException("قيد التسوية العكسي المولد غير متوازن.");
                    }

                    _context.JournalEntries.Add(reversalJournalEntry);
                    await _context.SaveChangesAsync(cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);
                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }
}
