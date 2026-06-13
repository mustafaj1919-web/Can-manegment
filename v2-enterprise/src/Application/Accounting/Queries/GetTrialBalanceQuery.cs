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
    public class GetTrialBalanceQuery : IRequest<List<TrialBalanceItemDto>>
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class TrialBalanceItemDto
    {
        public Guid AccountId { get; set; }
        public string AccountCode { get; set; } = string.Empty;
        public string AccountName { get; set; } = string.Empty;
        public string AccountType { get; set; } = string.Empty;
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }
        public decimal NetDebit => TotalDebit > TotalCredit ? AccountingAmount.RoundMoney(TotalDebit - TotalCredit) : 0;
        public decimal NetCredit => TotalCredit > TotalDebit ? AccountingAmount.RoundMoney(TotalCredit - TotalDebit) : 0;
    }

    public class GetTrialBalanceQueryHandler : IRequestHandler<GetTrialBalanceQuery, List<TrialBalanceItemDto>>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetTrialBalanceQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<List<TrialBalanceItemDto>> Handle(GetTrialBalanceQuery request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // جلب الحسابات النشطة للفرع الحالي
            var accounts = await _context.Accounts
                .Where(a => a.IsActive && a.BranchId == branchId)
                .ToListAsync(cancellationToken);

            // جلب سطور القيود المرحّلة فقط لحساب المجاميع وضمن الفرع ونطاق التواريخ
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

            var result = new List<TrialBalanceItemDto>();

            foreach (var account in accounts)
            {
                var linesForAccount = journalLines.Where(l => l.AccountId == account.Id).ToList();
                var totalDebit = AccountingAmount.RoundMoney(linesForAccount.Sum(l => l.Debit));
                var totalCredit = AccountingAmount.RoundMoney(linesForAccount.Sum(l => l.Credit));

                result.Add(new TrialBalanceItemDto
                {
                    AccountId = account.Id,
                    AccountCode = account.AccountCode,
                    AccountName = account.Name,
                    AccountType = account.Type.ToString(),
                    TotalDebit = totalDebit,
                    TotalCredit = totalCredit
                });
            }

            return result.OrderBy(r => r.AccountCode).ToList();
        }
    }
}
