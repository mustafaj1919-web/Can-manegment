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
        public PurchaseSourceType SourceType { get; set; } = PurchaseSourceType.Supplier;
        public Guid? SupplierId { get; set; }
        public Guid? CustomerId { get; set; }
        public Guid? BranchId { get; set; } // target branch for purchase
        public decimal PurchaseCost { get; set; }
        public decimal? PaidAmount { get; set; } // null or 0 = full credit; > 0 = partial/full immediate payment
        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash; // used only when PaidAmount > 0
        public string? Brand { get; set; }
        public string Model { get; set; } = string.Empty;
        public string? Trim { get; set; }
        public string? Color { get; set; }
        public int Year { get; set; }
        public string? Condition { get; set; }
        public string? FuelType { get; set; }
        public string? Transmission { get; set; }
        public string? EngineSize { get; set; }
        public int? Cylinders { get; set; }
        public int? SeatCount { get; set; }
        public string? ImportCountry { get; set; }
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
            RuleFor(x => x.SourceType).IsInEnum().WithMessage("نوع جهة الشراء غير صالح.");
            RuleFor(x => x).Must(x =>
            {
                if (x.SourceType == PurchaseSourceType.Supplier)
                    return x.SupplierId.HasValue && x.SupplierId.Value != Guid.Empty && (!x.CustomerId.HasValue || x.CustomerId.Value == Guid.Empty);
                if (x.SourceType == PurchaseSourceType.Customer)
                    return x.CustomerId.HasValue && x.CustomerId.Value != Guid.Empty && (!x.SupplierId.HasValue || x.SupplierId.Value == Guid.Empty);
                return false;
            }).WithMessage("يجب تحديد المورد فقط عند الشراء بالجملة من مورد، أو تحديد الزبون فقط عند الشراء بالجملة من زبون.");

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
            var branchId = _currentUserService.BranchId;
            var result = new BulkCreatePurchaseResult();

            var counterparty = await CounterpartyResolver.ResolveAsync(
                _context,
                request.SourceType,
                request.SupplierId,
                request.CustomerId,
                branchId,
                cancellationToken);

            var inventoryAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "1201" && a.BranchId == branchId, cancellationToken);
            if (inventoryAccount == null)
                throw new InvalidOperationException("حساب مخزون السيارات (1201) غير موجود في هذا الفرع.");

            // حساب الدفع الفوري (نقد/بنك)
            var paidAmount = AccountingAmount.RoundMoney(request.PaidAmount ?? 0m);
            if (paidAmount < 0) paidAmount = 0;
            if (paidAmount > request.PurchaseCost) paidAmount = request.PurchaseCost;
            var hasImmediatePayment = paidAmount > 0;
            var effectiveMethod = paidAmount >= request.PurchaseCost ? request.PaymentMethod : PaymentMethod.Cheque;

            Guid? cashOrBankAccountId = null;
            if (hasImmediatePayment)
            {
                if (request.PaymentMethod == PaymentMethod.Cash)
                {
                    var cashAccount = await _context.Accounts
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(a => a.AccountCode == "111001" && a.BranchId == branchId, cancellationToken);
                    if (cashAccount == null) throw new InvalidOperationException("حساب صندوق النقدية (111001) غير موجود في هذا الفرع.");
                    cashOrBankAccountId = cashAccount.Id;
                }
                else if (request.PaymentMethod == PaymentMethod.Bank)
                {
                    var bankAccount = await _context.Accounts
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(a => a.AccountCode == "112001" && a.BranchId == branchId, cancellationToken);
                    if (bankAccount == null) throw new InvalidOperationException("حساب البنك (112001) غير موجود في هذا الفرع.");
                    cashOrBankAccountId = bankAccount.Id;
                }
            }

            var actualAmountPaid = (hasImmediatePayment && cashOrBankAccountId.HasValue) ? paidAmount : 0m;

            var existingChassis = await _context.Vehicles
                .IgnoreQueryFilters()
                .Where(v => request.ChassisNumbers.Contains(v.ChassisNumber))
                .Select(v => v.ChassisNumber)
                .ToListAsync(cancellationToken);

            if (existingChassis.Any())
            {
                throw new InvalidOperationException($"أرقام الشاصي التالية مسجلة مسبقاً في النظام: {string.Join(", ", existingChassis)}");
            }

            var dbContext = _context as DbContext;
            if (dbContext == null) throw new InvalidOperationException("DbContext context is invalid.");

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                var totalPurchasesCount = await _context.Purchases.IgnoreQueryFilters().CountAsync(cancellationToken);
                var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                var purchaseCost = AccountingAmount.RoundMoney(request.PurchaseCost);

                for (int i = 0; i < request.ChassisNumbers.Count; i++)
                {
                    var chassis = request.ChassisNumbers[i].Trim();
                    BulkVehicleOverride? overrideInfo = null;
                    request.VehicleOverrides?.TryGetValue(chassis, out overrideInfo);

                    var color = overrideInfo?.Color ?? request.Color;
                    var plateNumber = overrideInfo?.PlateNumber;
                    var notes = overrideInfo?.Notes;
                    var sellingPrice = AccountingAmount.RoundMoney(overrideInfo?.TargetSellingPrice ?? request.TargetSellingPrice);

                    var vehicle = new Vehicle
                    {
                        Id = Guid.NewGuid(),
                        Brand = request.Brand,
                        Model = request.Model,
                        ChassisNumber = chassis,
                        Color = color,
                        Year = request.Year,
                        PurchaseCost = purchaseCost,
                        BookValue = purchaseCost,
                        TargetSellingPrice = sellingPrice,
                        Status = "Available",
                        IsSold = false,
                        BranchId = branchId,
                        Trim = request.Trim,
                        Condition = request.Condition,
                        PlateNumber = plateNumber,
                        Mileage = 0,
                        EngineSize = request.EngineSize,
                        Cylinders = request.Cylinders,
                        Transmission = request.Transmission,
                        FuelType = request.FuelType,
                        ImportCountry = request.ImportCountry,
                        SeatCount = request.SeatCount,
                        Currency = "USD",
                        Notes = notes
                    };
                    _context.Vehicles.Add(vehicle);

                    var detailedCost = new VehicleCost
                    {
                        Id = Guid.NewGuid(),
                        VehicleId = vehicle.Id,
                        CostType = "purchase",
                        Amount = purchaseCost,
                        Currency = "USD",
                        Description = $"تكلفة الشراء عبر شراء بالجملة من {(request.SourceType == PurchaseSourceType.Customer ? "الزبون" : "المورد")} {counterparty.Name}",
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.VehicleCosts.Add(detailedCost);

                    var purchaseNumber = $"PUR-{DateTime.UtcNow:yyyyMMdd}-{totalPurchasesCount + i + 1:D5}";
                    var purchase = new Purchase
                    {
                        Id = Guid.NewGuid(),
                        PurchaseNumber = purchaseNumber,
                        SourceType = request.SourceType,
                        SupplierId = request.SourceType == PurchaseSourceType.Supplier ? counterparty.Id : null,
                        CustomerId = request.SourceType == PurchaseSourceType.Customer ? counterparty.Id : null,
                        VehicleId = vehicle.Id,
                        PurchaseCost = purchaseCost,
                        AmountPaid = actualAmountPaid,
                        PaymentMethod = effectiveMethod,
                        Status = "Active",
                        BranchId = branchId
                    };
                    _context.Purchases.Add(purchase);

                    var entryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + (i * 2) + 1:D5}";
                    var journalEntry = new JournalEntry
                    {
                        Id = Guid.NewGuid(),
                        EntryNumber = entryNumber,
                        EntryDate = DateTime.UtcNow,
                        Description = $"قيد إثبات شراء بالجملة من {(request.SourceType == PurchaseSourceType.Customer ? "الزبون" : "المورد")} {counterparty.Name} - فاتورة: {purchaseNumber}",
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
                        Description = $"زيادة قيمة المخزون بشراء سيارة {vehicle.Model} - شاصي: {chassis}",
                        VehicleId = vehicle.Id
                    });

                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = journalEntry.Id,
                        AccountId = counterparty.AccountId,
                        Debit = 0,
                        Credit = purchaseCost,
                        Description = $"إثبات استحقاق لـ {(request.SourceType == PurchaseSourceType.Customer ? "الزبون" : "المورد")} {counterparty.Name}",
                        VehicleId = vehicle.Id
                    });

                    _context.JournalEntries.Add(journalEntry);

                    if (actualAmountPaid > 0 && cashOrBankAccountId.HasValue)
                    {
                        var payEntryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + (i * 2) + 2:D5}";
                        var payEntry = new JournalEntry
                        {
                            Id = Guid.NewGuid(),
                            EntryNumber = payEntryNumber,
                            EntryDate = DateTime.UtcNow,
                            Description = $"سداد فورى لشراء بالجملة من {(request.SourceType == PurchaseSourceType.Customer ? "الزبون" : "المورد")} {counterparty.Name} - فاتورة: {purchaseNumber}",
                            IsPosted = true,
                            BranchId = branchId,
                            ReferenceType = "PurchasePayment",
                            ReferenceId = purchase.Id,
                            CreatedBy = _currentUserService.UserId
                        };

                        payEntry.Lines.Add(new JournalLine
                        {
                            Id = Guid.NewGuid(),
                            JournalEntryId = payEntry.Id,
                            AccountId = counterparty.AccountId,
                            Debit = actualAmountPaid,
                            Credit = 0,
                            Description = $"سداد مستحقات لـ {(request.SourceType == PurchaseSourceType.Customer ? "الزبون" : "المورد")} {counterparty.Name}",
                            VehicleId = vehicle.Id
                        });

                        payEntry.Lines.Add(new JournalLine
                        {
                            Id = Guid.NewGuid(),
                            JournalEntryId = payEntry.Id,
                            AccountId = cashOrBankAccountId.Value,
                            Debit = 0,
                            Credit = actualAmountPaid,
                            Description = $"دفع من الحساب لصالح {(request.SourceType == PurchaseSourceType.Customer ? "الزبون" : "المورد")} {counterparty.Name}",
                            VehicleId = vehicle.Id
                        });

                        _context.JournalEntries.Add(payEntry);
                    }

                    result.PurchaseIds.Add(purchase.Id);
                    result.ChassisToVehicleId[chassis] = vehicle.Id;
                }

                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                result.CreatedCount = result.PurchaseIds.Count;
                return result;
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }
}
