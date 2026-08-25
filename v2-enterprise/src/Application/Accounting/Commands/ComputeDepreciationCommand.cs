using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Common.Helpers;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Application.Accounting.Commands
{
    public class ComputeDepreciationCommand : IRequest<ComputeDepreciationResult>
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public decimal AnnualRatePercent { get; set; } = 20m; // معدل الإهلاك السنوي الافتراضي 20%
    }

    public class ComputeDepreciationResult
    {
        public int EntriesCreated { get; set; }
        public decimal TotalDepreciation { get; set; }
        public List<DepreciationVehicleRow> Vehicles { get; set; } = new();
    }

    public class DepreciationVehicleRow
    {
        public Guid VehicleId { get; set; }
        public string VehicleName { get; set; } = string.Empty;
        public string ChassisNumber { get; set; } = string.Empty;
        public decimal BookValueBefore { get; set; }
        public decimal DepreciationAmount { get; set; }
        public decimal BookValueAfter { get; set; }
    }

    public class ComputeDepreciationCommandHandler : IRequestHandler<ComputeDepreciationCommand, ComputeDepreciationResult>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ComputeDepreciationCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<ComputeDepreciationResult> Handle(ComputeDepreciationCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // التحقق من عدم تكرار الإهلاك لنفس الفترة
            var periodTag = $"DEP-{request.Year:D4}-{request.Month:D2}";
            var alreadyRun = await _context.JournalEntries
                .IgnoreQueryFilters()
                .AnyAsync(e => e.BranchId == branchId
                    && e.ReferenceType == "Depreciation"
                    && e.EntryNumber.StartsWith(periodTag), cancellationToken);
            if (alreadyRun)
                throw new InvalidOperationException($"تم احتساب إهلاك {request.Month}/{request.Year} مسبقاً.");

            // حساب مصروف الإهلاك وحساب مجمع الإهلاك
            var depExpenseAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.BranchId == branchId
                    && (a.AccountCode == "515001" || a.Name.Contains("مصروف الإهلاك") || a.Name.Contains("اهلاك")), cancellationToken);

            var accumDepAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.BranchId == branchId
                    && (a.AccountCode == "121001" || a.Name.Contains("مجمع الإهلاك") || a.Name.Contains("مجمع اهلاك")), cancellationToken);

            if (depExpenseAccount == null)
                throw new InvalidOperationException("حساب مصروف الإهلاك غير موجود (515001). أنشئه في دليل الحسابات.");
            if (accumDepAccount == null)
                throw new InvalidOperationException("حساب مجمع الإهلاك غير موجود (121001). أنشئه في دليل الحسابات.");

            // جلب السيارات المتاحة بقيمة دفترية موجبة
            var vehicles = await _context.Vehicles
                .IgnoreQueryFilters()
                .Where(v => v.BranchId == branchId && v.BookValue > 0 && v.Status != "Sold" && !v.IsSold)
                .ToListAsync(cancellationToken);

            if (!vehicles.Any())
                return new ComputeDepreciationResult { EntriesCreated = 0, TotalDepreciation = 0 };

            var monthlyRate = request.AnnualRatePercent / 100m / 12m;
            var result = new ComputeDepreciationResult();
            var dbContext = _context as Microsoft.EntityFrameworkCore.DbContext
                ?? throw new InvalidOperationException("Invalid DbContext");

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                int entrySeq = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                foreach (var vehicle in vehicles)
                {
                    var depAmount = AccountingAmount.RoundMoney(vehicle.BookValue * monthlyRate);
                    if (depAmount <= 0) continue;

                    entrySeq++;
                    var entryNumber = $"{periodTag}-{entrySeq:D5}";
                    var vehicleName = $"{vehicle.Brand} {vehicle.Model} {vehicle.Year}".Trim();

                    var entry = new JournalEntry
                    {
                        Id = Guid.NewGuid(),
                        EntryNumber = entryNumber,
                        EntryDate = new DateTime(request.Year, request.Month, DateTime.DaysInMonth(request.Year, request.Month), 23, 59, 59, DateTimeKind.Utc),
                        Description = $"إهلاك شهري للسيارة: {vehicleName} - شاصي: {vehicle.ChassisNumber} - {request.Month}/{request.Year}",
                        IsPosted = true,
                        BranchId = branchId,
                        ReferenceType = "Depreciation",
                        ReferenceId = vehicle.Id,
                        CreatedBy = _currentUserService.UserId
                    };

                    entry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = entry.Id,
                        AccountId = depExpenseAccount.Id,
                        Debit = depAmount,
                        Credit = 0,
                        Description = $"مصروف إهلاك: {vehicleName}"
                    });
                    entry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = entry.Id,
                        AccountId = accumDepAccount.Id,
                        Debit = 0,
                        Credit = depAmount,
                        Description = $"مجمع إهلاك: {vehicleName}"
                    });

                    _context.JournalEntries.Add(entry);

                    result.Vehicles.Add(new DepreciationVehicleRow
                    {
                        VehicleId = vehicle.Id,
                        VehicleName = vehicleName,
                        ChassisNumber = vehicle.ChassisNumber,
                        BookValueBefore = vehicle.BookValue,
                        DepreciationAmount = depAmount,
                        BookValueAfter = vehicle.BookValue - depAmount
                    });

                    vehicle.BookValue = AccountingAmount.RoundMoney(vehicle.BookValue - depAmount);
                    if (vehicle.BookValue < 0) vehicle.BookValue = 0;

                    result.TotalDepreciation += depAmount;
                    result.EntriesCreated++;
                }

                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }

            return result;
        }
    }
}
