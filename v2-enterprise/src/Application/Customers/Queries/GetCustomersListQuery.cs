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
    public class GetCustomersListQuery : IRequest<List<CustomerDto>>
    {
    }

    public class CustomerDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? IdType { get; set; }
        public string IdNumber { get; set; } = string.Empty;
        public DateTime? IdIssueDate { get; set; }
        public DateTime? IdExpiryDate { get; set; }
        public string? Nationality { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string CustomerType { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public string? PhotoUrl { get; set; }
        public Guid AccountId { get; set; }
        public string AccountCode { get; set; } = string.Empty;
        public Guid BranchId { get; set; }
        public DateTime? CreatedAt { get; set; }

        public int SalesCount { get; set; }
        public int PurchasesCount { get; set; }
        public int DocumentsCount { get; set; }
    }

    public class GetCustomersListQueryHandler : IRequestHandler<GetCustomersListQuery, List<CustomerDto>>
    {
        private readonly IApplicationDbContext _context;

        public GetCustomersListQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<CustomerDto>> Handle(GetCustomersListQuery request, CancellationToken cancellationToken)
        {
            var salesCounts = await _context.SalesContracts
                .Where(s => s.Status != "Cancelled")
                .GroupBy(s => s.CustomerId)
                .Select(g => new { CustomerId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CustomerId, x => x.Count, cancellationToken);

            var docCounts = await _context.CustomerDocuments
                .GroupBy(d => d.CustomerId)
                .Select(g => new { CustomerId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CustomerId, x => x.Count, cancellationToken);

            var customers = await _context.Customers
                .Include(c => c.Account)
                .Select(c => new CustomerDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    FullName = c.FullName,
                    Phone = c.Phone,
                    Address = c.Address,
                    IdType = c.IdType,
                    IdNumber = c.IdNumber,
                    IdIssueDate = c.IdIssueDate,
                    IdExpiryDate = c.IdExpiryDate,
                    Nationality = c.Nationality,
                    DateOfBirth = c.DateOfBirth,
                    CustomerType = c.CustomerType,
                    Notes = c.Notes,
                    PhotoUrl = c.PhotoUrl,
                    AccountId = c.AccountId,
                    AccountCode = c.Account != null ? c.Account.AccountCode : string.Empty,
                    BranchId = c.BranchId,
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync(cancellationToken);

            foreach (var c in customers)
            {
                c.SalesCount = salesCounts.TryGetValue(c.Id, out var sCount) ? sCount : 0;
                c.DocumentsCount = docCounts.TryGetValue(c.Id, out var dCount) ? dCount : 0;
                c.PurchasesCount = 0;
            }

            return customers;
        }
    }
}
