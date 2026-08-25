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
    public class GetInventoryReportQuery : IRequest<InventoryReportDto>
    {
    }

    public class InventoryReportDto
    {
        public int TotalVehiclesCount { get; set; }
        public int AvailableCount { get; set; }
        public int SoldCount { get; set; }
        public int ReservedCount { get; set; }
        public int UnderMaintenanceCount { get; set; }

        public decimal TotalPurchaseCost { get; set; } // إجمالي سعر الشراء لكافة السيارات
        public decimal TotalBookValue { get; set; }     // إجمالي القيمة الدفترية الحالية للسيارات في المعرض (تشمل تكاليف الصيانة)
        public decimal TotalTargetSellingPrice { get; set; } // إجمالي أسعار البيع المستهدفة
        public decimal EstimatedProfit => TotalTargetSellingPrice - TotalBookValue; // الربح التقديري المتوقع

        public List<VehicleStatusSummaryDto> StatusBreakdown { get; set; } = new List<VehicleStatusSummaryDto>();
    }

    public class VehicleStatusSummaryDto
    {
        public string Status { get; set; } = string.Empty;
        public int Count { get; set; }
        public decimal TotalBookValue { get; set; }
    }

    public class GetInventoryReportQueryHandler : IRequestHandler<GetInventoryReportQuery, InventoryReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetInventoryReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<InventoryReportDto> Handle(GetInventoryReportQuery request, CancellationToken cancellationToken)
        {
            var vehicles = await _context.Vehicles.ToListAsync(cancellationToken);

            var totalCount = vehicles.Count;
            var available = vehicles.Count(v => v.Status == "Available");
            var sold = vehicles.Count(v => v.Status == "Sold");
            var reserved = vehicles.Count(v => v.Status == "Reserved");
            var underMaint = vehicles.Count(v => v.Status == "UnderMaintenance");

            var totalPurchaseCost = vehicles.Sum(v => v.PurchaseCost);
            var totalBookValue = vehicles.Sum(v => v.BookValue);
            var totalTargetSelling = vehicles.Sum(v => v.TargetSellingPrice);

            var breakdown = vehicles
                .GroupBy(v => v.Status)
                .Select(g => new VehicleStatusSummaryDto
                {
                    Status = g.Key,
                    Count = g.Count(),
                    TotalBookValue = g.Sum(v => v.BookValue)
                })
                .ToList();

            return new InventoryReportDto
            {
                TotalVehiclesCount = totalCount,
                AvailableCount = available,
                SoldCount = sold,
                ReservedCount = reserved,
                UnderMaintenanceCount = underMaint,
                TotalPurchaseCost = totalPurchaseCost,
                TotalBookValue = totalBookValue,
                TotalTargetSellingPrice = totalTargetSelling,
                StatusBreakdown = breakdown
            };
        }
    }
}
