using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Common.Helpers;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Application.Accounting.Queries
{
    public class GetProfitAndLossQuery : IRequest<ProfitAndLossResultDto>
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class ProfitAndLossResultDto
    {
        public List<ProfitAndLossItemDto> Revenues { get; set; } = new List<ProfitAndLossItemDto>();
        public List<ProfitAndLossItemDto> Expenses { get; set; } = new List<ProfitAndLossItemDto>();
        
        public decimal TotalRevenues => AccountingAmount.RoundMoney(Revenues.Sum(r => r.Amount));
        public decimal TotalExpenses => AccountingAmount.RoundMoney(Expenses.Sum(e => e.Amount));
        public decimal NetProfitOrLoss => AccountingAmount.RoundMoney(TotalRevenues - TotalExpenses); // صافي الربح أو الخسارة
    }

    public class ProfitAndLossItemDto
    {
        public string AccountCode { get; set; } = string.Empty;
        public string AccountName { get; set; } = string.Empty;
        public decimal Amount { get; set; } // القيمة الصافية للحساب
    }

    public class GetProfitAndLossQueryHandler : IRequestHandler<GetProfitAndLossQuery, ProfitAndLossResultDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetProfitAndLossQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<ProfitAndLossResultDto> Handle(GetProfitAndLossQuery request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // جلب حسابات الإيرادات والمصروفات النشطة للفرع الحالي
            var accounts = await _context.Accounts
                .Where(a => a.IsActive && a.BranchId == branchId && (a.Type == AccountType.Revenue || a.Type == AccountType.Expense))
                .ToListAsync(cancellationToken);

            // جلب حركة السطور لقيود اليومية المرحلة للفرع ونطاق التواريخ
            var query = _context.JournalLines
                .Include(l => l.JournalEntry)
                .Where(l => l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.BranchId == branchId);

            if (request.FromDate.HasValue)
            {
                query = query.Where(l => l.JournalEntry!.EntryDate >= request.FromDate.Value);
            }

            if (request.ToDate.HasValue)
            {
                query = query.Where(l => l.JournalEntry!.EntryDate <= request.ToDate.Value);
            }

            var journalLines = await query.ToListAsync(cancellationToken);

            var revenuesList = new List<ProfitAndLossItemDto>();
            var expensesList = new List<ProfitAndLossItemDto>();

            foreach (var account in accounts)
            {
                var lines = journalLines.Where(l => l.AccountId == account.Id).ToList();
                var totalDebit = AccountingAmount.RoundMoney(lines.Sum(l => l.Debit));
                var totalCredit = AccountingAmount.RoundMoney(lines.Sum(l => l.Credit));

                if (account.Type == AccountType.Revenue)
                {
                    // الإيراد دائن بطبيعته، لذا الرصيد = الدائن - المدين
                    var balance = AccountingAmount.RoundMoney(totalCredit - totalDebit);
                    if (balance != 0)
                    {
                        revenuesList.Add(new ProfitAndLossItemDto
                        {
                            AccountCode = account.AccountCode,
                            AccountName = account.Name,
                            Amount = balance
                        });
                    }
                }
                else if (account.Type == AccountType.Expense)
                {
                    // المصروف مدين بطبيعته، لذا الرصيد = المدين - الدائن
                    var balance = AccountingAmount.RoundMoney(totalDebit - totalCredit);
                    if (balance != 0)
                    {
                        expensesList.Add(new ProfitAndLossItemDto
                        {
                            AccountCode = account.AccountCode,
                            AccountName = account.Name,
                            Amount = balance
                        });
                    }
                }
            }

            return new ProfitAndLossResultDto
            {
                Revenues = revenuesList.OrderBy(r => r.AccountCode).ToList(),
                Expenses = expensesList.OrderBy(e => e.AccountCode).ToList()
            };
        }
    }
}
