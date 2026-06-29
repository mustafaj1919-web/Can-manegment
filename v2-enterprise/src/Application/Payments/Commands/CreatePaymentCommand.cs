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
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Application.Payments.Commands
{
    public class CreatePaymentCommand : IRequest<Guid>
    {
        public PaymentType Type { get; set; } // Receipt (قبض) or Payment (صرف)
        public PaymentMethod Method { get; set; } // Cash, Bank, Cheque
        public decimal Amount { get; set; }
        public string ReferenceNumber { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        
        public Guid AccountId { get; set; } // الصندوق أو البنك
        public Guid ContraAccountId { get; set; } // العميل أو المورد
        public decimal ExchangeRate { get; set; } = 1.0m;
        public string Currency { get; set; } = "IQD";
    }

    public class CreatePaymentCommandValidator : AbstractValidator<CreatePaymentCommand>
    {
        public CreatePaymentCommandValidator()
        {
            RuleFor(x => x.Amount).GreaterThan(0).WithMessage("قيمة السند يجب أن تكون أكبر من صفر.");
            RuleFor(x => x.ReferenceNumber).NotEmpty().WithMessage("رقم المرجع (السند) مطلوب.");
            RuleFor(x => x.AccountId).NotEmpty().WithMessage("حساب الصندوق/البنك مطلوب.");
            RuleFor(x => x.ContraAccountId).NotEmpty().WithMessage("الحساب المقابل مطلوب.");
        }
    }

    public class CreatePaymentCommandHandler : IRequestHandler<CreatePaymentCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CreatePaymentCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(CreatePaymentCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // 1. التحقق من وجود وفاعلية الحسابات المحاسبية قبل أي إجراء
            var account = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Id == request.AccountId && a.IsActive, cancellationToken);

            var contraAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Id == request.ContraAccountId && a.IsActive, cancellationToken);

            if (account == null)
            {
                throw new InvalidOperationException("حساب الصندوق أو البنك المتأثر غير موجود أو غير نشط.");
            }

            if (contraAccount == null)
            {
                throw new InvalidOperationException("الحساب المقابل (العميل أو المورد) غير موجود أو غير نشط.");
            }

            var dbContext = _context as DbContext;
            if (dbContext == null)
            {
                throw new InvalidOperationException("DbContext context is invalid.");
            }

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                var isUsd = (request.Currency ?? "").Equals("USD", System.StringComparison.OrdinalIgnoreCase);
                var rate = isUsd && request.ExchangeRate > 0 ? request.ExchangeRate : 1.0m;
                var finalAmount = request.Amount * rate;
                var finalDescription = isUsd
                    ? $"[${request.Amount:N2} @ {rate:N0}] {request.Description}"
                    : request.Description;

                // 2. تسجيل سند القبض أو الصرف المالي
                var payment = new Payment
                {
                    Id = Guid.NewGuid(),
                    Type = request.Type,
                    Method = request.Method,
                    Amount = finalAmount,
                    ReferenceNumber = request.ReferenceNumber,
                    Description = finalDescription,
                    AccountId = request.AccountId,
                    ContraAccountId = request.ContraAccountId,
                    BranchId = branchId
                };

                _context.Payments.Add(payment);
                await _context.SaveChangesAsync(cancellationToken);

                // 3. إنشاء القيد المحاسبي المولد متوازن بالكامل
                var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                var entryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

                var journalEntry = new JournalEntry
                {
                    Id = Guid.NewGuid(),
                    EntryNumber = entryNumber,
                    EntryDate = DateTime.UtcNow,
                    Description = finalDescription,
                    IsPosted = true,
                    BranchId = branchId,
                    ReferenceType = "Payment",
                    ReferenceId = payment.Id,
                    CreatedBy = _currentUserService.UserId
                };

                // تحديد حساب المدين والدائن بناء على نوع السند
                Guid debitAccountId;
                Guid creditAccountId;
                string debitLineDesc;
                string creditLineDesc;

                if (request.Type == PaymentType.Receipt)
                {
                    // سند قبض: نقدية مدين (زيادة أصول)، عميل دائن (نقص أصول ذمم مدينة)
                    debitAccountId = request.AccountId;
                    creditAccountId = request.ContraAccountId;
                    debitLineDesc = $"مقبوضات نقدية/بنكية بموجب سند قبض رقم {request.ReferenceNumber}";
                    creditLineDesc = $"تسديد/دفعة لحساب {contraAccount.Name} بموجب سند قبض رقم {request.ReferenceNumber}";
                }
                else
                {
                    // سند صرف: مورد مدين (نقص التزامات)، نقدية دائن (نقص أصول)
                    debitAccountId = request.ContraAccountId;
                    creditAccountId = request.AccountId;
                    debitLineDesc = $"صرف مبالغ لحساب {contraAccount.Name} بموجب سند صرف رقم {request.ReferenceNumber}";
                    creditLineDesc = $"مدفوعات نقدية/بنكية بموجب سند صرف رقم {request.ReferenceNumber}";
                }

                var debitLine = new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = debitAccountId,
                    Debit = finalAmount,
                    Credit = 0,
                    Description = debitLineDesc
                };

                var creditLine = new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = creditAccountId,
                    Debit = 0,
                    Credit = finalAmount,
                    Description = creditLineDesc
                };

                journalEntry.Lines.Add(debitLine);
                journalEntry.Lines.Add(creditLine);

                _context.JournalEntries.Add(journalEntry);
                await _context.SaveChangesAsync(cancellationToken);

                // 4. ربط السند بالقيد المولد
                payment.JournalEntryId = journalEntry.Id;
                _context.Payments.Update(payment);
                await _context.SaveChangesAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);
                return payment.Id;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync(cancellationToken);
                throw; // تفشل بالكامل لضمان الذرية (Atomicity)
            }
        }
    }
}
