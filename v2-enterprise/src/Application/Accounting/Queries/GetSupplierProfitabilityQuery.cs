using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.Application.Accounting.Queries
{
    public class SupplierInfoDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
    }

    public class SupplierProfitabilityPeriodDto
    {
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
    }

    public class SupplierProfitabilitySummaryDto
    {
        public int PurchasedVehicleCount { get; set; }
        public int SoldVehicleCount { get; set; }
        public int UnsoldVehicleCount { get; set; }

        public decimal PurchaseValue { get; set; }
        public decimal RealizedRevenue { get; set; }
        public decimal CostOfSoldVehicles { get; set; }
        public decimal DirectCosts { get; set; }
        public decimal RealizedGrossProfit { get; set; }
        public decimal ProfitMarginPercent { get; set; }
        public decimal MarkupPercent { get; set; }
        public decimal AverageProfitPerSoldVehicle { get; set; }
        public decimal UnsoldInventoryCost { get; set; }
        public decimal AverageDaysToSell { get; set; }
    }

    public class SupplierProfitabilityVehicleDto
    {
        public Guid VehicleId { get; set; }
        public string StockNumber { get; set; } = string.Empty;
        public string Vin { get; set; } = string.Empty;
        public string Brand { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int Year { get; set; }
        public string Trim { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;

        public DateTime PurchaseDate { get; set; }
        public decimal PurchaseCost { get; set; }
        public decimal AdditionalCosts { get; set; }
        public decimal TotalVehicleCost { get; set; }

        public DateTime? SaleDate { get; set; }
        public string SaleNumber { get; set; } = string.Empty;
        public decimal SalePrice { get; set; }
        public decimal Discount { get; set; }
        public decimal NetRevenue { get; set; }
        public decimal RealizedProfit { get; set; }
        public decimal ProfitMarginPercent { get; set; }
        public int DaysToSell { get; set; }
        public string Status { get; set; } = string.Empty; // "Sold", "InStock"
    }

    public class SupplierMonthlyTrendDto
    {
        public string Period { get; set; } = string.Empty; // "yyyy-MM"
        public int SoldCount { get; set; }
        public decimal Revenue { get; set; }
        public decimal Cost { get; set; }
        public decimal Profit { get; set; }
    }

    public class SupplierModelBreakdownDto
    {
        public string Brand { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int SoldCount { get; set; }
        public decimal Revenue { get; set; }
        public decimal Cost { get; set; }
        public decimal Profit { get; set; }
        public decimal MarginPercent { get; set; }
    }

    public class SupplierProfitabilityReportDto
    {
        public SupplierInfoDto Supplier { get; set; } = new();
        public SupplierProfitabilityPeriodDto Period { get; set; } = new();
        public SupplierProfitabilitySummaryDto Summary { get; set; } = new();
        public List<SupplierProfitabilityVehicleDto> Vehicles { get; set; } = new();
        public List<SupplierMonthlyTrendDto> MonthlyTrend { get; set; } = new();
        public List<SupplierModelBreakdownDto> ModelBreakdown { get; set; } = new();
    }

    public class GetSupplierProfitabilityQuery : IRequest<SupplierProfitabilityReportDto>
    {
        public Guid SupplierId { get; set; }
        public DateTime? SaleDateFrom { get; set; }
        public DateTime? SaleDateTo { get; set; }
        public Guid? BranchId { get; set; }
        public string? Brand { get; set; }
        public string? Model { get; set; }
        public int? Year { get; set; }
        public string? Trim { get; set; }
        public string? Status { get; set; } // "all", "sold", "unsold"
    }

    public class GetSupplierProfitabilityQueryHandler : IRequestHandler<GetSupplierProfitabilityQuery, SupplierProfitabilityReportDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetSupplierProfitabilityQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<SupplierProfitabilityReportDto> Handle(GetSupplierProfitabilityQuery request, CancellationToken cancellationToken)
        {
            if (request.SupplierId == Guid.Empty)
            {
                throw new ArgumentException("Supplier ID is required.", nameof(request.SupplierId));
            }

            var supplier = await _context.Suppliers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == request.SupplierId, cancellationToken);

            if (supplier == null)
            {
                throw new KeyNotFoundException($"Supplier with ID {request.SupplierId} was not found.");
            }

            var userBranchId = _currentUserService.BranchId;
            var canSeeAllBranches = _currentUserService.CanSeeAllBranches;

            // Base purchases query linked to this supplier
            var purchasesQuery = _context.Purchases
                .AsNoTracking()
                .Include(p => p.Vehicle)
                .Where(p => p.SupplierId == request.SupplierId && p.Status != "Cancelled");

            if (!canSeeAllBranches)
            {
                purchasesQuery = purchasesQuery.Where(p => p.BranchId == userBranchId);
            }
            else if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            {
                purchasesQuery = purchasesQuery.Where(p => p.BranchId == request.BranchId.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.Brand))
            {
                var brand = request.Brand.Trim();
                purchasesQuery = purchasesQuery.Where(p => p.Vehicle != null && p.Vehicle.Brand == brand);
            }

            if (!string.IsNullOrWhiteSpace(request.Model))
            {
                var model = request.Model.Trim();
                purchasesQuery = purchasesQuery.Where(p => p.Vehicle != null && p.Vehicle.Model == model);
            }

            if (request.Year.HasValue && request.Year.Value > 1900)
            {
                purchasesQuery = purchasesQuery.Where(p => p.Vehicle != null && p.Vehicle.Year == request.Year.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.Trim))
            {
                var trim = request.Trim.Trim();
                purchasesQuery = purchasesQuery.Where(p => p.Vehicle != null && p.Vehicle.Trim == trim);
            }

            var purchases = await purchasesQuery.ToListAsync(cancellationToken);

            var vehicleIds = purchases.Select(p => p.VehicleId).Distinct().ToList();

            // Fetch active sales contracts for these vehicles
            var salesContracts = await _context.SalesContracts
                .AsNoTracking()
                .Where(s => vehicleIds.Contains(s.VehicleId) && s.Status != "Cancelled")
                .ToDictionaryAsync(s => s.VehicleId, cancellationToken);

            // Fetch branches lookup for branch names
            var branches = await _context.Branches
                .AsNoTracking()
                .ToDictionaryAsync(b => b.Id, b => b.Name, cancellationToken);

            var vehicleDtos = new List<SupplierProfitabilityVehicleDto>();

            foreach (var p in purchases)
            {
                var v = p.Vehicle;
                if (v == null) continue;

                salesContracts.TryGetValue(v.Id, out var sale);

                bool isSold = sale != null;

                // Date filtering by SaleDate applies to sold vehicles
                if (isSold && request.SaleDateFrom.HasValue && sale!.SaleDate < request.SaleDateFrom.Value)
                {
                    continue;
                }
                if (isSold && request.SaleDateTo.HasValue && sale!.SaleDate > request.SaleDateTo.Value)
                {
                    continue;
                }

                var statusStr = isSold ? "Sold" : "InStock";

                if (!string.IsNullOrWhiteSpace(request.Status) && request.Status != "all")
                {
                    if (request.Status.Equals("sold", StringComparison.OrdinalIgnoreCase) && !isSold) continue;
                    if (request.Status.Equals("unsold", StringComparison.OrdinalIgnoreCase) && isSold) continue;
                }

                branches.TryGetValue(p.BranchId, out var branchName);

                decimal purchaseCost = p.PurchaseCost > 0 ? p.PurchaseCost : v.PurchaseCost;
                decimal additionalCosts = v.CustomDuties + v.MaintenanceCost;
                decimal totalVehicleCost = purchaseCost + additionalCosts;

                decimal salePrice = isSold ? sale!.SalePrice : 0m;
                decimal discount = isSold ? sale!.Discount : 0m;
                decimal netRevenue = isSold ? sale!.NetPrice : 0m;
                decimal realizedProfit = isSold ? netRevenue - totalVehicleCost : 0m;
                decimal profitMarginPercent = (isSold && netRevenue > 0) ? Math.Round((realizedProfit / netRevenue) * 100m, 2) : 0m;
                int daysToSell = isSold ? Math.Max(0, (sale!.SaleDate - p.PurchaseDate).Days) : Math.Max(0, (DateTime.UtcNow - p.PurchaseDate).Days);

                vehicleDtos.Add(new SupplierProfitabilityVehicleDto
                {
                    VehicleId = v.Id,
                    StockNumber = p.PurchaseNumber,
                    Vin = v.ChassisNumber,
                    Brand = v.Brand ?? string.Empty,
                    Model = v.Model,
                    Year = v.Year,
                    Trim = v.Trim ?? string.Empty,
                    BranchName = branchName ?? "الفرع الرئيسي",
                    PurchaseDate = p.PurchaseDate,
                    PurchaseCost = purchaseCost,
                    AdditionalCosts = additionalCosts,
                    TotalVehicleCost = totalVehicleCost,
                    SaleDate = isSold ? sale!.SaleDate : null,
                    SaleNumber = isSold ? sale!.ContractNumber : string.Empty,
                    SalePrice = salePrice,
                    Discount = discount,
                    NetRevenue = netRevenue,
                    RealizedProfit = realizedProfit,
                    ProfitMarginPercent = profitMarginPercent,
                    DaysToSell = daysToSell,
                    Status = statusStr
                });
            }

            // Summary calculation
            var soldVehicles = vehicleDtos.Where(v => v.Status == "Sold").ToList();
            var unsoldVehicles = vehicleDtos.Where(v => v.Status == "InStock").ToList();

            decimal costOfSold = soldVehicles.Sum(v => v.TotalVehicleCost);
            decimal directCostsSold = soldVehicles.Sum(v => v.AdditionalCosts);
            decimal realizedRevenue = soldVehicles.Sum(v => v.NetRevenue);
            decimal realizedProfitSum = realizedRevenue - costOfSold;
            decimal unsoldCost = unsoldVehicles.Sum(v => v.TotalVehicleCost);
            decimal purchaseValueSum = costOfSold + unsoldCost;

            int soldCount = soldVehicles.Count;
            int unsoldCount = unsoldVehicles.Count;

            decimal marginPercent = realizedRevenue > 0 ? Math.Round((realizedProfitSum / realizedRevenue) * 100m, 2) : 0m;
            decimal markupPercent = costOfSold > 0 ? Math.Round((realizedProfitSum / costOfSold) * 100m, 2) : 0m;
            decimal avgProfitPerCar = soldCount > 0 ? Math.Round(realizedProfitSum / soldCount, 2) : 0m;
            decimal avgDaysToSell = soldCount > 0 ? Math.Round((decimal)soldVehicles.Sum(v => v.DaysToSell) / soldCount, 1) : 0m;

            // Monthly Trend
            var monthlyTrend = soldVehicles
                .Where(v => v.SaleDate.HasValue)
                .GroupBy(v => v.SaleDate!.Value.ToString("yyyy-MM"))
                .OrderBy(g => g.Key)
                .Select(g => new SupplierMonthlyTrendDto
                {
                    Period = g.Key,
                    SoldCount = g.Count(),
                    Revenue = g.Sum(v => v.NetRevenue),
                    Cost = g.Sum(v => v.TotalVehicleCost),
                    Profit = g.Sum(v => v.RealizedProfit)
                })
                .ToList();

            // Model Breakdown
            var modelBreakdown = soldVehicles
                .GroupBy(v => new { v.Brand, v.Model })
                .OrderByDescending(g => g.Sum(v => v.RealizedProfit))
                .Select(g =>
                {
                    var rev = g.Sum(v => v.NetRevenue);
                    var prof = g.Sum(v => v.RealizedProfit);
                    return new SupplierModelBreakdownDto
                    {
                        Brand = g.Key.Brand,
                        Model = g.Key.Model,
                        SoldCount = g.Count(),
                        Revenue = rev,
                        Cost = g.Sum(v => v.TotalVehicleCost),
                        Profit = prof,
                        MarginPercent = rev > 0 ? Math.Round((prof / rev) * 100m, 2) : 0m
                    };
                })
                .ToList();

            return new SupplierProfitabilityReportDto
            {
                Supplier = new SupplierInfoDto
                {
                    Id = supplier.Id,
                    Name = supplier.Name,
                    Code = supplier.Code,
                    Phone = supplier.Phone ?? string.Empty
                },
                Period = new SupplierProfitabilityPeriodDto
                {
                    DateFrom = request.SaleDateFrom,
                    DateTo = request.SaleDateTo
                },
                Summary = new SupplierProfitabilitySummaryDto
                {
                    PurchasedVehicleCount = vehicleDtos.Count,
                    SoldVehicleCount = soldCount,
                    UnsoldVehicleCount = unsoldCount,
                    PurchaseValue = purchaseValueSum,
                    RealizedRevenue = realizedRevenue,
                    CostOfSoldVehicles = costOfSold,
                    DirectCosts = directCostsSold,
                    RealizedGrossProfit = realizedProfitSum,
                    ProfitMarginPercent = marginPercent,
                    MarkupPercent = markupPercent,
                    AverageProfitPerSoldVehicle = avgProfitPerCar,
                    UnsoldInventoryCost = unsoldCost,
                    AverageDaysToSell = avgDaysToSell
                },
                Vehicles = vehicleDtos.OrderByDescending(v => v.SaleDate ?? v.PurchaseDate).ToList(),
                MonthlyTrend = monthlyTrend,
                ModelBreakdown = modelBreakdown
            };
        }
    }
}
