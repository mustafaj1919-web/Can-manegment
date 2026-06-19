using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.Application.Inventory.Commands
{
    public class DeleteVehicleImageCommand : IRequest<Unit>
    {
        public Guid VehicleId { get; set; }
        public Guid ImageId { get; set; }
    }

    public class DeleteVehicleImageCommandHandler : IRequestHandler<DeleteVehicleImageCommand, Unit>
    {
        private readonly IApplicationDbContext _context;

        public DeleteVehicleImageCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(DeleteVehicleImageCommand request, CancellationToken cancellationToken)
        {
            var image = await _context.VehicleImages
                .FirstOrDefaultAsync(
                    vi => vi.Id == request.ImageId && vi.VehicleId == request.VehicleId,
                    cancellationToken);

            if (image == null)
                throw new KeyNotFoundException("الصورة غير موجودة.");

            // Delete physical file if it exists
            var storagePath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "vehicles");
            var filePath = Path.Combine(storagePath, image.FileName);
            if (File.Exists(filePath))
                File.Delete(filePath);

            _context.VehicleImages.Remove(image);
            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
