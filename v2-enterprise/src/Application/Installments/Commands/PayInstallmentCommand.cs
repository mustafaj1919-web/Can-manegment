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

            // 2. جلب عقد البيع والعميل
            var contract = await _context.SalesContracts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(sc => sc.Id == plan.SalesContractId && sc.BranchId == branchId, cancellationToken);

            if (contract == null)
            {
                throw new InvalidOperationException("عقد البيع المرتبط بالأقساط غير موجود.");
            }

            var customer = await _context.Customers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == contract.CustomerId && c.BranchId == branchId, cancellationToken);

            if (customer == null)
            {
                throw new InvalidOperationException("العميل المرتبط بعقد البيع غير موجود.");
            }

            // 3. جلب حسابات القيد
            var debitAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == request.DebitAccountCode && a.BranchId == branchId, cancellationToken);

            if (debitAccount == null)
            {
                throw new InvalidOperationException($"حساب الاستلام المحدد ({request.DebitAccountCode}) غير موجود في هذا الفرع.");
            }

            // حسابات أرباح التقسيط للاعتراف التدريجي
            var deferredProfitAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "2301" && a.BranchId == branchId, cancellationToken);

            var recognizedProfitAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "4102" && a.BranchId == branchId, cancellationToken);

            var dbContext = _context as DbContext;
            if (dbContext == null)
            {
                throw new InvalidOperationException("DbContext context is invalid.");
            }

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // 4. تحديث القسط والمبالغ
                var amount = AccountingAmount.RoundMoney(request.Amount);
                var remainingInstallmentAmount = AccountingAmount.RoundMoney(installment.Amount - installment.PaidAmount);
                if (amount > remainingInstallmentAmount)
                {
                    throw new InvalidOperationException($"المبلغ المدخل ({amount}) أكبر من قيمة القسط المتبقية ({remainingInstallmentAmount}).");
                }

                installment.PaidAmount = AccountingAmount.RoundMoney(installment.PaidAmount + amount);
                if (installment.PaidAmount >= installment.Amount)
                {
                    installment.Status = "Paid";
                    installment.PaymentDate = DateTime.UtcNow;
                }
                else
                {
                    installment.Status = "PartiallyPaid";
                }

                _context.Installments.Update(installment);
                await _context.SaveChangesAsync(cancellationToken);

                // 5. تحديث عقد البيع وخطة التقسيط
                contract.RemainingBalance = AccountingAmount.RoundMoney(contract.RemainingBalance - amount);
                if (contract.RemainingBalance < 0) contract.RemainingBalance = 0;
                _context.SalesContracts.Update(contract);

                // التحقق مما إذا سُددت كافة الأقساط بالخطة
                var allPaid = await _context.Installments
                    .IgnoreQueryFilters()
                    .Where(i => i.InstallmentPlanId == plan.Id && i.BranchId == branchId)
                    .AllAsync(i => i.Status == "Paid", cancellationToken);

                if (allPaid)
                {
                    plan.Status = "Completed";
                    _context.InstallmentPlans.Update(plan);
                }

                await _context.SaveChangesAsync(cancellationToken);

                // 6. احتساب قيمة أرباح التقسيط المحققة من هذا السداد نسبياً
                decimal recognizedProfit = 0;
                if (plan.TotalPlanAmount > 0 && plan.TotalProfit > 0)
                {
                    recognizedProfit = AccountingAmount.RoundMoney(amount * (plan.TotalProfit / plan.TotalPlanAmount));
                }

                if (recognizedProfit > 0 && (deferredProfitAccount == null || recognizedProfitAccount == null))
                {
                    throw new InvalidOperationException("حسابات الاعتراف بأرباح التقسيط (2301) و (4102) غير متوفرة بالفرع.");
                }

                // 7. إنشاء سجل سند القبض (Payment Receipt)
                var totalPaymentsCount = await _context.Payments.IgnoreQueryFilters().CountAsync(cancellationToken);
                var referenceNumber = $"REC-{DateTime.UtcNow:yyyyMMdd}-{totalPaymentsCount + 1:D5}";

                var payment = new Payment
                {
                    Id = Guid.NewGuid(),
                    Type = PaymentType.Receipt,
                    Method = request.PaymentMethod,
                    Amount = amount,
                    ReferenceNumber = referenceNumber,
                    Description = $"سداد القسط رقم {installment.InstallmentNumber} لعقد البيع {contract.ContractNumber} للعميل {customer.Name}",
                    AccountId = debitAccount.Id,
                    ContraAccountId = customer.AccountId,
                    BranchId = branchId
                };

                _context.Payments.Add(payment);
                await _context.SaveChangesAsync(cancellationToken);

                // 8. إنشاء القيد المحاسبي المتوازن لعملية السداد مع الاعتراف بأرباح التقسيط
                var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                var entryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

                var journalEntry = new JournalEntry
                {
                    Id = Guid.NewGuid(),
                    EntryNumber = entryNumber,
                    EntryDate = DateTime.UtcNow,
                    Description = $"قيد تحصيل القسط رقم {installment.InstallmentNumber} لعقد {contract.ContractNumber} - سند: {referenceNumber}",
                    IsPosted = true,
                    BranchId = branchId,
                    ReferenceType = "Payment",
                    ReferenceId = payment.Id,
                    CreatedBy = _currentUserService.UserId
                };

                // أ. السطر الأساسي للتحصيل:
                // مدين: الصندوق أو البنك المستلم
                journalEntry.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = debitAccount.Id,
                    Debit = amount,
                    Credit = 0,
                    Description = $"استلام مبالغ سداد قسط من العميل {customer.Name}"
                });

                // دائن: حساب العميل الفرعي
                journalEntry.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = customer.AccountId,
                    Debit = 0,
                    Credit = amount,
                    Description = $"تخفيض مديونية العميل {customer.Name} بسداد قسط مالي"
                });

                // ب. سطر الاعتراف التدريجي بالأرباح (إن وجد):
                if (recognizedProfit > 0)
                {
                    // مدين: حساب أرباح الأقساط المؤجلة (2301) لتخفيض الالتزام
                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = journalEntry.Id,
                        AccountId = deferredProfitAccount!.Id,
                        Debit = recognizedProfit,
                        Credit = 0,
                        Description = $"تخفيض أرباح التقسيط المؤجلة لسداد العميل {customer.Name}"
                    });

                    // دائن: حساب إيرادات الأقساط المحققة (4102) كإيراد فعلي
                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = journalEntry.Id,
                        AccountId = recognizedProfitAccount!.Id,
                        Debit = 0,
                        Credit = recognizedProfit,
                        Description = $"الاعتراف بأرباح التقسيط المحققة بنسبة السداد للعميل {customer.Name}"
                    });
                }

                if (!journalEntry.IsBalanced)
                {
                    throw new InvalidOperationException("القيد المحاسبي لعملية التحصيل والاعتراف بالأرباح غير متوازن.");
                }

                _context.JournalEntries.Add(journalEntry);
                await _context.SaveChangesAsync(cancellationToken);

                // ربط القيد بسند القبض
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
