using System;
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
    public class CreatePurchaseCommand : IRequest<Guid>
    {
        public PurchaseSourceType SourceType { get; set; } = PurchaseSourceType.Supplier;
        public Guid? SupplierId { get; set; }
        public Guid? CustomerId { get; set; }
        public Guid? BranchId { get; set; } // target branch
        public decimal PurchaseCost { get; set; }
        public decimal? PaidAmount { get; set; } // null or 0 = full credit; > 0 = immediate payment
        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash; // used only when PaidAmount > 0

        // تفاصيل السيارة
        public string? Brand { get; set; }
        public string Model { get; set; } = string.Empty;
        public string ChassisNumber { get; set; } = string.Empty;
        public string? EngineNumber { get; set; }
        public string? Color { get; set; }
        public int Year { get; set; }
        public decimal TargetSellingPrice { get; set; }
        
        // المواصفات الاختيارية
        public string? Trim { get; set; }
        public string? Condition { get; set; }
        public string? PlateNumber { get; set; }
        public string? PlateStatus { get; set; }
        public int? Mileage { get; set; }
        public string? EngineSize { get; set; }
        public int? Cylinders { get; set; }
        public string? Transmission { get; set; }
        public string? FuelType { get; set; }
        public string? ImportCountry { get; set; }
        public int? SeatCount { get; set; }
        public string? SeatMaterial { get; set; }
        public string? Currency { get; set; }
        public string? Notes { get; set; }
    }

    public class CreatePurchaseCommandValidator : AbstractValidator<CreatePurchaseCommand>
    {
        public CreatePurchaseCommandValidator()
        {
            RuleFor(x => x.SourceType).IsInEnum().WithMessage("نوع جهة الشراء غير صالح.");
            RuleFor(x => x).Must(x =>
            {
                if (x.SourceType == PurchaseSourceType.Supplier)
                    return x.SupplierId.HasValue && x.SupplierId.Value != Guid.Empty && (!x.CustomerId.HasValue || x.CustomerId.Value == Guid.Empty);
                if (x.SourceType == PurchaseSourceType.Customer)
                    return x.CustomerId.HasValue && x.CustomerId.Value != Guid.Empty && (!x.SupplierId.HasValue || x.SupplierId.Value == Guid.Empty);
                return false;
            }).WithMessage("يجب تحديد المورد فقط عند الشراء من مورد، أو تحديد الزبون فقط عند الشراء من زبون.");

            RuleFor(x => x.PurchaseCost).GreaterThan(0).WithMessage("تكلفة الشراء يجب أن تكون أكبر من صفر.");
            RuleFor(x => x.Model).NotEmpty().WithMessage("موديل السيارة مطلوب.");
            RuleFor(x => x.ChassisNumber).NotEmpty().WithMessage("رقم الشاسيه مطلوب.");
            RuleFor(x => x.Year).GreaterThan(1900).WithMessage("سنة الصنع غير صالحة.");
        }
    }

    public class CreatePurchaseCommandHandler : IRequestHandler<CreatePurchaseCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CreatePurchaseCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(CreatePurchaseCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // 1. التحقق من وحل بيانات جهة الشراء (مورد أو زبون)
            var counterparty = await CounterpartyResolver.ResolveAsync(
                _context,
                request.SourceType,
                request.SupplierId,
                request.CustomerId,
                branchId,
                cancellationToken);

            // 2. التحقق من رقم الشاصي مع دعم إعادة الشراء (Buyback) للسيارات المباعة سابقاً
            var existingVehicle = await _context.Vehicles
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(v => v.ChassisNumber == request.ChassisNumber, cancellationToken);

            Vehicle? vehicle = null;

            if (existingVehicle != null)
            {
                if (request.SourceType == PurchaseSourceType.Customer)
                {
                    // التحقق من صلاحية إعادة الشراء من الزبون (Buyback Eligibility)
                    if (existingVehicle.Status == "Available" || !existingVehicle.IsSold)
                    {
                        throw new InvalidOperationException($"السيارة برقم الشاصي '{request.ChassisNumber}' موجودة حالياً في المخزون ولا يمكن إعادتها.");
                    }

                    var lastSale = await _context.SalesContracts
                        .IgnoreQueryFilters()
                        .Where(sc => sc.VehicleId == existingVehicle.Id && sc.CustomerId == request.CustomerId && sc.Status != "Cancelled")
                        .OrderByDescending(sc => sc.SaleDate)
                        .FirstOrDefaultAsync(cancellationToken);

                    if (lastSale == null)
                    {
                        throw new InvalidOperationException($"لم يتم العثور على عقد بيع سابق مؤكد للسيارة رقم '{request.ChassisNumber}' لصالح هذا الزبون.");
                    }
                }
                else
                {
                    throw new InvalidOperationException($"رقم الشاصي '{request.ChassisNumber}' مسجل مسبقاً في النظام ولا يمكن تكراره.");
                }
            }

            var dbContext = _context as DbContext;
            if (dbContext == null)
            {
                throw new InvalidOperationException("DbContext context is invalid.");
            }

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                var purchaseCost = AccountingAmount.RoundMoney(request.PurchaseCost);
                var targetSellingPrice = AccountingAmount.RoundMoney(request.TargetSellingPrice);

                if (existingVehicle != null)
                {
                    // تحديث حالة وتكلفة السيارة المعادة إلى المخزون (Buyback)
                    existingVehicle.IsSold = false;
                    existingVehicle.Status = "Available";
                    existingVehicle.PurchaseCost = purchaseCost;
                    existingVehicle.BookValue = purchaseCost;
                    if (targetSellingPrice > 0) existingVehicle.TargetSellingPrice = targetSellingPrice;
                    if (!string.IsNullOrWhiteSpace(request.Color)) existingVehicle.Color = request.Color;
                    if (!string.IsNullOrWhiteSpace(request.PlateNumber)) existingVehicle.PlateNumber = request.PlateNumber;
                    if (request.Mileage.HasValue) existingVehicle.Mileage = request.Mileage.Value;
                    if (!string.IsNullOrWhiteSpace(request.Condition)) existingVehicle.Condition = request.Condition;
                    if (!string.IsNullOrWhiteSpace(request.Notes)) existingVehicle.Notes = request.Notes;

                    _context.Vehicles.Update(existingVehicle);
                    vehicle = existingVehicle;
                }
                else
                {
                    vehicle = new Vehicle
                    {
                    Id = Guid.NewGuid(),
                    Brand = request.Brand,
                    Model = request.Model,
                    ChassisNumber = request.ChassisNumber,
                    EngineNumber = request.EngineNumber,
                    Color = request.Color,
                    Year = request.Year,
                    PurchaseCost = purchaseCost,
                    BookValue = purchaseCost,
                    TargetSellingPrice = targetSellingPrice,
                    Status = "Available",
                    IsSold = false,
                    BranchId = branchId,
                    Trim = request.Trim,
                    Condition = request.Condition,
                    PlateNumber = request.PlateNumber,
                    PlateStatus = request.PlateStatus,
                    Mileage = request.Mileage ?? 0,
                    EngineSize = request.EngineSize,
                    Cylinders = request.Cylinders,
                    Transmission = request.Transmission,
                    FuelType = request.FuelType,
                    ImportCountry = request.ImportCountry,
                    SeatCount = request.SeatCount,
                    SeatMaterial = request.SeatMaterial,
                    };
                    _context.Vehicles.Add(vehicle);
                }

                await _context.SaveChangesAsync(cancellationToken);

                // إضافة سجل التكلفة التفصيلية الأولية
                var detailedCost = new VehicleCost
                {
                    Id = Guid.NewGuid(),
                    VehicleId = vehicle.Id,
                    CostType = "purchase",
                    Amount = purchaseCost,
                    Currency = "USD",
                    Description = $"تكلفة الشراء عبر فاتورة شراء معتمدة من {(request.SourceType == PurchaseSourceType.Customer ? "الزبون" : "المورد")} {counterparty.Name}",
                    CreatedAt = DateTime.UtcNow
                };
                _context.VehicleCosts.Add(detailedCost);
                await _context.SaveChangesAsync(cancellationToken);

                // 3. تحديد المبلغ المدفوع — الافتراضي 0 (آجل كامل على حساب الجهة)
                var paidAmount = AccountingAmount.RoundMoney(request.PaidAmount ?? 0m);
                if (paidAmount < 0) paidAmount = 0;
                if (paidAmount > purchaseCost) paidAmount = purchaseCost;
                var hasImmediatePayment = paidAmount > 0;
                var effectiveMethod = paidAmount >= purchaseCost ? request.PaymentMethod : PaymentMethod.Cheque;

                // حساب المخزون: 1201
                var inventoryAccount = await _context.Accounts
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(a => a.AccountCode == "1201" && a.BranchId == branchId, cancellationToken);

                if (inventoryAccount == null)
                    throw new InvalidOperationException("حساب مخزون السيارات (1201) غير موجود في هذا الفرع.");

                // حساب الدفع الفوري (نقد/بنك)
                Guid? cashOrBankAccountId = null;
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

                // AmountPaid يُسجَّل فقط إذا تم دفع نقدي/بنكي فعلي
                var actualAmountPaid = (hasImmediatePayment && cashOrBankAccountId.HasValue) ? paidAmount : 0m;

                // 4. إنشاء سجل الشراء
                var totalPurchasesCount = await _context.Purchases.IgnoreQueryFilters().CountAsync(cancellationToken);
                var purchaseNumber = $"PUR-{DateTime.UtcNow:yyyyMMdd}-{totalPurchasesCount + 1:D5}";

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
                await _context.SaveChangesAsync(cancellationToken);

                // 5. القيد الرئيسي: مدين المخزون / دائن حساب الجهة (بالمبلغ الكامل)
                var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                var entryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

                var journalEntry = new JournalEntry
                {
                    Id = Guid.NewGuid(),
                    EntryNumber = entryNumber,
                    EntryDate = DateTime.UtcNow,
                    Description = $"قيد إثبات شراء سيارة من {(request.SourceType == PurchaseSourceType.Customer ? "الزبون" : "المورد")} {counterparty.Name} بموجب فاتورة رقم: {purchaseNumber}",
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
                    Description = $"زيادة قيمة المخزون بشراء سيارة {vehicle.Model} - شاصي: {vehicle.ChassisNumber}",
                    VehicleId = vehicle.Id
                });

                journalEntry.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = counterparty.AccountId,
                    Debit = 0,
                    Credit = purchaseCost,
                    Description = $"إثبات استحقاق قيمة الشراء لـ {(request.SourceType == PurchaseSourceType.Customer ? "الزبون" : "المورد")} {counterparty.Name}",
                    VehicleId = vehicle.Id
                });

                _context.JournalEntries.Add(journalEntry);
                await _context.SaveChangesAsync(cancellationToken);

                // 6. قيد الدفع الفوري (إذا تم دفع مبلغ نقدي/بنكي فورياً)
                if (actualAmountPaid > 0 && cashOrBankAccountId.HasValue)
                {
                    var payEntryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 2:D5}";
                    var payEntry = new JournalEntry
                    {
                        Id = Guid.NewGuid(),
                        EntryNumber = payEntryNumber,
                        EntryDate = DateTime.UtcNow,
                        Description = $"سداد فورى لقيمة شراء سيارة من {(request.SourceType == PurchaseSourceType.Customer ? "الزبون" : "المورد")} {counterparty.Name} - فاتورة: {purchaseNumber}",
                        IsPosted = true,
                        BranchId = branchId,
                        ReferenceType = "PurchasePayment",
                        ReferenceId = purchase.Id,
                        CreatedBy = _currentUserService.UserId
                    };

                    // مدين حساب الجهة (تخفيض الدين المستحق لهم)
                    payEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = payEntry.Id,
                        AccountId = counterparty.AccountId,
                        Debit = actualAmountPaid,
                        Credit = 0,
                        Description = $"سداد مستحقات لـ {(request.SourceType == PurchaseSourceType.Customer ? "الزبون" : "المورد")} {counterparty.Name} - شراء سيارة {vehicle.Model}",
                        VehicleId = vehicle.Id
                    });

                    // دائن الصندوق / البنك
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
                    await _context.SaveChangesAsync(cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);
                return purchase.Id;
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }
}
