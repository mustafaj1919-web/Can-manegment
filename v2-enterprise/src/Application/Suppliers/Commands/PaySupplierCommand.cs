using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Application.Suppliers.Commands
{
    public class PaySupplierCommand : IRequest<Guid>
    {
        public Guid SupplierId { get; set; }
        public decimal Amount { get; set; }
        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
        public string CreditAccountCode { get; set; } = "111001"; // الافتراضي الصندوق 111001
    }

    public class PaySupplierCommandValidator : AbstractValidator<PaySupplierCommand>
    {
        public PaySupplierCommandValidator()
        {
            RuleFor(x => x.SupplierId).NotEmpty().WithMessage("المورد مطلوب.");
            RuleFor(x => x.Amount).GreaterThan(0).WithMessage("قيمة الصرف يجب أن تكون أكبر من صفر.");
            RuleFor(x => x.CreditAccountCode).NotEmpty().WithMessage("حساب الصرف مطلوب.");
        }
    }

    public class PaySupplierCommandHandler : IRequestHandler<PaySupplierCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public PaySupplierCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(PaySupplierCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // 1. جلب المورد والتحقق منه
            var supplier = await _context.Suppliers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Id == request.SupplierId && s.BranchId == branchId, cancellationToken);

            if (supplier == null)
            {
                throw new InvalidOperationException("المورد المحدد غير موجود أو لا ينتمي لهذا الفرع.");
            }

            // 2. جلب حساب الصرف
            var creditAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == request.CreditAccountCode && a.BranchId == branchId, cancellationToken);

            if (creditAccount == null)
            {
                throw new InvalidOperationException($"حساب الصرف المحدد ({request.CreditAccountCode}) غير موجود في هذا الفرع.");
            }

            // التحقق من كفاية رصيد حساب الدفع قبل الصرف
            var accountBalance = await _context.JournalLines
                .Where(l => l.AccountId == creditAccount.Id)
                .SumAsync(l => l.Debit - l.Credit, cancellationToken);
            if (accountBalance < request.Amount)
                throw new InvalidOperationException($"رصيد الحساب ({creditAccount.AccountCode} - {creditAccount.Name}) غير كافٍ. المتاح: {accountBalance:N0}، المطلوب: {request.Amount:N0}.");

            var dbContext = _context as DbContext;
            if (dbContext == null)
            {
                throw new InvalidOperationException("DbContext context is invalid.");
            }

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // 3. إنشاء سجل سند الصرف (Payment Voucher)
                var totalPaymentsCount = await _context.Payments.IgnoreQueryFilters().CountAsync(cancellationToken);
                var referenceNumber = $"PAY-{DateTime.UtcNow:yyyyMMdd}-{totalPaymentsCount + 1:D5}";

                var payment = new Payment
                {
                    Id = Guid.NewGuid(),
                    Type = PaymentType.Payment, // سند صرف
                    Method = request.PaymentMethod,
                    Amount = request.Amount,
                    ReferenceNumber = referenceNumber,
                    Description = $"صرف دفعة مالية لصالح المورد {supplier.Name}",
                    AccountId = creditAccount.Id, // حساب الصندوق أو البنك الصارف
                    ContraAccountId = supplier.AccountId, // حساب المورد المساعد المقابل
                    BranchId = branchId
                };

                _context.Payments.Add(payment);
                await _context.SaveChangesAsync(cancellationToken);

                // 4. إنشاء القيد المحاسبي المتوازن لعملية الصرف
                var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                var entryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

                var journalEntry = new JournalEntry
                {
                    Id = Guid.NewGuid(),
                    EntryNumber = entryNumber,
                    EntryDate = DateTime.UtcNow,
                    Description = $"قيد إثبات صرف مالي للمورد {supplier.Name} - سند صرف: {referenceNumber}",
                    IsPosted = true,
                    BranchId = branchId,
                    ReferenceType = "Payment",
                    ReferenceId = payment.Id,
                    CreatedBy = _currentUserService.UserId
                };

                // الطرف المدين: حساب المورد الفرعي (تخفيض الالتزام المستحق عليه)
                var debitLine = new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = supplier.AccountId,
                    Debit = request.Amount,
                    Credit = 0,
                    Description = $"تخفيض مديونية المورد {supplier.Name} بالصرف المالي"
                };

                // الطرف الدائن: الصندوق أو البنك الصارف للمبالغ
                var creditLine = new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = creditAccount.Id,
                    Debit = 0,
                    Credit = request.Amount,
                    Description = $"خروج النقدية من الحساب لصالح المورد {supplier.Name}"
                };

                journalEntry.Lines.Add(debitLine);
                journalEntry.Lines.Add(creditLine);

                if (!journalEntry.IsBalanced)
                {
                    throw new InvalidOperationException("القيد المحاسبي لعملية الصرف غير متوازن.");
                }

                _context.JournalEntries.Add(journalEntry);
                await _context.SaveChangesAsync(cancellationToken);

                // ربط القيد بسند الصرف
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
