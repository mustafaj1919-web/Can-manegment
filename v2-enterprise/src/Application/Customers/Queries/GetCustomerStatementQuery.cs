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
    public class GetCustomerStatementQuery : IRequest<CustomerStatementDto>
    {
        public Guid CustomerId { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    public class CustomerStatementDto
    {
        public Guid CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string AccountCode { get; set; } = string.Empty;
        
        public DateTime StatementStartDate { get; set; }
        public DateTime StatementEndDate { get; set; }

        public decimal OpeningBalance { get; set; } // الرصيد قبل تاريخ البداية
        public decimal TotalDebits { get; set; }    // إجمالي المبيعات/المدينات خلال الفترة
        public decimal TotalCredits { get; set; }   // إجمالي المقبوضات/المدفوعات خلال الفترة
        public decimal EndingBalance { get; set; }  // الرصيد النهائي المستحق
    }

    public class GetCustomerStatementQueryHandler : IRequestHandler<GetCustomerStatementQuery, CustomerStatementDto>
    {
        private readonly IApplicationDbContext _context;

        public GetCustomerStatementQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<CustomerStatementDto> Handle(GetCustomerStatementQuery request, CancellationToken cancellationToken)
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

            // 1. حساب الرصيد الافتتاحي (Opening Balance)
            var openingDebit = await _context.JournalLines
                .Include(l => l.JournalEntry)
                .Where(l => l.AccountId == accountId && l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.EntryDate < startDate)
                .SumAsync(l => l.Debit, cancellationToken);

            var openingCredit = await _context.JournalLines
                .Include(l => l.JournalEntry)
                .Where(l => l.AccountId == accountId && l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.EntryDate < startDate)
                .SumAsync(l => l.Credit, cancellationToken);

            var openingBalance = openingDebit - openingCredit;

            // 2. حساب إجمالي الحركات المدينة والدائنة خلال الفترة
            var periodDebit = await _context.JournalLines
                .Include(l => l.JournalEntry)
                .Where(l => l.AccountId == accountId && l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.EntryDate >= startDate && l.JournalEntry.EntryDate <= endDate)
                .SumAsync(l => l.Debit, cancellationToken);

            var periodCredit = await _context.JournalLines
                .Include(l => l.JournalEntry)
                .Where(l => l.AccountId == accountId && l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.EntryDate >= startDate && l.JournalEntry.EntryDate <= endDate)
                .SumAsync(l => l.Credit, cancellationToken);

            var endingBalance = openingBalance + periodDebit - periodCredit;

            return new CustomerStatementDto
            {
                CustomerId = customer.Id,
                CustomerName = customer.Name,
                FullName = customer.FullName ?? customer.Name,
                Phone = customer.Phone,
                Address = customer.Address ?? string.Empty,
                AccountCode = customer.Account?.AccountCode ?? string.Empty,
                StatementStartDate = startDate,
                StatementEndDate = endDate,
                OpeningBalance = openingBalance,
                TotalDebits = periodDebit,
                TotalCredits = periodCredit,
                EndingBalance = endingBalance
            };
        }
    }
}
