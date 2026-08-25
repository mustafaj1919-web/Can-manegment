using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.Application.Inventory.Commands
{
    // تعديل البيانات الوصفية للسيارة فقط. لا يتم تعديل تكلفة الشراء أو القيمة الدفترية
    // هنا للحفاظ على سلامة القيود المحاسبية المرتبطة بعملية الشراء.
    public class UpdateVehicleCommand : IRequest<Guid>
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
        public string? Currency { get; set; }
        public string? Notes { get; set; }
        public decimal TargetSellingPrice { get; set; }
    }

    public class UpdateVehicleCommandValidator : AbstractValidator<UpdateVehicleCommand>
    {
        public UpdateVehicleCommandValidator()
        {
            RuleFor(x => x.Id).NotEmpty().WithMessage("معرّف السيارة مطلوب.");
            RuleFor(x => x.Model).NotEmpty().WithMessage("موديل السيارة مطلوب.");
            RuleFor(x => x.ChassisNumber).NotEmpty().WithMessage("رقم الشاسيه مطلوب.");
            RuleFor(x => x.Year).GreaterThan(1900).WithMessage("سنة الصنع غير صالحة.");
        }
    }

    public class UpdateVehicleCommandHandler : IRequestHandler<UpdateVehicleCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public UpdateVehicleCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(UpdateVehicleCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            var vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => v.Id == request.Id && v.BranchId == branchId, cancellationToken);

            if (vehicle == null)
            {
                throw new InvalidOperationException("السيارة غير موجودة.");
            }

            // منع تكرار رقم الشاسيه مع سيارة أخرى
            var duplicate = await _context.Vehicles
                .IgnoreQueryFilters()
                .AnyAsync(v => v.ChassisNumber == request.ChassisNumber && v.Id != request.Id, cancellationToken);

            if (duplicate)
            {
                throw new InvalidOperationException("رقم الشاسيه هذا مسجل بالفعل لسيارة أخرى.");
            }

            vehicle.Brand = request.Brand;
            vehicle.Model = request.Model;
            vehicle.Trim = request.Trim;
            vehicle.ChassisNumber = request.ChassisNumber;
            vehicle.EngineNumber = request.EngineNumber;
            vehicle.Color = request.Color;
            vehicle.Year = request.Year;
            vehicle.Condition = request.Condition;
            vehicle.PlateNumber = request.PlateNumber;
            vehicle.PlateStatus = request.PlateStatus;
            vehicle.Mileage = request.Mileage;
            vehicle.EngineSize = request.EngineSize;
            vehicle.Cylinders = request.Cylinders;
            vehicle.Transmission = request.Transmission;
            vehicle.FuelType = request.FuelType;
            vehicle.ImportCountry = request.ImportCountry;
            vehicle.SeatCount = request.SeatCount;
            vehicle.SeatMaterial = request.SeatMaterial;
            if (!string.IsNullOrEmpty(request.Currency)) vehicle.Currency = request.Currency;
            vehicle.Notes = request.Notes;
            vehicle.TargetSellingPrice = request.TargetSellingPrice;

            await _context.SaveChangesAsync(cancellationToken);
            return vehicle.Id;
        }
    }
}
