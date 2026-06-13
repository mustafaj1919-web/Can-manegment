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
    public class BalanceSheetResultDto
    {
        public List<BalanceSheetItemDto> Assets { get; set; } = new List<BalanceSheetItemDto>();
        public List<BalanceSheetItemDto> Liabilities { get; set; } = new List<BalanceSheetItemDto>();
        public List<BalanceSheetItemDto> Equity { get; set; } = new List<BalanceSheetItemDto>();

        public decimal TotalAssets => AccountingAmount.RoundMoney(Assets.Sum(a => a.Amount));
        public decimal TotalLiabilities => AccountingAmount.RoundMoney(Liabilities.Sum(l => l.Amount));
        public decimal TotalEquityAccounts => AccountingAmount.RoundMoney(Equity.Sum(e => e.Amount));
        public decimal NetProfitOrLoss { get; set; }
        public decimal TotalLiabilitiesAndEquity => AccountingAmount.RoundMoney(TotalLiabilities + TotalEquityAccounts + NetProfitOrLoss);
    }

    public class BalanceSheetItemDto
    {
        public string AccountCode { get; set; } = string.Empty;
        public string AccountName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
    }

    public class GetBalanceSheetQuery : IRequest<BalanceSheetResultDto>
    {
        public DateTime? ToDate { get; set; }
    }

    public class GetBalanceSheetQueryHandler : IRequestHandler<GetBalanceSheetQuery, BalanceSheetResultDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetBalanceSheetQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<BalanceSheetResultDto> Handle(GetBalanceSheetQuery request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // جلب الحسابات النشطة للفرع
            var accounts = await _context.Accounts
                .Where(a => a.IsActive && a.BranchId == branchId)
                .ToListAsync(cancellationToken);

            // جلب حركة السطور لقيود اليومية المرحلة للفرع
            var query = _context.JournalLines
                .Include(l => l.JournalEntry)
                .Where(l => l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.BranchId == branchId);

            if (request.ToDate.HasValue)
            {
                query = query.Where(l => l.JournalEntry!.EntryDate <= request.ToDate.Value);
            }

            var journalLines = await query.ToListAsync(cancellationToken);

            var assetsList = new List<BalanceSheetItemDto>();
            var liabilitiesList = new List<BalanceSheetItemDto>();
            var equityList = new List<BalanceSheetItemDto>();

            decimal totalRevenues = 0;
            decimal totalExpenses = 0;

            foreach (var account in accounts)
            {
                var lines = journalLines.Where(l => l.AccountId == account.Id).ToList();
                var totalDebit = AccountingAmount.RoundMoney(lines.Sum(l => l.Debit));
                var totalCredit = AccountingAmount.RoundMoney(lines.Sum(l => l.Credit));

                switch (account.Type)
                {
                    case AccountType.Asset:
                        var assetBalance = AccountingAmount.RoundMoney(totalDebit - totalCredit);
                        if (assetBalance != 0)
                        {
                            assetsList.Add(new BalanceSheetItemDto
                            {
                                AccountCode = account.AccountCode,
                                AccountName = account.Name,
                                Amount = assetBalance
                            });
                        }
                        break;

                    case AccountType.Liability:
                        var liabilityBalance = AccountingAmount.RoundMoney(totalCredit - totalDebit);
                        if (liabilityBalance != 0)
                        {
                            liabilitiesList.Add(new BalanceSheetItemDto
                            {
                                AccountCode = account.AccountCode,
                                AccountName = account.Name,
                                Amount = liabilityBalance
                            });
                        }
                        break;

                    case AccountType.Equity:
                        var equityBalance = AccountingAmount.RoundMoney(totalCredit - totalDebit);
                        if (equityBalance != 0)
                        {
                            equityList.Add(new BalanceSheetItemDto
                            {
                                AccountCode = account.AccountCode,
                                AccountName = account.Name,
                                Amount = equityBalance
                            });
                        }
                        break;

                    case AccountType.Revenue:
                        totalRevenues += AccountingAmount.RoundMoney(totalCredit - totalDebit);
                        break;

                    case AccountType.Expense:
                        totalExpenses += AccountingAmount.RoundMoney(totalDebit - totalCredit);
                        break;
                }
            }

            var netProfitOrLoss = AccountingAmount.RoundMoney(totalRevenues - totalExpenses);

            return new BalanceSheetResultDto
            {
                Assets = assetsList.OrderBy(a => a.AccountCode).ToList(),
                Liabilities = liabilitiesList.OrderBy(l => l.AccountCode).ToList(),
                Equity = equityList.OrderBy(e => e.AccountCode).ToList(),
                NetProfitOrLoss = netProfitOrLoss
            };
        }
    }
}
