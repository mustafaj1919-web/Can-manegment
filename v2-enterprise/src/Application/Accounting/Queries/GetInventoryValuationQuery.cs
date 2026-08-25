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
    public class InventoryValuationDto
    {
        public int TotalVehiclesCount { get; set; }
        public decimal TotalBookValue { get; set; }
        public decimal TotalPurchaseCost { get; set; }
        public List<InventoryVehicleDto> Vehicles { get; set; } = new List<InventoryVehicleDto>();
    }

    public class InventoryVehicleDto
    {
        public Guid VehicleId { get; set; }
        public string Model { get; set; } = string.Empty;
        public string ChassisNumber { get; set; } = string.Empty;
        public decimal PurchaseCost { get; set; }
        public decimal BookValue { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public string SupplierName { get; set; } = string.Empty;
    }

    public class GetInventoryValuationQuery : IRequest<InventoryValuationDto>
    {
        public DateTime? AsOfDate { get; set; }
    }

    public class GetInventoryValuationQueryHandler : IRequestHandler<GetInventoryValuationQuery, InventoryValuationDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetInventoryValuationQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<InventoryValuationDto> Handle(GetInventoryValuationQuery request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // جلب السيارات المتاحة فقط للفرع الحالي
            var vehiclesQuery = _context.Vehicles
                .Where(v => v.BranchId == branchId && !v.IsSold && v.Status == "Available");

            // جلب فواتير الشراء وعلاقتها بالموردين للفرع الحالي
            var purchases = await _context.Purchases
                .Include(p => p.Supplier)
                .Where(p => p.BranchId == branchId && p.Status == "Active")
                .ToListAsync(cancellationToken);

            var vehicles = await vehiclesQuery.ToListAsync(cancellationToken);

            // تصفية إضافية بالتاريخ إذا كان AsOfDate محدداً (تعتمد على تاريخ الشراء)
            if (request.AsOfDate.HasValue)
            {
                // نستبعد السيارات التي تم شراؤها بعد AsOfDate
                var purchasesBeforeDate = purchases.Where(p => p.CreatedAt <= request.AsOfDate.Value).Select(p => p.VehicleId).ToList();
                vehicles = vehicles.Where(v => purchasesBeforeDate.Contains(v.Id)).ToList();
            }

            var vehicleDtos = new List<InventoryVehicleDto>();

            foreach (var vehicle in vehicles)
            {
                var purchase = purchases.FirstOrDefault(p => p.VehicleId == vehicle.Id);
                vehicleDtos.Add(new InventoryVehicleDto
                {
                    VehicleId = vehicle.Id,
                    Model = vehicle.Model,
                    ChassisNumber = vehicle.ChassisNumber,
                    PurchaseCost = AccountingAmount.RoundMoney(vehicle.PurchaseCost),
                    BookValue = AccountingAmount.RoundMoney(vehicle.BookValue),
                    PurchaseDate = purchase?.CreatedAt,
                    SupplierName = purchase?.Supplier?.Name ?? "رصيد أول المدة/غير محدد"
                });
            }

            return new InventoryValuationDto
            {
                TotalVehiclesCount = vehicleDtos.Count,
                TotalBookValue = AccountingAmount.RoundMoney(vehicleDtos.Sum(v => v.BookValue)),
                TotalPurchaseCost = AccountingAmount.RoundMoney(vehicleDtos.Sum(v => v.PurchaseCost)),
                Vehicles = vehicleDtos.OrderBy(v => v.Model).ToList()
            };
        }
    }
}
