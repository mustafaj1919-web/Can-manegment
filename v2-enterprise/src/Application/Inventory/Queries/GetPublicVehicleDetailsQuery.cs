using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.Application.Inventory.Queries
{
    public sealed class PublicVehicleDetailsDto
    {
        public Guid Id { get; init; }
        public Guid BranchId { get; init; }
        public string Brand { get; init; } = string.Empty;
        public string Model { get; init; } = string.Empty;
        public int Year { get; init; }
        public string Color { get; init; } = string.Empty;
        public string Status { get; init; } = string.Empty;
        public decimal? SellingPrice { get; init; }
        public DateTime CreatedAt { get; init; }
        public IReadOnlyList<PublicVehiclePhotoDto> Photos { get; init; } = [];
    }

    public sealed class GetPublicVehicleDetailsQuery : IRequest<PublicVehicleDetailsDto?>
    {
        public Guid VehicleId { get; init; }
    }

    public sealed class GetPublicVehicleDetailsQueryHandler : IRequestHandler<GetPublicVehicleDetailsQuery, PublicVehicleDetailsDto?>
    {
        private readonly IApplicationDbContext _context;

        public GetPublicVehicleDetailsQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<PublicVehicleDetailsDto?> Handle(GetPublicVehicleDetailsQuery request, CancellationToken cancellationToken)
        {
            var vehicle = await _context.Vehicles
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Include(item => item.Images)
                .FirstOrDefaultAsync(
                    item => item.Id == request.VehicleId && !item.IsSold && item.Status == "Available",
                    cancellationToken);

            if (vehicle is null)
            {
                return null;
            }

            var (brand, model) = GetPublicVehiclesQueryHandler.SplitModel(vehicle.Model);
            return new PublicVehicleDetailsDto
            {
                Id = vehicle.Id,
                BranchId = vehicle.BranchId,
                Brand = brand,
                Model = model,
                Year = vehicle.Year,
                Color = vehicle.Color ?? string.Empty,
                Status = vehicle.Status,
                SellingPrice = vehicle.TargetSellingPrice > 0 ? vehicle.TargetSellingPrice : null,
                CreatedAt = vehicle.CreatedAt,
                Photos = vehicle.Images
                    .OrderBy(image => image.UploadedAt)
                    .Select(image => new PublicVehiclePhotoDto
                    {
                        Id = image.Id,
                        FileName = image.FileName
                    })
                    .ToList()
            };
        }
    }
}
