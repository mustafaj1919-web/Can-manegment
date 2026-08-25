using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.Application.Customers.Queries
{
    public class GetCustomerLedgerQuery : IRequest<CustomerLedgerDto>
    {
        public Guid CustomerId { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    public class CustomerLedgerDto
    {
        public Guid CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string AccountCode { get; set; } = string.Empty;
        public decimal OpeningBalance { get; set; } // الرصيد الافتتاحي قبل تاريخ البداية
        public List<CustomerLedgerLineDto> Lines { get; set; } = new List<CustomerLedgerLineDto>();
        public decimal ClosingBalance { get; set; } // الرصيد الختامي النهائي
    }

    public class CustomerLedgerLineDto
    {
        public Guid JournalEntryId { get; set; }
        public string EntryNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public decimal RunningBalance { get; set; }
    }

    public class GetCustomerLedgerQueryHandler : IRequestHandler<GetCustomerLedgerQuery, CustomerLedgerDto>
    {
        private readonly IApplicationDbContext _context;

        public GetCustomerLedgerQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<CustomerLedgerDto> Handle(GetCustomerLedgerQuery request, CancellationToken cancellationToken)
        {
            var customer = await _context.Customers
                .Include(c => c.Account)
                .FirstOrDefaultAsync(c => c.Id == request.CustomerId, cancellationToken);

            if (customer == null)
            {
                throw new KeyNotFoundException("العميل غير موجود.");
            }

            var accountId = customer.AccountId;
            var startDate = request.StartDate ?? DateTime.MinValue;
            var endDate = request.EndDate ?? DateTime.MaxValue;

            // 1. حساب الرصيد الافتتاحي (Opening Balance) قبل تاريخ البداية المختار
            // بما أن حساب العميل يقع ضمن الأصول (Asset)، فإن الرصيد = مدين - دائن
            var openingDebit = await _context.JournalLines
                .Include(l => l.JournalEntry)
                .Where(l => l.AccountId == accountId && l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.EntryDate < startDate)
                .SumAsync(l => l.Debit, cancellationToken);

            var openingCredit = await _context.JournalLines
                .Include(l => l.JournalEntry)
                .Where(l => l.AccountId == accountId && l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.EntryDate < startDate)
                .SumAsync(l => l.Credit, cancellationToken);

            var openingBalance = openingDebit - openingCredit;

            // 2. جلب حركات اليومية خلال الفترة المحددة
            var lines = await _context.JournalLines
                .Include(l => l.JournalEntry)
                .Where(l => l.AccountId == accountId && l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.EntryDate >= startDate && l.JournalEntry.EntryDate <= endDate)
                .OrderBy(l => l.JournalEntry!.EntryDate)
                .ThenBy(l => l.JournalEntry!.CreatedAt)
                .Select(l => new
                {
                    JournalEntryId = l.JournalEntry!.Id,
                    EntryNumber = l.JournalEntry.EntryNumber,
                    EntryDate = l.JournalEntry.EntryDate,
                    Description = l.Description ?? l.JournalEntry.Description,
                    Debit = l.Debit,
                    Credit = l.Credit
                })
                .ToListAsync(cancellationToken);

            // 3. بناء الخطوط وحساب الرصيد الجاري (Running Balance)
            var ledgerLines = new List<CustomerLedgerLineDto>();
            var currentBalance = openingBalance;

            foreach (var line in lines)
            {
                currentBalance += (line.Debit - line.Credit);
                ledgerLines.Add(new CustomerLedgerLineDto
                {
                    JournalEntryId = line.JournalEntryId,
                    EntryNumber = line.EntryNumber,
                    Date = line.EntryDate,
                    Description = line.Description,
                    Debit = line.Debit,
                    Credit = line.Credit,
                    RunningBalance = currentBalance
                });
            }

            return new CustomerLedgerDto
            {
                CustomerId = customer.Id,
                CustomerName = customer.Name,
                AccountCode = customer.Account?.AccountCode ?? string.Empty,
                OpeningBalance = openingBalance,
                Lines = ledgerLines,
                ClosingBalance = currentBalance
            };
        }
    }
}
