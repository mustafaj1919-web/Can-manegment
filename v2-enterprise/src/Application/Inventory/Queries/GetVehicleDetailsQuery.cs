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
    public class GetVehicleDetailsQuery : IRequest<VehicleDetailsDto>
    {
        public Guid VehicleId { get; set; }
    }

    public class VehicleDetailsDto
    {
        public Guid Id { get; set; }
        public string? Brand { get; set; }
        public string Model { get; set; } = string.Empty;
        public string? Trim { get; set; }
        public string ChassisNumber { get; set; } = string.Empty;
        public string? EngineNumber { get; set; }
        public string? Color { get; set; }
        public int Year { get; set; }
        public string? Condition { get; set; }
        public string? PlateNumber { get; set; }
        public string? PlateStatus { get; set; }
        public int? Mileage { get; set; }
        public string? EngineSize { get; set; }
        public int? Cylinders { get; set; }
        public string? Transmission { get; set; }
        public string? FuelType { get; set; }
        public string? ImportCountry { get; set; }
        public int? SeatCount { get; set; }
        public string? SeatMaterial { get; set; }
        public string Currency { get; set; } = "IQD";
        public string? Notes { get; set; }
        public decimal PurchaseCost { get; set; }
        public decimal CustomDuties { get; set; }
        public decimal MaintenanceCost { get; set; }
        public decimal TotalCost { get; set; }
        public decimal BookValue { get; set; }
        public decimal TargetSellingPrice { get; set; }
        public bool IsSold { get; set; }
        public string Status { get; set; } = string.Empty;
        public Guid BranchId { get; set; }

        public List<VehicleImageDto> Images { get; set; } = new List<VehicleImageDto>();
        public List<VehicleCostDto> DetailedCosts { get; set; } = new List<VehicleCostDto>();
    }

    public class VehicleImageDto
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = string.Empty;
    }

    public class VehicleCostDto
    {
        public Guid Id { get; set; }
        public string CostType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class GetVehicleDetailsQueryHandler : IRequestHandler<GetVehicleDetailsQuery, VehicleDetailsDto>
    {
        private readonly IApplicationDbContext _context;

        public GetVehicleDetailsQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<VehicleDetailsDto> Handle(GetVehicleDetailsQuery request, CancellationToken cancellationToken)
        {
            var vehicle = await _context.Vehicles
                .Include(v => v.Images)
                .Include(v => v.DetailedCosts)
                .FirstOrDefaultAsync(v => v.Id == request.VehicleId, cancellationToken);

            if (vehicle == null)
            {
                throw new KeyNotFoundException("السيارة المحددة غير موجودة.");
            }

            return new VehicleDetailsDto
            {
                Id = vehicle.Id,
                Brand = vehicle.Brand,
                Model = vehicle.Model,
                Trim = vehicle.Trim,
                ChassisNumber = vehicle.ChassisNumber,
                EngineNumber = vehicle.EngineNumber,
                Color = vehicle.Color,
                Year = vehicle.Year,
                Condition = vehicle.Condition,
                PlateNumber = vehicle.PlateNumber,
                PlateStatus = vehicle.PlateStatus,
                Mileage = vehicle.Mileage,
                EngineSize = vehicle.EngineSize,
                Cylinders = vehicle.Cylinders,
                Transmission = vehicle.Transmission,
                FuelType = vehicle.FuelType,
                ImportCountry = vehicle.ImportCountry,
                SeatCount = vehicle.SeatCount,
                SeatMaterial = vehicle.SeatMaterial,
                Currency = vehicle.Currency ?? "IQD",
                Notes = vehicle.Notes,
                PurchaseCost = vehicle.PurchaseCost,
                CustomDuties = vehicle.CustomDuties,
                MaintenanceCost = vehicle.MaintenanceCost,
                TotalCost = vehicle.TotalCost,
                BookValue = vehicle.BookValue,
                TargetSellingPrice = vehicle.TargetSellingPrice,
                IsSold = vehicle.IsSold,
                Status = vehicle.Status,
                BranchId = vehicle.BranchId,
                Images = vehicle.Images.Select(i => new VehicleImageDto { Id = i.Id, FileName = i.FileName }).ToList(),
                DetailedCosts = vehicle.DetailedCosts.Select(c => new VehicleCostDto
                {
                    Id = c.Id,
                    CostType = c.CostType,
                    Amount = c.Amount,
                    Currency = c.Currency,
                    Description = c.Description,
                    CreatedAt = c.CreatedAt
                }).OrderBy(c => c.CreatedAt).ToList()
            };
        }
    }
}
