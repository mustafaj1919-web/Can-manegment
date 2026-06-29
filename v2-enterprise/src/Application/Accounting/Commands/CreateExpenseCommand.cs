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

namespace CarShowroomManagementV2.Application.Accounting.Commands
{
    public class CreateExpenseCommand : IRequest<Guid>
    {
        public string Title { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "IQD";
        public string? Category { get; set; }
        public string? Notes { get; set; }
        public DateTime? ExpenseDate { get; set; }
        public string PaidFromAccountCode { get; set; } = "111001"; // صندوق النقدية
        public string ExpenseAccountCode { get; set; } = "5102";    // مصاريف تشغيل المعرض
        public decimal ExchangeRate { get; set; } = 1.0m;
    }

    public class CreateExpenseCommandValidator : AbstractValidator<CreateExpenseCommand>
    {
        public CreateExpenseCommandValidator()
        {
            RuleFor(x => x.Title).NotEmpty().WithMessage("وصف المصروف مطلوب.");
            RuleFor(x => x.Amount).GreaterThan(0).WithMessage("قيمة المصروف يجب أن تكون أكبر من صفر.");
        }
    }

    public class CreateExpenseCommandHandler : IRequestHandler<CreateExpenseCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CreateExpenseCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(CreateExpenseCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // الحسابات المحاسبية: مدين = حساب المصروف، دائن = الصندوق/البنك
            var expenseAccount = await _context.Accounts.IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == request.ExpenseAccountCode && a.IsActive, cancellationToken)
                ?? await _context.Accounts.IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Type == AccountType.Expense && a.IsActive, cancellationToken);
            var paidFromAccount = await _context.Accounts.IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == request.PaidFromAccountCode && a.IsActive, cancellationToken);

            if (expenseAccount == null)
                throw new InvalidOperationException("حساب المصروفات غير موجود في شجرة الحسابات.");
            if (paidFromAccount == null)
                throw new InvalidOperationException($"حساب الدفع ({request.PaidFromAccountCode}) غير موجود في شجرة الحسابات.");

            var dbContext = _context as DbContext
                ?? throw new InvalidOperationException("DbContext context is invalid.");
            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var isUsd = (request.Currency ?? "").Equals("USD", StringComparison.OrdinalIgnoreCase);
                var rate = isUsd && request.ExchangeRate > 0 ? request.ExchangeRate : 1.0m;
                var finalAmount = request.Amount * rate;
                var finalTitle = isUsd
                    ? $"[${request.Amount:N2} @ {rate:N0}] {request.Title}"
                    : request.Title;

                var expense = new Expense
                {
                    Id = Guid.NewGuid(),
                    Title = finalTitle,
                    Amount = finalAmount,
                    Currency = "IQD",
                    Category = request.Category,
                    Notes = request.Notes,
                    ExpenseDate = (request.ExpenseDate ?? DateTime.UtcNow).ToUniversalTime(),
                    BranchId = branchId,
                    CreatedBy = _currentUserService.UserId,
                    CreatedAt = DateTime.UtcNow,
                };
                _context.Expenses.Add(expense);
                await _context.SaveChangesAsync(cancellationToken);

                // قيد محاسبي متوازن: من ح/ المصروف  إلى ح/ الصندوق
                var count = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                var entry = new JournalEntry
                {
                    Id = Guid.NewGuid(),
                    EntryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{count + 1:D5}",
                    EntryDate = DateTime.UtcNow,
                    Description = $"قيد إثبات مصروف: {finalTitle}",
                    IsPosted = true,
                    BranchId = branchId,
                    ReferenceType = "Expense",
                    ReferenceId = expense.Id,
                    CreatedBy = _currentUserService.UserId,
                };
                entry.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(), JournalEntryId = entry.Id, AccountId = expenseAccount.Id,
                    Debit = finalAmount, Credit = 0, Description = $"مصروف: {finalTitle}"
                });
                entry.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(), JournalEntryId = entry.Id, AccountId = paidFromAccount.Id,
                    Debit = 0, Credit = finalAmount, Description = $"دفع مصروف: {finalTitle}"
                });
                _context.JournalEntries.Add(entry);
                await _context.SaveChangesAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);
                return expense.Id;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }
}
