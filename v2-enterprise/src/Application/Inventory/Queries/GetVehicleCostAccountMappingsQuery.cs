using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.Application.Inventory.Queries
{
    public class GetVehicleCostAccountMappingsQuery : IRequest<List<VehicleCostAccountMappingDto>>
    {
    }

    public class VehicleCostAccountMappingDto
    {
        public string CostType { get; set; } = string.Empty;
        public string CostTypeLabel { get; set; } = string.Empty;
        public Guid? AccountId { get; set; }
        public string? AccountCode { get; set; }
        public string? AccountName { get; set; }
    }

    public class GetVehicleCostAccountMappingsQueryHandler : IRequestHandler<GetVehicleCostAccountMappingsQuery, List<VehicleCostAccountMappingDto>>
    {
        // أنواع مصاريف السيارات المعروفة بالنظام (يجب أن تطابق القيم المستخدمة بواجهة إضافة المصروف)
        private static readonly (string Type, string Label)[] KnownCostTypes = new[]
        {
            ("shipping",    "مصاريف الشحن"),
            ("clearance",   "مصاريف التخليص"),
            ("inspection",  "مصاريف الفحص"),
            ("preparation", "مصاريف التجهيز"),
            ("other",       "مصاريف أخرى"),
        };

        private readonly IApplicationDbContext _context;

        public GetVehicleCostAccountMappingsQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<VehicleCostAccountMappingDto>> Handle(GetVehicleCostAccountMappingsQuery request, CancellationToken cancellationToken)
        {
            var mappings = await _context.VehicleCostAccountMappings
                .Include(m => m.Account)
                .ToListAsync(cancellationToken);

            return KnownCostTypes.Select(t =>
            {
                var mapping = mappings.FirstOrDefault(m => m.CostType == t.Type);
                return new VehicleCostAccountMappingDto
                {
                    CostType = t.Type,
                    CostTypeLabel = t.Label,
                    AccountId = mapping?.AccountId,
                    AccountCode = mapping?.Account?.AccountCode,
                    AccountName = mapping?.Account?.Name,
                };
            }).ToList();
        }
    }
}
