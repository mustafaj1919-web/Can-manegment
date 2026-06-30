using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Application.Inventory.Commands
{
    public class AddVehicleCostCommand : IRequest<Guid>
    {
        public Guid VehicleId { get; set; }
        public string CostType { get; set; } = string.Empty; // shipping, clearance, inspection, preparation, other, maintenance
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";
        public string? Description { get; set; }
        public string CreditAccountCode { get; set; } = "111001"; // الافتراضي صندوق النقدية الرئيسي 111001
    }

    public class AddVehicleCostCommandValidator : AbstractValidator<AddVehicleCostCommand>
    {
        public AddVehicleCostCommandValidator()
        {
            RuleFor(x => x.VehicleId).NotEmpty().WithMessage("معرّف السيارة مطلوب.");
            RuleFor(x => x.CostType).NotEmpty().WithMessage("نوع التكلفة مطلوب.");
            RuleFor(x => x.Amount).GreaterThan(0).WithMessage("قيمة التكلفة يجب أن تكون أكبر من صفر.");
        }
    }

    public class AddVehicleCostCommandHandler : IRequestHandler<AddVehicleCostCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public AddVehicleCostCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(AddVehicleCostCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // 1. جلب السيارة
            var vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => v.Id == request.VehicleId, cancellationToken);

            if (vehicle == null)
            {
                throw new KeyNotFoundException("السيارة المحددة غير موجودة.");
            }

            // 2. التحقق من وجود الحسابات المحاسبية
            // حساب المخزون: 1201
            var debitAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "1201", cancellationToken);

            // الحساب الدائن (الصندوق/البنك أو المورد)
            var creditAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == request.CreditAccountCode, cancellationToken);

            if (debitAccount == null)
            {
                throw new InvalidOperationException("حساب مخزون السيارات (1201) غير موجود في شجرة الحسابات.");
            }

            if (creditAccount == null)
            {
                throw new InvalidOperationException($"الحساب الدائن المحدد ({request.CreditAccountCode}) غير موجود في شجرة الحسابات.");
            }

            var dbContext = _context as DbContext;
            if (dbContext == null)
            {
                throw new InvalidOperationException("DbContext context is invalid.");
            }

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // 3. زيادة قيمة السيارة الدفترية وتحديث حقول التكلفة
                vehicle.BookValue += request.Amount;

                var type = request.CostType.ToLower();
                if (type == "clearance" || type == "customs" || type == "customduties")
                {
                    vehicle.CustomDuties += request.Amount;
                }
                else if (type == "maintenance" || type == "preparation")
                {
                    vehicle.MaintenanceCost += request.Amount;
                }
                else
                {
                    vehicle.MaintenanceCost += request.Amount; // افتراض صيانة لغير ذلك
                }

                _context.Vehicles.Update(vehicle);
                await _context.SaveChangesAsync(cancellationToken);

                // 4. إنشاء سجل تكلفة السيارة التفصيلي
                var vehicleCost = new VehicleCost
                {
                    Id = Guid.NewGuid(),
                    VehicleId = vehicle.Id,
                    CostType = request.CostType,
                    Amount = request.Amount,
                    Currency = request.Currency,
                    Description = request.Description,
                    CreatedAt = DateTime.UtcNow
                };

                _context.VehicleCosts.Add(vehicleCost);
                await _context.SaveChangesAsync(cancellationToken);

                // 5. إنشاء القيد المحاسبي المتوازن للتكلفة الإضافية
                var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                var entryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

                var journalEntry = new JournalEntry
                {
                    Id = Guid.NewGuid(),
                    EntryNumber = entryNumber,
                    EntryDate = DateTime.UtcNow,
                    Description = $"قيد تحميل تكلفة إضافية ({request.CostType}) - سيارة شاصي: {vehicle.ChassisNumber}",
                    IsPosted = true,
                    BranchId = branchId,
                    ReferenceType = "VehicleCost",
                    ReferenceId = vehicleCost.Id,
                    CreatedBy = _currentUserService.UserId
                };

                // سطر المدين (زيادة المخزون)
                var debitLine = new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = debitAccount.Id,
                    Debit = request.Amount,
                    Credit = 0,
                    Description = $"تحميل تكلفة إضافية {request.CostType} لسيارة {vehicle.Model}",
                    VehicleId = request.VehicleId
                };

                // سطر الدائن (الصندوق أو البنك أو ذمم الدائنين)
                var creditLine = new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = creditAccount.Id,
                    Debit = 0,
                    Credit = request.Amount,
                    Description = $"دفع/صرف قيمة تكلفة {request.CostType} للسيارة {vehicle.Model}",
                    VehicleId = request.VehicleId
                };

                journalEntry.Lines.Add(debitLine);
                journalEntry.Lines.Add(creditLine);

                _context.JournalEntries.Add(journalEntry);
                await _context.SaveChangesAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);
                return vehicleCost.Id;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync(cancellationToken);
                throw; // تفشل العملية بالكامل
            }
        }
    }
}
