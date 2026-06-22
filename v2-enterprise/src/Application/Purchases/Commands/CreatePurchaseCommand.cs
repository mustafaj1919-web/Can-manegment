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
        public decimal PurchaseCost { get; set; }
        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash; // Cash, Bank, Cheque (treated as credit/accounts payable)

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
            var branchId = _currentUserService.BranchId;

            // 1. التحقق من وجود المورد
            var supplier = await _context.Suppliers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Id == request.SupplierId && s.BranchId == branchId, cancellationToken);

            if (supplier == null)
            {
                throw new InvalidOperationException("المورد المحدد غير موجود أو لا ينتمي لهذا الفرع.");
            }

            // 2. التحقق من وجود السيارة أو إنشائها
            var vehicle = await _context.Vehicles
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(v => v.ChassisNumber == request.ChassisNumber && v.BranchId == branchId, cancellationToken);

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

                if (vehicle == null)
                {
                    // إنشاء سيارة جديدة
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
                }
                else
                {
                    // تحديث السيارة الموجودة وإرجاعها للمخزون
                    vehicle.PurchaseCost = purchaseCost;
                    vehicle.BookValue = purchaseCost;
                    vehicle.Status = "Available";
                    vehicle.IsSold = false;
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
                    Description = "تكلفة الشراء عبر فاتورة شراء معتمدة",
                    CreatedAt = DateTime.UtcNow
                };
                _context.VehicleCosts.Add(detailedCost);
                await _context.SaveChangesAsync(cancellationToken);

                // 3. تحديد الحسابات المحاسبية للقيد
                // حساب المخزون: 1201
                var inventoryAccount = await _context.Accounts
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(a => a.AccountCode == "1201" && a.BranchId == branchId, cancellationToken);

                if (inventoryAccount == null)
                {
                    throw new InvalidOperationException("حساب مخزون السيارات (1201) غير موجود في هذا الفرع.");
                }

                // الحساب الدائن بحسب طريقة الدفع
                Guid creditAccountId;
                string creditAccountDesc = "";

                if (request.PaymentMethod == PaymentMethod.Cash)
                {
                    var cashAccount = await _context.Accounts
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(a => a.AccountCode == "111001" && a.BranchId == branchId, cancellationToken);
                    if (cashAccount == null) throw new InvalidOperationException("حساب صندوق النقدية (111001) غير موجود في هذا الفرع.");
                    creditAccountId = cashAccount.Id;
                    creditAccountDesc = "صندوق النقدية الرئيسي";
                }
                else if (request.PaymentMethod == PaymentMethod.Bank)
                {
                    var bankAccount = await _context.Accounts
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(a => a.AccountCode == "112001" && a.BranchId == branchId, cancellationToken);
                    if (bankAccount == null) throw new InvalidOperationException("حساب البنك (112001) غير موجود في هذا الفرع.");
                    creditAccountId = bankAccount.Id;
                    creditAccountDesc = "حساب البنك";
                }
                else // Cheque / Credit
                {
                    creditAccountId = supplier.AccountId;
                    creditAccountDesc = $"ذمم الدائنين - المورد: {supplier.Name}";
                }

                // 4. إنشاء سجل الشراء (Purchase Record)
                var totalPurchasesCount = await _context.Purchases.IgnoreQueryFilters().CountAsync(cancellationToken);
                var purchaseNumber = $"PUR-{DateTime.UtcNow:yyyyMMdd}-{totalPurchasesCount + 1:D5}";

                var purchase = new Purchase
                {
                    Id = Guid.NewGuid(),
                    PurchaseNumber = purchaseNumber,
                    SupplierId = supplier.Id,
                    VehicleId = vehicle.Id,
                    PurchaseCost = purchaseCost,
                    PaymentMethod = request.PaymentMethod,
                    Status = "Active",
                    BranchId = branchId
                };
                _context.Purchases.Add(purchase);
                await _context.SaveChangesAsync(cancellationToken);

                // 5. إنشاء القيد المحاسبي المتوازن لعملية الشراء
                var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                var entryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

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

                // الطرف المدين: زيادة المخزون
                var debitLine = new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = inventoryAccount.Id,
                    Debit = purchaseCost,
                    Credit = 0,
                    Description = $"زيادة قيمة المخزون بشراء سيارة {vehicle.Model} - شاصي: {vehicle.ChassisNumber}"
                };

                // الطرف الدائن: الصندوق أو البنك أو حساب المورد الفرعي
                var creditLine = new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = creditAccountId,
                    Debit = 0,
                    Credit = purchaseCost,
                    Description = $"إثبات دفع/استحقاق قيمة الشراء للسيارة {vehicle.Model} للمورد {supplier.Name} عبر ({creditAccountDesc})"
                };

                journalEntry.Lines.Add(debitLine);
                journalEntry.Lines.Add(creditLine);

                if (!journalEntry.IsBalanced)
                {
                    throw new InvalidOperationException("القيد المحاسبي لعملية الشراء غير متوازن.");
                }

                _context.JournalEntries.Add(journalEntry);
                await _context.SaveChangesAsync(cancellationToken);

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
