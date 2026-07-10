using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.Application.Inventory.Queries
{
    public sealed class PublicVehiclePhotoDto
    {
        public Guid Id { get; init; }
        public string FileName { get; init; } = string.Empty;
    }

    public sealed class PublicVehicleDto
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

    public sealed class PublicVehiclesPageDto
    {
        public int Total { get; init; }
        public int Page { get; init; }
        public int PerPage { get; init; }
        public IReadOnlyList<PublicVehicleDto> Items { get; init; } = [];
    }

    public sealed class GetPublicVehiclesQuery : IRequest<PublicVehiclesPageDto>
    {
        public int Page { get; init; } = 1;
        public int PerPage { get; init; } = 25;
        public string? Search { get; init; }
    }

    public sealed class GetPublicVehiclesQueryHandler : IRequestHandler<GetPublicVehiclesQuery, PublicVehiclesPageDto>
    {
        private readonly IApplicationDbContext _context;

        public GetPublicVehiclesQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<PublicVehiclesPageDto> Handle(GetPublicVehiclesQuery request, CancellationToken cancellationToken)
        {
            var page = Math.Max(1, request.Page);
            var perPage = Math.Clamp(request.PerPage, 1, 100);

            var query = _context.Vehicles
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(vehicle => !vehicle.IsSold && vehicle.Status == "Available");

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(vehicle =>
                    vehicle.Model.Contains(search) ||
                    (vehicle.Color != null && vehicle.Color.Contains(search)) ||
                    vehicle.Year.ToString().Contains(search));
            }

            var total = await query.CountAsync(cancellationToken);
            var vehicles = await query
                .Include(vehicle => vehicle.Images)
                .OrderByDescending(vehicle => vehicle.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .ToListAsync(cancellationToken);

            return new PublicVehiclesPageDto
            {
                Total = total,
                Page = page,
                PerPage = perPage,
                Items = vehicles.Select(vehicle => new PublicVehicleDto
                {
                    Id = vehicle.Id,
                    BranchId = vehicle.BranchId,
                    Brand = string.IsNullOrWhiteSpace(vehicle.Brand) ? "سيارة" : vehicle.Brand,
                    Model = vehicle.Model,
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
                }).ToList()
            };
        }
    }
}
