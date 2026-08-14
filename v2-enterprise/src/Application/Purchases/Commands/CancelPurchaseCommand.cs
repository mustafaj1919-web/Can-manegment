using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Application.Purchases.Commands
{
    public class CancelPurchaseCommand : IRequest<bool>
    {
        public Guid PurchaseId { get; set; }
        public string? Reason { get; set; }
    }

    public class CancelPurchaseCommandValidator : AbstractValidator<CancelPurchaseCommand>
    {
        public CancelPurchaseCommandValidator()
        {
            RuleFor(x => x.PurchaseId).NotEmpty().WithMessage("معرف فاتورة الشراء مطلوب لإلغاء العملية.");
        }
    }

    public class CancelPurchaseCommandHandler : IRequestHandler<CancelPurchaseCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CancelPurchaseCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<bool> Handle(CancelPurchaseCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // 1. جلب فاتورة الشراء والتحقق من وجودها وحالتها
            var purchase = await _context.Purchases
                .IgnoreQueryFilters()
                .Include(p => p.Vehicle)
                .FirstOrDefaultAsync(p => p.Id == request.PurchaseId, cancellationToken);

            if (purchase == null)
            {
                throw new InvalidOperationException("فاتورة الشراء المحددة غير موجودة في النظام.");
            }

            if (purchase.Status == "Cancelled")
            {
                throw new InvalidOperationException("فاتورة الشراء هذه ملغاة بالفعل.");
            }

            if (purchase.AmountPaid > 0)
            {
                throw new InvalidOperationException("لا يمكن إلغاء فاتورة الشراء لوجود مبالغ مدفوعة مسجلة عليها. يرجى إلغاء/استرجاع المدفوعات أولاً.");
            }

            var effectiveBranchId = purchase.BranchId != Guid.Empty
                ? purchase.BranchId
                : (branchId != Guid.Empty ? branchId : new Guid("11111111-1111-1111-1111-111111111111"));

            // 2. التحقق من السيارة المرتبطة بالفاتورة
            var vehicle = await _context.Vehicles
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(v => v.Id == purchase.VehicleId, cancellationToken);

            if (vehicle != null)
            {
                // إذا كانت السيارة قد بيعت بعقد بيع نشط، يمنع الإلغاء
                var hasActiveSale = await _context.SalesContracts
                    .IgnoreQueryFilters()
                    .AnyAsync(sc => sc.VehicleId == vehicle.Id && sc.Status != "Cancelled", cancellationToken);

                if (vehicle.IsSold || hasActiveSale)
                {
                    throw new InvalidOperationException("لا يمكن إلغاء فاتورة الشراء لأن السيارة مرتبطة بعقد بيع نشط أو مباعة في النظام.");
                }

                // التحقق مما إذا كانت السيارة ناتجة عن شراء عادي أو إعادة شراء (Buyback)
                if (purchase.SourceType == Domain.Enums.PurchaseSourceType.Customer && purchase.PreviousSaleContractId.HasValue)
                {
                    // إعادة شراء معادة: في حال الإلغاء نرجع السيارة لحالة "مباعة" للعقد السابق
                    vehicle.IsSold = true;
                    vehicle.Status = "Sold";
                }
                else
                {
                    // شراء عادي: التحقق هل توجد فواتير شراء نشطة أخرى لنفس السيارة
                    var hasOtherActivePurchases = await _context.Purchases
                        .IgnoreQueryFilters()
                        .AnyAsync(p => p.VehicleId == vehicle.Id && p.Id != purchase.Id && p.Status != "Cancelled", cancellationToken);

                    if (!hasOtherActivePurchases)
                    {
                        vehicle.Status = "Cancelled";
                        vehicle.IsSold = false;
                    }
                }
                _context.Vehicles.Update(vehicle);

                // إزالة سجلات التكلفة التفصيلية المرتبطة بالفاتورة
                var vehicleCosts = await _context.VehicleCosts
                    .Where(vc => vc.VehicleId == vehicle.Id && vc.CostType == "purchase")
                    .ToListAsync(cancellationToken);

                if (vehicleCosts.Any())
                {
                    _context.VehicleCosts.RemoveRange(vehicleCosts);
                }
            }

            // 3. جلب القيود المحاسبية الأصلية التابعة لشراء هذه السيارة
            var originalJournalEntries = await _context.JournalEntries
                .IgnoreQueryFilters()
                .Include(je => je.Lines)
                .Where(je => (je.ReferenceType == "Purchase" || je.ReferenceType == "PurchasePayment") && je.ReferenceId == purchase.Id)
                .ToListAsync(cancellationToken);

            var dbContext = _context as DbContext;
            if (dbContext == null)
            {
                throw new InvalidOperationException("DbContext context is invalid.");
            }

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // 4. تحديث حالة الفاتورة
                purchase.Status = "Cancelled";
                _context.Purchases.Update(purchase);
                await _context.SaveChangesAsync(cancellationToken);

                // 5. إنشاء القيود العكسية المتوازنة لتصفير الأثر المالي
                foreach (var originalEntry in originalJournalEntries)
                {
                    var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                    var reversalEntryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

                    var reversalJournalEntry = new JournalEntry
                    {
                        Id = Guid.NewGuid(),
                        EntryNumber = reversalEntryNumber,
                        EntryDate = DateTime.UtcNow,
                        Description = $"قيد عكسي لإلغاء فاتورة الشراء رقم: {purchase.PurchaseNumber}" + (!string.IsNullOrWhiteSpace(request.Reason) ? $" - السبب: {request.Reason}" : ""),
                        IsPosted = true,
                        BranchId = effectiveBranchId,
                        ReferenceType = "PurchaseCancel",
                        ReferenceId = purchase.Id,
                        ReversedEntryId = originalEntry.Id,
                        IsReversed = false,
                        CreatedBy = _currentUserService.UserId
                    };

                    foreach (var originalLine in originalEntry.Lines)
                    {
                        reversalJournalEntry.Lines.Add(new JournalLine
                        {
                            Id = Guid.NewGuid(),
                            JournalEntryId = reversalJournalEntry.Id,
                            AccountId = originalLine.AccountId,
                            Debit = originalLine.Credit, // عكس المدين والدائن
                            Credit = originalLine.Debit,
                            Description = $"عكس القيد: {originalLine.Description}",
                            VehicleId = originalLine.VehicleId
                        });
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
