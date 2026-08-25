using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Application.Inventory.Commands
{
    public class CreateVehicleCommand : IRequest<Guid>
    {
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
        public decimal TargetSellingPrice { get; set; }
        public string CreditAccountCode { get; set; } = "2101"; // الافتراضي ذمم الدائنين (الموردين)
    }

    public class CreateVehicleCommandValidator : AbstractValidator<CreateVehicleCommand>
    {
        public CreateVehicleCommandValidator()
        {
            RuleFor(x => x.Model).NotEmpty().WithMessage("موديل السيارة مطلوب.");
            RuleFor(x => x.ChassisNumber).NotEmpty().WithMessage("رقم الشاسيه مطلوب.");
            RuleFor(x => x.Year).GreaterThan(1900).WithMessage("سنة الصنع غير صالحة.");
            RuleFor(x => x.PurchaseCost).GreaterThan(0).WithMessage("تكلفة الشراء يجب أن تكون أكبر من صفر.");
        }
    }

    public class CreateVehicleCommandHandler : IRequestHandler<CreateVehicleCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CreateVehicleCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(CreateVehicleCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // 1. التحقق من عدم تكرار رقم الشاسيه
            var existingVehicle = await _context.Vehicles
                .IgnoreQueryFilters()
                .AnyAsync(v => v.ChassisNumber == request.ChassisNumber, cancellationToken);

            if (existingVehicle)
            {
                throw new InvalidOperationException("رقم الشاسيه هذا مسجل بالفعل لسيارة أخرى.");
            }

            // 2. التحقق من وجود الحسابات المحاسبية المطلوبة
            // حساب المخزون: 1201
            var debitAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "1201", cancellationToken);

            // الحساب الدائن (الصندوق/البنك أو المورد)
            var creditAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == request.CreditAccountCode, cancellationToken);

            if (debitAccount == null)
            {
                throw new InvalidOperationException("حساب مخزون السيارات (1201) غير موجود في شجرة الحسابات.");
            }

            if (creditAccount == null)
            {
                throw new InvalidOperationException($"الحساب الدائن المحدد ({request.CreditAccountCode}) غير موجود في شجرة الحسابات.");
            }

            var dbContext = _context as DbContext;
            if (dbContext == null)
            {
                throw new InvalidOperationException("DbContext context is invalid.");
            }

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // 3. تسجيل السيارة وتعيين القيمة الدفترية الأولية
                var vehicle = new Vehicle
                {
                    Id = Guid.NewGuid(),
                    Brand = request.Brand,
                    Model = request.Model,
                    Trim = request.Trim,
                    ChassisNumber = request.ChassisNumber,
                    EngineNumber = request.EngineNumber,
                    Color = request.Color,
                    Year = request.Year,
                    Condition = request.Condition,
                    PlateNumber = request.PlateNumber,
                    PlateStatus = request.PlateStatus,
                    Mileage = request.Mileage,
                    EngineSize = request.EngineSize,
                    Cylinders = request.Cylinders,
                    Transmission = request.Transmission,
                    FuelType = request.FuelType,
                    ImportCountry = request.ImportCountry,
                    SeatCount = request.SeatCount,
                    SeatMaterial = request.SeatMaterial,
                    Currency = request.Currency ?? "IQD",
                    Notes = request.Notes,
                    PurchaseCost = request.PurchaseCost,
                    BookValue = request.PurchaseCost, // القيمة الدفترية تبدأ بسعر الشراء
                    TargetSellingPrice = request.TargetSellingPrice,
                    Status = "Available",
                    BranchId = branchId
                };

                _context.Vehicles.Add(vehicle);
                await _context.SaveChangesAsync(cancellationToken);

                // 4. تسجيل تكلفة الشراء التفصيلية
                var detailedCost = new VehicleCost
                {
                    Id = Guid.NewGuid(),
                    VehicleId = vehicle.Id,
                    CostType = "purchase",
                    Amount = request.PurchaseCost,
                    Currency = "USD",
                    Description = "تكلفة الشراء الأساسية للسيارة",
                    CreatedAt = DateTime.UtcNow
                };
                _context.VehicleCosts.Add(detailedCost);
                await _context.SaveChangesAsync(cancellationToken);

                // 5. إنشاء القيد المحاسبي المتوازن لعملية الشراء
                var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                var entryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

                var journalEntry = new JournalEntry
                {
                    Id = Guid.NewGuid(),
                    EntryNumber = entryNumber,
                    EntryDate = DateTime.UtcNow,
                    Description = $"قيد إثبات شراء سيارة - شاصي: {request.ChassisNumber}",
                    IsPosted = true, // ترحيل مباشر
                    BranchId = branchId,
                    ReferenceType = "Vehicle",
                    ReferenceId = vehicle.Id,
                    CreatedBy = _currentUserService.UserId
                };

                // سطر المدين (زيادة المخزون)
                var debitLine = new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = debitAccount.Id,
                    Debit = request.PurchaseCost,
                    Credit = 0,
                    Description = $"زيادة قيمة المخزون بشراء سيارة {request.Model}",
                    VehicleId = vehicle.Id
                };

                // سطر الدائن (المورد أو الصندوق/البنك)
                var creditLine = new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = creditAccount.Id,
                    Debit = 0,
                    Credit = request.PurchaseCost,
                    Description = $"استحقاق/دفع قيمة السيارة {request.Model}",
                    VehicleId = vehicle.Id
                };

                journalEntry.Lines.Add(debitLine);
                journalEntry.Lines.Add(creditLine);

                _context.JournalEntries.Add(journalEntry);
                await _context.SaveChangesAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);
                return vehicle.Id;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync(cancellationToken);
                throw; // تفشل العملية بالكامل
            }
        }
    }
}
