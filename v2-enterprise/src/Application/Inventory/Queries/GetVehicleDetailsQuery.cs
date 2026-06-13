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
        public string Model { get; set; } = string.Empty;
        public string ChassisNumber { get; set; } = string.Empty;
        public string? EngineNumber { get; set; }
        public string? Color { get; set; }
        public int Year { get; set; }
        public decimal PurchaseCost { get; set; }
        public decimal CustomDuties { get; set; }
        public decimal MaintenanceCost { get; set; }
        public decimal TotalCost { get; set; }
        public decimal BookValue { get; set; }
        public decimal TargetSellingPrice { get; set; }
        public bool IsSold { get; set; }
        public string Status { get; set; } = string.Empty;
        public Guid BranchId { get; set; }
        
        public List<string> Images { get; set; } = new List<string>();
        public List<VehicleCostDto> DetailedCosts { get; set; } = new List<VehicleCostDto>();
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
                Model = vehicle.Model,
                ChassisNumber = vehicle.ChassisNumber,
                EngineNumber = vehicle.EngineNumber,
                Color = vehicle.Color,
                Year = vehicle.Year,
                PurchaseCost = vehicle.PurchaseCost,
                CustomDuties = vehicle.CustomDuties,
                MaintenanceCost = vehicle.MaintenanceCost,
                TotalCost = vehicle.TotalCost,
                BookValue = vehicle.BookValue,
                TargetSellingPrice = vehicle.TargetSellingPrice,
                IsSold = vehicle.IsSold,
                Status = vehicle.Status,
                BranchId = vehicle.BranchId,
                Images = vehicle.Images.Select(i => i.FileName).ToList(),
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
