using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Common.Helpers;

namespace CarShowroomManagementV2.Application.Accounting.Queries
{
    public class GetTrialBalanceQuery : IRequest<TrialBalanceResponseDto>
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class TrialBalanceTotalsDto
    {
        public decimal OpeningDebit { get; set; }
        public decimal OpeningCredit { get; set; }
        public decimal PeriodDebit { get; set; }
        public decimal PeriodCredit { get; set; }
        public decimal ClosingDebit { get; set; }
        public decimal ClosingCredit { get; set; }
        public decimal Difference => AccountingAmount.RoundMoney(ClosingDebit - ClosingCredit);
        public bool IsBalanced => Math.Abs(Difference) < 0.01m;
    }

    public class TrialBalanceItemDto
    {
        public Guid AccountId { get; set; }
        public string AccountCode { get; set; } = string.Empty;
        public string AccountName { get; set; } = string.Empty;
        public string AccountType { get; set; } = string.Empty;

        public decimal OpeningDebit { get; set; }
        public decimal OpeningCredit { get; set; }
        public decimal PeriodDebit { get; set; }
        public decimal PeriodCredit { get; set; }
        public decimal ClosingDebit { get; set; }
        public decimal ClosingCredit { get; set; }

        // Backward compatibility getters
        public decimal TotalDebit => PeriodDebit;
        public decimal TotalCredit => PeriodCredit;
        public decimal NetDebit => ClosingDebit;
        public decimal NetCredit => ClosingCredit;
    }

    public class TrialBalanceResponseDto
    {
        public TrialBalanceTotalsDto Totals { get; set; } = new TrialBalanceTotalsDto();
        public List<TrialBalanceItemDto> Accounts { get; set; } = new List<TrialBalanceItemDto>();
    }

    public class GetTrialBalanceQueryHandler : IRequestHandler<GetTrialBalanceQuery, TrialBalanceResponseDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetTrialBalanceQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<TrialBalanceResponseDto> Handle(GetTrialBalanceQuery request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // جلب الحسابات النشطة للفرع الحالي
            var accounts = await _context.Accounts
                .Where(a => a.IsActive && a.BranchId == branchId)
                .ToListAsync(cancellationToken);

            // جلب سطور القيود المرحّلة فقط لحساب المجاميع وضمن الفرع
            var postedLinesQuery = _context.JournalLines
                .Include(l => l.JournalEntry)
                .Where(l => l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.BranchId == branchId);

            var postedLines = await postedLinesQuery.ToListAsync(cancellationToken);

            var items = new List<TrialBalanceItemDto>();

            foreach (var account in accounts)
            {
                var accountLines = postedLines.Where(l => l.AccountId == account.Id).ToList();

                // أ- الرصيد الافتتاحي (قبل FromDate)
                decimal openingDebit = 0, openingCredit = 0;
                if (request.FromDate.HasValue)
                {
                    var openingLines = accountLines.Where(l => l.JournalEntry!.EntryDate < request.FromDate.Value).ToList();
                    openingDebit = AccountingAmount.RoundMoney(openingLines.Sum(l => l.Debit));
                    openingCredit = AccountingAmount.RoundMoney(openingLines.Sum(l => l.Credit));
                }

                // ب- حركة الفترة (بين FromDate و ToDate)
                var periodLines = accountLines.AsEnumerable();
                if (request.FromDate.HasValue)
                {
                    periodLines = periodLines.Where(l => l.JournalEntry!.EntryDate >= request.FromDate.Value);
                }
                if (request.ToDate.HasValue)
                {
                    periodLines = periodLines.Where(l => l.JournalEntry!.EntryDate <= request.ToDate.Value);
                }

                var periodDebit = AccountingAmount.RoundMoney(periodLines.Sum(l => l.Debit));
                var periodCredit = AccountingAmount.RoundMoney(periodLines.Sum(l => l.Credit));

                // ج- الرصيد الختامي الصافي
                var netOpening = openingDebit - openingCredit;
                var netPeriod = periodDebit - periodCredit;
                var netClosing = netOpening + netPeriod;

                decimal closingDebit = netClosing > 0 ? AccountingAmount.RoundMoney(netClosing) : 0;
                decimal closingCredit = netClosing < 0 ? AccountingAmount.RoundMoney(Math.Abs(netClosing)) : 0;

                items.Add(new TrialBalanceItemDto
                {
                    AccountId = account.Id,
                    AccountCode = account.AccountCode,
                    AccountName = account.Name,
                    AccountType = account.Type.ToString(),
                    OpeningDebit = openingDebit,
                    OpeningCredit = openingCredit,
                    PeriodDebit = periodDebit,
                    PeriodCredit = periodCredit,
                    ClosingDebit = closingDebit,
                    ClosingCredit = closingCredit,
                });
            }

            var orderedItems = items.OrderBy(r => r.AccountCode).ToList();

            var totals = new TrialBalanceTotalsDto
            {
                OpeningDebit = AccountingAmount.RoundMoney(orderedItems.Sum(i => i.OpeningDebit)),
                OpeningCredit = AccountingAmount.RoundMoney(orderedItems.Sum(i => i.OpeningCredit)),
                PeriodDebit = AccountingAmount.RoundMoney(orderedItems.Sum(i => i.PeriodDebit)),
                PeriodCredit = AccountingAmount.RoundMoney(orderedItems.Sum(i => i.PeriodCredit)),
                ClosingDebit = AccountingAmount.RoundMoney(orderedItems.Sum(i => i.ClosingDebit)),
                ClosingCredit = AccountingAmount.RoundMoney(orderedItems.Sum(i => i.ClosingCredit)),
            };

            return new TrialBalanceResponseDto
            {
                Totals = totals,
                Accounts = orderedItems
            };
        }
    }
}
