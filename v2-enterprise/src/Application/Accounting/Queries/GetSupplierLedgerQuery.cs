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
    public class SupplierLedgerDto
    {
        public Guid SupplierId { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public string AccountCode { get; set; } = string.Empty;
        public decimal OpeningBalance { get; set; }
        public decimal ClosingBalance { get; set; }
        public int TotalCount { get; set; }
        public List<LedgerTransactionDto> Transactions { get; set; } = new List<LedgerTransactionDto>();
    }

    public class GetSupplierLedgerQuery : IRequest<SupplierLedgerDto>
    {
        public Guid SupplierId { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class GetSupplierLedgerQueryHandler : IRequestHandler<GetSupplierLedgerQuery, SupplierLedgerDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetSupplierLedgerQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<SupplierLedgerDto> Handle(GetSupplierLedgerQuery request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // 1. جلب المورد
            var supplier = await _context.Suppliers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Id == request.SupplierId && s.BranchId == branchId, cancellationToken);

            if (supplier == null)
            {
                throw new InvalidOperationException("المورد المحدد غير موجود أو لا ينتمي لهذا الفرع.");
            }

            // 2. جلب الحساب المالي المربوط بالمورد
            var account = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Id == supplier.AccountId && a.BranchId == branchId, cancellationToken);

            if (account == null)
            {
                throw new InvalidOperationException("الحساب المحاسبي للمورد غير موجود.");
            }

            // تحديد الصفحة وحمايتها
            var page = request.Page <= 0 ? 1 : request.Page;
            var pageSize = request.PageSize <= 0 ? 10 : (request.PageSize > 100 ? 100 : request.PageSize);

            // 3. جلب جميع حركات القيود المرحلة للحساب من النشأة حتى ToDate
            var query = _context.JournalLines
                .Include(l => l.JournalEntry)
                .Where(l => l.AccountId == account.Id && l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.BranchId == branchId);

            if (request.ToDate.HasValue)
            {
                query = query.Where(l => l.JournalEntry!.EntryDate <= request.ToDate.Value);
            }

            var allLines = await query
                .OrderBy(l => l.JournalEntry!.EntryDate)
                .ThenBy(l => l.JournalEntry!.CreatedAt)
                .ThenBy(l => l.Id)
                .ToListAsync(cancellationToken);

            // 4. احتساب الأرصدة الجارية من البداية
            decimal currentBalance = 0;
            var allTransactions = new List<LedgerTransactionDto>();

            foreach (var line in allLines)
            {
                // حساب المورد ذمم دائنة (التزامات): الدائن يزيد، المدين يخفض
                currentBalance += line.Credit - line.Debit;
                currentBalance = AccountingAmount.RoundMoney(currentBalance);

                allTransactions.Add(new LedgerTransactionDto
                {
                    JournalEntryId = line.JournalEntryId,
                    EntryNumber = line.JournalEntry!.EntryNumber,
                    EntryDate = line.JournalEntry.EntryDate,
                    Description = line.Description ?? line.JournalEntry.Description,
                    Debit = AccountingAmount.RoundMoney(line.Debit),
                    Credit = AccountingAmount.RoundMoney(line.Credit),
                    RunningBalance = currentBalance
                });
            }

            // 5. تصفية الحركات قبل FromDate للرصيد الافتتاحي
            decimal openingBalance = 0;
            var activeTransactions = allTransactions;

            if (request.FromDate.HasValue)
            {
                var beforeLines = allTransactions.Where(t => t.EntryDate < request.FromDate.Value).ToList();
                if (beforeLines.Any())
                {
                    openingBalance = beforeLines.Last().RunningBalance;
                }
                activeTransactions = allTransactions.Where(t => t.EntryDate >= request.FromDate.Value).ToList();
            }

            // الرصيد الختامي
            decimal closingBalance = allTransactions.Any() ? allTransactions.Last().RunningBalance : 0;

            // تطبيق Pagination
            var totalCount = activeTransactions.Count;
            var paginatedTransactions = activeTransactions
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return new SupplierLedgerDto
            {
                SupplierId = supplier.Id,
                SupplierName = supplier.Name,
                AccountCode = account.AccountCode,
                OpeningBalance = AccountingAmount.RoundMoney(openingBalance),
                ClosingBalance = AccountingAmount.RoundMoney(closingBalance),
                TotalCount = totalCount,
                Transactions = paginatedTransactions
            };
        }
    }
}
