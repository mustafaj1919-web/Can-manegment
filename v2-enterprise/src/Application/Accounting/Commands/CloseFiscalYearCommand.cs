using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Common.Helpers;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Application.Accounting.Commands
{
    public class CloseFiscalYearCommand : IRequest<Guid>
    {
        public Guid FiscalYearId { get; set; }
    }

    public class CloseFiscalYearCommandHandler : IRequestHandler<CloseFiscalYearCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CloseFiscalYearCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(CloseFiscalYearCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;
            var fiscalYear = await _context.FiscalYears
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(f => f.Id == request.FiscalYearId && f.BranchId == branchId, cancellationToken)
                ?? throw new InvalidOperationException("السنة المالية غير موجودة.");

            if (fiscalYear.Status == "Closed")
                throw new InvalidOperationException("السنة المالية مغلقة مسبقاً.");

            // جلب حسابات الإيرادات والمصروفات
            var incomeExpenseAccounts = await _context.Accounts
                .IgnoreQueryFilters()
                .Where(a => a.IsActive && a.BranchId == branchId
                    && (a.Type == AccountType.Revenue || a.Type == AccountType.Expense))
                .ToListAsync(cancellationToken);

            // جلب سطور اليومية للسنة المالية
            var journalLines = await _context.JournalLines
                .Include(l => l.JournalEntry)
                .Where(l => l.JournalEntry != null
                    && l.JournalEntry.IsPosted
                    && l.JournalEntry.BranchId == branchId
                    && l.JournalEntry.EntryDate >= fiscalYear.StartDate
                    && l.JournalEntry.EntryDate <= fiscalYear.EndDate)
                .ToListAsync(cancellationToken);

            // حساب الأرباح المحتجزة — يجب أن يكون الحساب 31001 أو ما شابه
            var retainedEarnings = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.BranchId == branchId
                    && a.Type == AccountType.Equity
                    && (a.AccountCode.Contains("3300") || a.AccountCode.Contains("31001") || a.Name.Contains("أرباح محتجزة")),
                    cancellationToken);

            if (retainedEarnings == null)
                throw new InvalidOperationException("لم يتم العثور على حساب الأرباح المحتجزة (Equity). أنشئ الحساب في دليل الحسابات.");

            // حساب صافي الربح
            decimal netProfit = 0;
            var closingEntry = new JournalEntry
            {
                Id = Guid.NewGuid(),
                EntryDate = fiscalYear.EndDate,
                EntryNumber = $"CLO-{fiscalYear.Year}-{DateTime.UtcNow:HHmmss}",
                Description = $"قيد إقفال السنة المالية {fiscalYear.Year}",
                IsPosted = true,
                BranchId = branchId,
                ReferenceType = "FiscalYearClose",
                ReferenceId = fiscalYear.Id,
                CreatedBy = _currentUserService.UserId
            };

            foreach (var account in incomeExpenseAccounts)
            {
                var acctLines = journalLines.Where(l => l.AccountId == account.Id).ToList();
                var debitTotal = AccountingAmount.RoundMoney(acctLines.Sum(l => l.Debit));
                var creditTotal = AccountingAmount.RoundMoney(acctLines.Sum(l => l.Credit));

                if (account.Type == AccountType.Revenue)
                {
                    // إيراد: دائن بطبيعته. إقفاله بمدين
                    var balance = AccountingAmount.RoundMoney(creditTotal - debitTotal);
                    if (balance != 0)
                    {
                        closingEntry.Lines.Add(new JournalLine
                        {
                            Id = Guid.NewGuid(),
                            JournalEntryId = closingEntry.Id,
                            AccountId = account.Id,
                            Debit = balance,
                            Credit = 0,
                            Description = $"إقفال حساب إيراد: {account.Name}"
                        });
                        netProfit += balance;
                    }
                }
                else if (account.Type == AccountType.Expense)
                {
                    // مصروف: مدين بطبيعته. إقفاله بدائن
                    var balance = AccountingAmount.RoundMoney(debitTotal - creditTotal);
                    if (balance != 0)
                    {
                        closingEntry.Lines.Add(new JournalLine
                        {
                            Id = Guid.NewGuid(),
                            JournalEntryId = closingEntry.Id,
                            AccountId = account.Id,
                            Debit = 0,
                            Credit = balance,
                            Description = $"إقفال حساب مصروف: {account.Name}"
                        });
                        netProfit -= balance;
                    }
                }
            }

            // إضافة سطر الأرباح المحتجزة (أو الخسائر)
            if (netProfit > 0)
            {
                closingEntry.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = closingEntry.Id,
                    AccountId = retainedEarnings.Id,
                    Debit = 0,
                    Credit = netProfit,
                    Description = $"ترحيل صافي ربح {fiscalYear.Year} إلى الأرباح المحتجزة"
                });
            }
            else if (netProfit < 0)
            {
                closingEntry.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = closingEntry.Id,
                    AccountId = retainedEarnings.Id,
                    Debit = Math.Abs(netProfit),
                    Credit = 0,
                    Description = $"ترحيل صافي خسارة {fiscalYear.Year} إلى الأرباح المحتجزة"
                });
            }

            if (closingEntry.Lines.Count > 0)
            {
                if (!closingEntry.IsBalanced)
                    throw new InvalidOperationException("قيد الإقفال غير متوازن — تحقق من حسابات الإيرادات والمصروفات.");
                _context.JournalEntries.Add(closingEntry);
            }

            fiscalYear.Status = "Closed";
            fiscalYear.ClosingJournalEntryId = closingEntry.Lines.Count > 0 ? closingEntry.Id : (Guid?)null;
            fiscalYear.LastModifiedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            return fiscalYear.ClosingJournalEntryId ?? Guid.Empty;
        }
    }
}
