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
        public Guid SupplierId { get; set; }
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
    }

    public class CreatePurchaseCommandValidator : AbstractValidator<CreatePurchaseCommand>
    {
        public CreatePurchaseCommandValidator()
        {
            RuleFor(x => x.SupplierId).NotEmpty().WithMessage("المورد مطلوب.");
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
            var branchId = request.BranchId ?? _currentUserService.BranchId;

            // 1. التحقق من وجود المورد
            var supplier = await _context.Suppliers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Id == request.SupplierId && s.BranchId == branchId, cancellationToken);

            if (supplier == null)
            {
                throw new InvalidOperationException("المورد المحدد غير موجود أو لا ينتمي لهذا الفرع.");
            }

            // 2. التحقق من عدم تكرار رقم الشاصي عالمياً
            var vehicleExists = await _context.Vehicles
                .IgnoreQueryFilters()
                .AnyAsync(v => v.ChassisNumber == request.ChassisNumber, cancellationToken);

            if (vehicleExists)
                throw new InvalidOperationException($"رقم الشاصي '{request.ChassisNumber}' مسجل مسبقاً في النظام ولا يمكن تكراره.");

            Vehicle? vehicle = null;

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
                    BranchId = branchId
                };
                _context.Vehicles.Add(vehicle);

                await _context.SaveChangesAsync(cancellationToken);

                // إضافة سجل التكلفة التفصيلية الأولية
                var detailedCost = new VehicleCost
                {
                    Id = Guid.NewGuid(),
                    VehicleId = vehicle.Id,
                    CostType = "purchase",
                    Amount = purchaseCost,
                    Currency = "USD",
                    Description = "تكلفة الشراء عبر فاتورة شراء معتمدة",
                    CreatedAt = DateTime.UtcNow
                };
                _context.VehicleCosts.Add(detailedCost);
                await _context.SaveChangesAsync(cancellationToken);

                // 3. تحديد المبلغ المدفوع — الافتراضي 0 (آجل كامل على حساب المورد)
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
                string cashOrBankDesc = "";
                if (request.PaymentMethod == PaymentMethod.Cash)
                {
                    var cashAccount = await _context.Accounts
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(a => a.AccountCode == "111001" && a.BranchId == branchId, cancellationToken);
                    if (cashAccount == null) throw new InvalidOperationException("حساب صندوق النقدية (111001) غير موجود في هذا الفرع.");
                    cashOrBankAccountId = cashAccount.Id;
                    cashOrBankDesc = "صندوق النقدية";
                }
                else if (request.PaymentMethod == PaymentMethod.Bank)
                {
                    var bankAccount = await _context.Accounts
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(a => a.AccountCode == "112001" && a.BranchId == branchId, cancellationToken);
                    if (bankAccount == null) throw new InvalidOperationException("حساب البنك (112001) غير موجود في هذا الفرع.");
                    cashOrBankAccountId = bankAccount.Id;
                    cashOrBankDesc = "البنك";
                }

                // 4. إنشاء سجل الشراء
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

                // 5. القيد الرئيسي: مدين المخزون / دائن حساب المورد (بالمبلغ الكامل)
                var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                var entryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

                Guid mainCreditAccountId;
                string mainCreditDesc;

                // القيد الرئيسي دائماً: دائن حساب المورد بالمبلغ الكامل (نُسجّل الدين)
                mainCreditAccountId = supplier.AccountId;
                mainCreditDesc = $"إثبات استحقاق قيمة الشراء للمورد {supplier.Name}";

                var journalEntry = new JournalEntry
                {
                    Id = Guid.NewGuid(),
                    EntryNumber = entryNumber,
                    EntryDate = DateTime.UtcNow,
                    Description = $"قيد إثبات شراء سيارة بموجب فاتورة رقم: {purchaseNumber}",
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
                    AccountId = mainCreditAccountId,
                    Debit = 0,
                    Credit = purchaseCost,
                    Description = mainCreditDesc,
                    VehicleId = vehicle.Id
                });

                if (!journalEntry.IsBalanced)
                    throw new InvalidOperationException("القيد المحاسبي لعملية الشراء غير متوازن.");

                _context.JournalEntries.Add(journalEntry);
                await _context.SaveChangesAsync(cancellationToken);

                // 6. قيد الدفعة الفورية إن وُجدت — مدين المورد / دائن الصندوق أو البنك
                if (hasImmediatePayment && cashOrBankAccountId.HasValue)
                {
                    // التحقق من كفاية رصيد الصندوق/البنك للدفعة الأولى
                    var availableBalance = await _context.JournalLines
                        .Where(l => l.AccountId == cashOrBankAccountId.Value)
                        .SumAsync(l => l.Debit - l.Credit, cancellationToken);
                    if (availableBalance < paidAmount)
                        throw new InvalidOperationException($"رصيد الحساب غير كافٍ للدفعة الأولى. المتاح: {availableBalance:N0}، المطلوب: {paidAmount:N0}.");

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
                        Description = $"دفعة أولى لشراء سيارة {vehicle.Model} من المورد {supplier.Name} - فاتورة: {purchaseNumber}",
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
                        Description = $"قيد الدفعة الأولى للمورد {supplier.Name} - فاتورة شراء: {purchaseNumber}",
                        IsPosted = true,
                        BranchId = branchId,
                        ReferenceType = "Payment",
                        ReferenceId = initialPayment.Id,
                        CreatedBy = _currentUserService.UserId
                    };
                    payJournal.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = payJournal.Id,
                        AccountId = supplier.AccountId,
                        Debit = paidAmount,
                        Credit = 0,
                        Description = $"تخفيض ذمة المورد {supplier.Name} بالدفعة الأولى",
                        VehicleId = vehicle.Id
                    });
                    payJournal.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = payJournal.Id,
                        AccountId = cashOrBankAccountId.Value,
                        Debit = 0,
                        Credit = paidAmount,
                        Description = $"خروج النقدية لصالح المورد {supplier.Name}",
                        VehicleId = vehicle.Id
                    });

                    if (!payJournal.IsBalanced)
                        throw new InvalidOperationException("قيد الدفعة الأولى غير متوازن.");

                    _context.JournalEntries.Add(payJournal);
                    initialPayment.JournalEntryId = payJournal.Id;
                    await _context.SaveChangesAsync(cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);
                return purchase.Id;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }
}
