using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Application.Inventory.Commands
{
    public class VehicleImageResult
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = string.Empty;
    }

    public class UploadVehicleImageCommand : IRequest<VehicleImageResult>
    {
        public Guid VehicleId { get; set; }
        public string OriginalFileName { get; set; } = string.Empty;
        public byte[] FileBytes { get; set; } = Array.Empty<byte>();
    }

    public class UploadVehicleImageCommandHandler : IRequestHandler<UploadVehicleImageCommand, VehicleImageResult>
    {
        private readonly IApplicationDbContext _context;

        public UploadVehicleImageCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<VehicleImageResult> Handle(UploadVehicleImageCommand request, CancellationToken cancellationToken)
        {
            var vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => v.Id == request.VehicleId, cancellationToken);

            if (vehicle == null)
            {
                throw new KeyNotFoundException("السيارة غير موجودة.");
            }

            var storagePath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "vehicles");
            if (!Directory.Exists(storagePath))
            {
                Directory.CreateDirectory(storagePath);
            }

            var extension = Path.GetExtension(request.OriginalFileName);
            var secureFileName = $"{Guid.NewGuid().ToString("N")}{extension}";
            var fullFilePath = Path.Combine(storagePath, secureFileName);

            await File.WriteAllBytesAsync(fullFilePath, request.FileBytes, cancellationToken);

            var image = new VehicleImage
            {
                Id = Guid.NewGuid(),
                VehicleId = vehicle.Id,
                FileName = secureFileName,
                UploadedAt = DateTime.UtcNow
            };

            _context.VehicleImages.Add(image);
            await _context.SaveChangesAsync(cancellationToken);

            return new VehicleImageResult { Id = image.Id, FileName = secureFileName };
        }
    }
}
