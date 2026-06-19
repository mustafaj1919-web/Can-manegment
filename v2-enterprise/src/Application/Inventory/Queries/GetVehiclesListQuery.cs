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
    public class GetVehiclesListQuery : IRequest<List<VehicleListDto>>
    {
        public string? Status { get; set; }
    }

    public class VehicleListDto
    {
        public Guid Id { get; set; }
        public string? Brand { get; set; }
        public string Model { get; set; } = string.Empty;
        public string? Trim { get; set; }
        public string ChassisNumber { get; set; } = string.Empty;
        public string? Color { get; set; }
        public int Year { get; set; }
        public string? Condition { get; set; }
        public int? Mileage { get; set; }
        public string? Transmission { get; set; }
        public string? FuelType { get; set; }
        public string Currency { get; set; } = "IQD";
        public decimal PurchaseCost { get; set; }
        public decimal BookValue { get; set; }
        public decimal TargetSellingPrice { get; set; }
        public bool IsSold { get; set; }
        public string Status { get; set; } = string.Empty;
        public Guid BranchId { get; set; }
        public string? CoverImage { get; set; }
    }

    public class GetVehiclesListQueryHandler : IRequestHandler<GetVehiclesListQuery, List<VehicleListDto>>
    {
        private readonly IApplicationDbContext _context;

        public GetVehiclesListQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<VehicleListDto>> Handle(GetVehiclesListQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Vehicles.AsQueryable();

            if (!string.IsNullOrEmpty(request.Status))
            {
                query = query.Where(v => v.Status == request.Status);
            }

            return await query
                .Select(v => new VehicleListDto
                {
                    Id = v.Id,
                    Brand = v.Brand,
                    Model = v.Model,
                    Trim = v.Trim,
                    ChassisNumber = v.ChassisNumber,
                    Color = v.Color,
                    Year = v.Year,
                    Condition = v.Condition,
                    Mileage = v.Mileage,
                    Transmission = v.Transmission,
                    FuelType = v.FuelType,
                    Currency = v.Currency ?? "IQD",
                    PurchaseCost = v.PurchaseCost,
                    BookValue = v.BookValue,
                    TargetSellingPrice = v.TargetSellingPrice,
                    IsSold = v.IsSold,
                    Status = v.Status,
                    BranchId = v.BranchId,
                    CoverImage = v.Images.OrderBy(i => i.UploadedAt).Select(i => i.FileName).FirstOrDefault()
                })
                .ToListAsync(cancellationToken);
        }
    }
}
