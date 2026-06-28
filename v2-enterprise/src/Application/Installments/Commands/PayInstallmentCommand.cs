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

namespace CarShowroomManagementV2.Application.Installments.Commands
{
    public class PayInstallmentCommand : IRequest<Guid>
    {
        public Guid InstallmentId { get; set; }
        public decimal Amount { get; set; }
        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
        public string DebitAccountCode { get; set; } = "111001"; // الافتراضي الصندوق 111001
    }

    public class PayInstallmentCommandValidator : AbstractValidator<PayInstallmentCommand>
    {
        public PayInstallmentCommandValidator()
        {
            RuleFor(x => x.InstallmentId).NotEmpty().WithMessage("القسط مطلوب.");
            RuleFor(x => x.Amount).GreaterThan(0).WithMessage("قيمة السداد يجب أن تكون أكبر من صفر.");
            RuleFor(x => x.DebitAccountCode).NotEmpty().WithMessage("حساب الاستلام مطلوب.");
        }
    }

    public class PayInstallmentCommandHandler : IRequestHandler<PayInstallmentCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public PayInstallmentCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(PayInstallmentCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // 1. جلب القسط والتحقق منه
            var installment = await _context.Installments
                .IgnoreQueryFilters()
                .Include(i => i.InstallmentPlan)
                .FirstOrDefaultAsync(i => i.Id == request.InstallmentId && i.BranchId == branchId, cancellationToken);

            if (installment == null)
            {
                throw new InvalidOperationException("القسط المحدد غير موجود أو لا ينتمي لهذا الفرع.");
            }

            if (installment.Status == "Paid")
            {
                throw new InvalidOperationException("هذا القسط مسدد بالكامل بالفعل.");
            }

            var plan = installment.InstallmentPlan;
            if (plan == null)
            {
                throw new InvalidOperationException("خطة التقسيط المرتبطة بالقسط غير موجودة.");
            }

            // 2. تحديد نوع الخطة: بيع أم شراء
            var isPurchasePlan = plan.PurchaseId.HasValue;

            // متغيرات مشتركة
            Domain.Entities.SalesContract? contract = null;
            Domain.Entities.Customer? customer = null;
            Domain.Entities.Purchase? purchase = null;
            Domain.Entities.Supplier? supplier = null;
            Guid   counterpartAccountId;
            string counterpartName;

            if (!isPurchasePlan)
            {
                // ── أقساط بيع: نتحصّل من العميل ──────────────────────────────
                contract = await _context.SalesContracts
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(sc => sc.Id == plan.SalesContractId && sc.BranchId == branchId, cancellationToken);

                if (contract == null)
                    throw new InvalidOperationException("عقد البيع المرتبط بالأقساط غير موجود.");

                customer = await _context.Customers
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(c => c.Id == contract.CustomerId && c.BranchId == branchId, cancellationToken);

                if (customer == null)
                    throw new InvalidOperationException("العميل المرتبط بعقد البيع غير موجود.");

                counterpartAccountId = customer.AccountId;
                counterpartName      = customer.FullName ?? customer.Name;
            }
            else
            {
                // ── أقساط شراء: نسدّد للمورد ─────────────────────────────────
                purchase = await _context.Purchases
                    .IgnoreQueryFilters()
                    .Include(p => p.Supplier)
                    .FirstOrDefaultAsync(p => p.Id == plan.PurchaseId && p.BranchId == branchId, cancellationToken);

                if (purchase == null)
                    throw new InvalidOperationException("فاتورة الشراء المرتبطة بالأقساط غير موجودة.");

                supplier = purchase.Supplier;
                if (supplier == null)
                    throw new InvalidOperationException("المورد المرتبط بفاتورة الشراء غير موجود.");

                // حساب المورد من دليل الحسابات
                var supplierAccount = await _context.Accounts
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(a => a.Id == supplier.AccountId && a.BranchId == branchId, cancellationToken);

                if (supplierAccount == null)
                    throw new InvalidOperationException("حساب المورد غير موجود في دليل الحسابات.");

                counterpartAccountId = supplier.AccountId;
                counterpartName      = supplier.Name;
            }

            // 3. جلب حساب الصندوق/البنك
            var cashBankAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == request.DebitAccountCode && a.BranchId == branchId, cancellationToken);

            if (cashBankAccount == null)
                throw new InvalidOperationException($"حساب الصندوق/البنك ({request.DebitAccountCode}) غير موجود في هذا الفرع.");

            // حسابات أرباح التقسيط (للبيع فقط)
            var deferredProfitAccount = !isPurchasePlan
                ? await _context.Accounts.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.AccountCode == "2301" && a.BranchId == branchId, cancellationToken)
                : null;

            var recognizedProfitAccount = !isPurchasePlan
                ? await _context.Accounts.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.AccountCode == "4102" && a.BranchId == branchId, cancellationToken)
                : null;

            var dbContext = _context as DbContext;
            if (dbContext == null)
                throw new InvalidOperationException("DbContext context is invalid.");

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // 4. تحديث القسط
                var amount = AccountingAmount.RoundMoney(request.Amount);
                var remainingInstallmentAmount = AccountingAmount.RoundMoney(installment.Amount - installment.PaidAmount);
                if (amount > remainingInstallmentAmount)
                    throw new InvalidOperationException($"المبلغ المدخل ({amount}) أكبر من قيمة القسط المتبقية ({remainingInstallmentAmount}).");

                installment.PaidAmount = AccountingAmount.RoundMoney(installment.PaidAmount + amount);
                installment.Status     = installment.PaidAmount >= installment.Amount ? "Paid" : "PartiallyPaid";
                if (installment.Status == "Paid") installment.PaymentDate = DateTime.UtcNow;
                _context.Installments.Update(installment);
                await _context.SaveChangesAsync(cancellationToken);

                // 5. تحديث الكيان المرتبط وخطة التقسيط
                if (contract != null)
                {
                    contract.RemainingBalance = AccountingAmount.RoundMoney(Math.Max(0, contract.RemainingBalance - amount));
                    _context.SalesContracts.Update(contract);
                }

                var allPaid = await _context.Installments
                    .IgnoreQueryFilters()
                    .Where(i => i.InstallmentPlanId == plan.Id && i.BranchId == branchId)
                    .AllAsync(i => i.Status == "Paid", cancellationToken);

                if (allPaid) { plan.Status = "Completed"; _context.InstallmentPlans.Update(plan); }
                await _context.SaveChangesAsync(cancellationToken);

                // 6. أرباح التقسيط (أقساط بيع فقط)
                decimal recognizedProfit = 0;
                if (!isPurchasePlan && plan.TotalPlanAmount > 0 && plan.TotalProfit > 0)
                {
                    recognizedProfit = AccountingAmount.RoundMoney(amount * (plan.TotalProfit / plan.TotalPlanAmount));
                    if (recognizedProfit > 0 && (deferredProfitAccount == null || recognizedProfitAccount == null))
                        throw new InvalidOperationException("حسابات الاعتراف بأرباح التقسيط (2301) و (4102) غير متوفرة بالفرع.");
                }

                // 7. سند مالي
                var totalPaymentsCount = await _context.Payments.IgnoreQueryFilters().CountAsync(cancellationToken);
                var referenceNumber    = $"REC-{DateTime.UtcNow:yyyyMMdd}-{totalPaymentsCount + 1:D5}";
                var invoiceRef         = contract?.ContractNumber ?? purchase?.PurchaseNumber ?? "";

                var payment = new Payment
                {
                    Id              = Guid.NewGuid(),
                    Type            = isPurchasePlan ? PaymentType.Payment : PaymentType.Receipt,
                    Method          = request.PaymentMethod,
                    Amount          = amount,
                    ReferenceNumber = referenceNumber,
                    Description     = isPurchasePlan
                        ? $"سداد القسط رقم {installment.InstallmentNumber} لفاتورة الشراء {invoiceRef} للمورد {counterpartName}"
                        : $"سداد القسط رقم {installment.InstallmentNumber} لعقد البيع {invoiceRef} للعميل {counterpartName}",
                    AccountId       = cashBankAccount.Id,
                    ContraAccountId = counterpartAccountId,
                    BranchId        = branchId
                };
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync(cancellationToken);

                // 8. القيد المحاسبي
                var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                var entryNumber       = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

                var journalEntry = new JournalEntry
                {
                    Id            = Guid.NewGuid(),
                    EntryNumber   = entryNumber,
                    EntryDate     = DateTime.UtcNow,
                    Description   = isPurchasePlan
                        ? $"قيد سداد قسط رقم {installment.InstallmentNumber} لفاتورة {invoiceRef} - سند: {referenceNumber}"
                        : $"قيد تحصيل القسط رقم {installment.InstallmentNumber} لعقد {invoiceRef} - سند: {referenceNumber}",
                    IsPosted      = true,
                    BranchId      = branchId,
                    ReferenceType = "Payment",
                    ReferenceId   = payment.Id,
                    CreatedBy     = _currentUserService.UserId
                };

                if (isPurchasePlan)
                {
                    // أقساط شراء: مدين حساب المورد (يُقلّل الدين) ← دائن الصندوق/البنك
                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(), JournalEntryId = journalEntry.Id,
                        AccountId = counterpartAccountId, Debit = amount, Credit = 0,
                        Description = $"تخفيض المستحق للمورد {counterpartName} بسداد قسط"
                    });
                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(), JournalEntryId = journalEntry.Id,
                        AccountId = cashBankAccount.Id, Debit = 0, Credit = amount,
                        Description = $"صرف دفعة قسط للمورد {counterpartName} من الصندوق/البنك"
                    });
                }
                else
                {
                    // أقساط بيع: مدين الصندوق/البنك ← دائن حساب العميل
                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(), JournalEntryId = journalEntry.Id,
                        AccountId = cashBankAccount.Id, Debit = amount, Credit = 0,
                        Description = $"استلام مبالغ سداد قسط من العميل {counterpartName}"
                    });
                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(), JournalEntryId = journalEntry.Id,
                        AccountId = counterpartAccountId, Debit = 0, Credit = amount,
                        Description = $"تخفيض مديونية العميل {counterpartName} بسداد قسط مالي"
                    });

                    if (recognizedProfit > 0)
                    {
                        journalEntry.Lines.Add(new JournalLine
                        {
                            Id = Guid.NewGuid(), JournalEntryId = journalEntry.Id,
                            AccountId = deferredProfitAccount!.Id, Debit = recognizedProfit, Credit = 0,
                            Description = $"تخفيض أرباح التقسيط المؤجلة لسداد العميل {counterpartName}"
                        });
                        journalEntry.Lines.Add(new JournalLine
                        {
                            Id = Guid.NewGuid(), JournalEntryId = journalEntry.Id,
                            AccountId = recognizedProfitAccount!.Id, Debit = 0, Credit = recognizedProfit,
                            Description = $"الاعتراف بأرباح التقسيط المحققة بنسبة السداد للعميل {counterpartName}"
                        });
                    }
                }

                if (!journalEntry.IsBalanced)
                    throw new InvalidOperationException("القيد المحاسبي غير متوازن.");

                _context.JournalEntries.Add(journalEntry);
                await _context.SaveChangesAsync(cancellationToken);

                payment.JournalEntryId = journalEntry.Id;
                _context.Payments.Update(payment);
                await _context.SaveChangesAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);
                return payment.Id;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }
}
