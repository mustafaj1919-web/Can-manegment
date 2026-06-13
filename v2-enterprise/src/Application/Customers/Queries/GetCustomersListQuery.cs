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
        public string CustomerType { get; set; } = string.Empty;
        public Guid AccountId { get; set; }
        public string AccountCode { get; set; } = string.Empty;
        public Guid BranchId { get; set; }
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
            return await _context.Customers
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
                    CustomerType = c.CustomerType,
                    AccountId = c.AccountId,
                    AccountCode = c.Account != null ? c.Account.AccountCode : string.Empty,
                    BranchId = c.BranchId
                })
                .ToListAsync(cancellationToken);
        }
    }
}
