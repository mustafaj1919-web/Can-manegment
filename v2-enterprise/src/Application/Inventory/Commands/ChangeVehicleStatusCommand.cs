using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.Application.Inventory.Commands
{
    public class ChangeVehicleStatusCommand : IRequest
    {
        public Guid VehicleId { get; set; }
        public string NewStatus { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class ChangeVehicleStatusCommandValidator : AbstractValidator<ChangeVehicleStatusCommand>
    {
        private static readonly string[] AllowedStatuses = { "Available", "Reserved", "UnderMaintenance" };

        public ChangeVehicleStatusCommandValidator()
        {
            RuleFor(x => x.VehicleId).NotEmpty();
            RuleFor(x => x.NewStatus)
                .NotEmpty()
                .Must(s => Array.Exists(AllowedStatuses, a => a == s))
                .WithMessage("الحالة يجب أن تكون: Available أو Reserved أو UnderMaintenance.");
        }
    }

    public class ChangeVehicleStatusCommandHandler : IRequestHandler<ChangeVehicleStatusCommand>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ChangeVehicleStatusCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task Handle(ChangeVehicleStatusCommand request, CancellationToken cancellationToken)
        {
            var vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => v.Id == request.VehicleId, cancellationToken);

            if (vehicle == null)
                throw new InvalidOperationException("السيارة غير موجودة.");

            if (vehicle.IsSold || vehicle.Status == "Sold")
                throw new InvalidOperationException("لا يمكن تغيير حالة سيارة مباعة.");

            if (vehicle.Status == request.NewStatus)
                return;

            vehicle.Status = request.NewStatus;
            // السجل يُضاف تلقائياً في SaveChangesAsync عبر ApplicationDbContext
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
