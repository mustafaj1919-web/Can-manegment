using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Common.Helpers;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;
namespace CarShowroomManagementV2.Application.Purchases.Commands
{
    public class BulkCreatePurchaseCommand : IRequest<BulkCreatePurchaseResult>
    {
        public Guid SupplierId { get; set; }
        public Guid? BranchId { get; set; } // target branch for purchase
        public decimal PurchaseCost { get; set; }
        public decimal? PaidAmount { get; set; } // null or 0 = full credit; > 0 = partial/full immediate payment
        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash; // used only when PaidAmount > 0
        public string? Brand { get; set; }
        public string Model { get; set; } = string.Empty;
        public string? Color { get; set; }
        public int Year { get; set; }
        public decimal TargetSellingPrice { get; set; }
        public List<string> ChassisNumbers { get; set; } = new();
        public Dictionary<string, BulkVehicleOverride>? VehicleOverrides { get; set; }
    }

    public class BulkVehicleOverride
    {
        public string? Color { get; set; }
        public string? PlateNumber { get; set; }
        public string? Notes { get; set; }
        public decimal? TargetSellingPrice { get; set; }
    }

    public class BulkCreatePurchaseResult
    {
        public List<Guid> PurchaseIds { get; set; } = new();
        public int CreatedCount { get; set; }
        public List<string> Errors { get; set; } = new();
        public Dictionary<string, Guid> ChassisToVehicleId { get; set; } = new();
    }

    public class BulkCreatePurchaseCommandValidator : AbstractValidator<BulkCreatePurchaseCommand>
    {
        public BulkCreatePurchaseCommandValidator()
        {
            RuleFor(x => x.SupplierId).NotEmpty().WithMessage("المورد مطلوب.");
            RuleFor(x => x.PurchaseCost).GreaterThan(0).WithMessage("تكلفة الشراء يجب أن تكون أكبر من صفر.");
            RuleFor(x => x.Model).NotEmpty().WithMessage("موديل السيارة مطلوب.");
            RuleFor(x => x.Year).GreaterThan(1900).WithMessage("سنة الصنع غير صالحة.");
            RuleFor(x => x.ChassisNumbers)
                .NotEmpty().WithMessage("يجب إدخال رقم شاصي واحد على الأقل.")
                .Must(list => list.Count <= 50).WithMessage("لا يمكن إضافة أكثر من 50 سيارة في عملية واحدة.")
                .Must(list => list.Distinct().Count() == list.Count).WithMessage("أرقام الشاصي يجب أن تكون فريدة.");
            RuleForEach(x => x.ChassisNumbers)
                .NotEmpty().WithMessage("رقم الشاصي لا يمكن أن يكون فارغاً.");
        }
    }

    public class BulkCreatePurchaseCommandHandler : IRequestHandler<BulkCreatePurchaseCommand, BulkCreatePurchaseResult>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public BulkCreatePurchaseCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<BulkCreatePurchaseResult> Handle(BulkCreatePurchaseCommand request, CancellationToken cancellationToken)
        {
            var branchId = request.BranchId ?? _currentUserService.BranchId;
            var result = new BulkCreatePurchaseResult();

            var supplier = await _context.Suppliers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Id == request.SupplierId && s.BranchId == branchId, cancellationToken);

            if (supplier == null)
                throw new InvalidOperationException("المورد المحدد غير موجود أو لا ينتمي لهذا الفرع.");

            var inventoryAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "1201" && a.BranchId == branchId, cancellationToken);
            if (inventoryAccount == null)
                throw new InvalidOperationException("حساب مخزون السيارات (1201) غير موجود في هذا الفرع.");

            Guid creditAccountId;
            string creditAccountDesc;

            if (request.PaymentMethod == PaymentMethod.Cash)
            {
                var cashAccount = await _context.Accounts
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(a => a.AccountCode == "111001" && a.BranchId == branchId, cancellationToken);
                if (cashAccount == null) throw new InvalidOperationException("حساب صندوق النقدية (111001) غير موجود.");
                creditAccountId = cashAccount.Id;
                creditAccountDesc = "صندوق النقدية الرئيسي";
            }
            else if (request.PaymentMethod == PaymentMethod.Bank)
            {
                var bankAccount = await _context.Accounts
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(a => a.AccountCode == "112001" && a.BranchId == branchId, cancellationToken);
                if (bankAccount == null) throw new InvalidOperationException("حساب البنك (112001) غير موجود.");
                creditAccountId = bankAccount.Id;
                creditAccountDesc = "حساب البنك";
            }
            else
            {
                creditAccountId = supplier.AccountId;
                creditAccountDesc = $"ذمم الدائنين - المورد: {supplier.Name}";
            }

            var dbContext = _context as DbContext ?? throw new InvalidOperationException("DbContext context is invalid.");
            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                var purchaseCost = AccountingAmount.RoundMoney(request.PurchaseCost);
                var targetSellingPrice = AccountingAmount.RoundMoney(request.TargetSellingPrice);

                // Default: 0 = full credit purchase (owed to supplier), explicit value = immediate payment
                var paidAmount = AccountingAmount.RoundMoney(request.PaidAmount ?? 0m);
                if (paidAmount < 0) paidAmount = 0;
                if (paidAmount > purchaseCost) paidAmount = purchaseCost;
                var hasImmediatePayment = paidAmount > 0;
                // If fully paid immediately → use chosen method; otherwise → Cheque (credit/payable to supplier)
                var effectiveMethod = paidAmount >= purchaseCost ? request.PaymentMethod : PaymentMethod.Cheque;

                // لأقساط: حساب الدفع الفوري (نقد/بنك)
                Guid? cashOrBankAccountId = null;
                string cashOrBankDesc = "";
                if (request.PaymentMethod == PaymentMethod.Cash)
                {
                    var cashAccount = await _context.Accounts.IgnoreQueryFilters()
                        .FirstOrDefaultAsync(a => a.AccountCode == "111001" && a.BranchId == branchId, cancellationToken);
                    if (cashAccount == null) throw new InvalidOperationException("حساب صندوق النقدية (111001) غير موجود.");
                    cashOrBankAccountId = cashAccount.Id;
                    cashOrBankDesc = "صندوق النقدية";
                }
                else if (request.PaymentMethod == PaymentMethod.Bank)
                {
                    var bankAccount = await _context.Accounts.IgnoreQueryFilters()
                        .FirstOrDefaultAsync(a => a.AccountCode == "112001" && a.BranchId == branchId, cancellationToken);
                    if (bankAccount == null) throw new InvalidOperationException("حساب البنك (112001) غير موجود.");
                    cashOrBankAccountId = bankAccount.Id;
                    cashOrBankDesc = "البنك";
                }

                foreach (var vin in request.ChassisNumbers)
                {
                    var exists = await _context.Vehicles
                        .IgnoreQueryFilters()
                        .AnyAsync(v => v.ChassisNumber == vin, cancellationToken);

                    if (exists)
                    {
                        result.Errors.Add($"رقم الشاصي {vin} مسجل مسبقاً في النظام ولا يمكن تكراره.");
                        continue;
                    }

                    var overrides = request.VehicleOverrides?.GetValueOrDefault(vin);
                    var effectiveTargetPrice = overrides?.TargetSellingPrice.HasValue == true
                        ? AccountingAmount.RoundMoney(overrides.TargetSellingPrice.Value)
                        : targetSellingPrice;

                    var vehicle = new Vehicle
                    {
                        Id = Guid.NewGuid(),
                        Brand = request.Brand,
                        Model = request.Model,
                        ChassisNumber = vin,
                        Color = !string.IsNullOrWhiteSpace(overrides?.Color) ? overrides.Color : request.Color,
                        PlateNumber = overrides?.PlateNumber,
                        Notes = overrides?.Notes,
                        Year = request.Year,
                        PurchaseCost = purchaseCost,
                        BookValue = purchaseCost,
                        TargetSellingPrice = effectiveTargetPrice,
                        Status = "Available",
                        IsSold = false,
                        BranchId = branchId
                    };
                    _context.Vehicles.Add(vehicle);
                    await _context.SaveChangesAsync(cancellationToken);

                    var detailedCost = new VehicleCost
                    {
                        Id = Guid.NewGuid(),
                        VehicleId = vehicle.Id,
                        CostType = "purchase",
                        Amount = purchaseCost,
                        Currency = "USD",
                        Description = "تكلفة الشراء عبر فاتورة شراء جماعية",
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.VehicleCosts.Add(detailedCost);
                    await _context.SaveChangesAsync(cancellationToken);

                    var totalPurchasesCount = await _context.Purchases.IgnoreQueryFilters().CountAsync(cancellationToken);
                    var purchaseNumber = $"PUR-{DateTime.UtcNow:yyyyMMdd}-{totalPurchasesCount + 1:D5}";

                    var purchase = new Purchase
                    {
                        Id = Guid.NewGuid(),
                        PurchaseNumber = purchaseNumber,
                        SupplierId = supplier.Id,
                        VehicleId = vehicle.Id,
                        PurchaseCost = purchaseCost,
                        AmountPaid = paidAmount,
                        PaymentMethod = effectiveMethod,
                        Status = "Active",
                        BranchId = branchId
                    };
                    _context.Purchases.Add(purchase);
                    await _context.SaveChangesAsync(cancellationToken);

                    var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                    var entryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

                    // القيد الرئيسي: مدين المخزون / دائن حساب المورد دائماً (نُسجّل الدين الكامل)
                    var mainCreditAccountId = supplier.AccountId;
                    var mainCreditDesc = $"إثبات استحقاق قيمة الشراء للمورد {supplier.Name}";

                    var journalEntry = new JournalEntry
                    {
                        Id = Guid.NewGuid(),
                        EntryNumber = entryNumber,
                        EntryDate = DateTime.UtcNow,
                        Description = $"قيد شراء سيارة {request.Model} - شاصي: {vin} - جماعي",
                        IsPosted = true,
                        BranchId = branchId,
                        ReferenceType = "Purchase",
                        ReferenceId = purchase.Id,
                        CreatedBy = _currentUserService.UserId
                    };

                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = journalEntry.Id,
                        AccountId = inventoryAccount.Id,
                        Debit = purchaseCost,
                        Credit = 0,
                        Description = $"زيادة المخزون - {request.Model} شاصي {vin}"
                    });
                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = journalEntry.Id,
                        AccountId = mainCreditAccountId,
                        Debit = 0,
                        Credit = purchaseCost,
                        Description = mainCreditDesc
                    });

                    if (!journalEntry.IsBalanced)
                        throw new InvalidOperationException($"القيد المحاسبي للسيارة {vin} غير متوازن.");

                    _context.JournalEntries.Add(journalEntry);
                    await _context.SaveChangesAsync(cancellationToken);

                    // قيد الدفعة الفورية إذا وُجدت (يُقلّل الدين للمورد ويُخرج النقدية/البنك)
                    if (hasImmediatePayment && cashOrBankAccountId.HasValue)
                    {
                        var totalEntriesCount2 = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                        var payEntryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount2 + 1:D5}";
                        var totalPaymentsCount = await _context.Payments.IgnoreQueryFilters().CountAsync(cancellationToken);
                        var payRefNumber = $"PAY-{DateTime.UtcNow:yyyyMMdd}-{totalPaymentsCount + 1:D5}";

                        var initialPayment = new Payment
                        {
                            Id = Guid.NewGuid(),
                            Type = PaymentType.Payment,
                            Method = request.PaymentMethod,
                            Amount = paidAmount,
                            ReferenceNumber = payRefNumber,
                            Description = $"دفعة أولى لشراء {request.Model} من المورد {supplier.Name} - شاصي: {vin}",
                            AccountId = cashOrBankAccountId.Value,
                            ContraAccountId = supplier.AccountId,
                            BranchId = branchId
                        };
                        _context.Payments.Add(initialPayment);
                        await _context.SaveChangesAsync(cancellationToken);

                        var payJournal = new JournalEntry
                        {
                            Id = Guid.NewGuid(),
                            EntryNumber = payEntryNumber,
                            EntryDate = DateTime.UtcNow,
                            Description = $"قيد الدفعة الأولى للمورد {supplier.Name} - شاصي: {vin}",
                            IsPosted = true,
                            BranchId = branchId,
                            ReferenceType = "Payment",
                            ReferenceId = initialPayment.Id,
                            CreatedBy = _currentUserService.UserId
                        };
                        payJournal.Lines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = payJournal.Id, AccountId = supplier.AccountId, Debit = paidAmount, Credit = 0, Description = $"تخفيض ذمة المورد {supplier.Name}" });
                        payJournal.Lines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = payJournal.Id, AccountId = cashOrBankAccountId.Value, Debit = 0, Credit = paidAmount, Description = $"خروج النقدية لصالح المورد {supplier.Name}" });

                        if (!payJournal.IsBalanced)
                            throw new InvalidOperationException($"قيد الدفعة الأولى للسيارة {vin} غير متوازن.");

                        _context.JournalEntries.Add(payJournal);
                        initialPayment.JournalEntryId = payJournal.Id;
                        await _context.SaveChangesAsync(cancellationToken);
                    }

                    result.PurchaseIds.Add(purchase.Id);
                    result.ChassisToVehicleId[vin] = vehicle.Id;
                    result.CreatedCount++;
                }

                await transaction.CommitAsync(cancellationToken);
                return result;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }
}
