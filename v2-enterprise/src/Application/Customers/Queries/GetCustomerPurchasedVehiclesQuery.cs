using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.Application.Customers.Queries
{
    public class CustomerPurchasedVehicleDto
    {
        public Guid VehicleId { get; set; }
        public Guid SaleContractId { get; set; }
        public string SaleContractNumber { get; set; } = string.Empty;
        public DateTime SaleDate { get; set; }
        public string Make { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string? Trim { get; set; }
        public int Year { get; set; }
        public string? Color { get; set; }
        public string Vin { get; set; } = string.Empty;
        public string ChassisNumber { get; set; } = string.Empty;
        public string? PlateNumber { get; set; }
        public decimal PreviousSalePrice { get; set; }
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string CurrentOwnershipStatus { get; set; } = string.Empty;
        public bool EligibleForBuyback { get; set; }
        public string? IneligibilityReason { get; set; }
    }

    public class GetCustomerPurchasedVehiclesQuery : IRequest<List<CustomerPurchasedVehicleDto>>
    {
        public Guid CustomerId { get; set; }
    }

    public class GetCustomerPurchasedVehiclesQueryHandler : IRequestHandler<GetCustomerPurchasedVehiclesQuery, List<CustomerPurchasedVehicleDto>>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetCustomerPurchasedVehiclesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<List<CustomerPurchasedVehicleDto>> Handle(GetCustomerPurchasedVehiclesQuery request, CancellationToken cancellationToken)
        {
            var userBranchId = _currentUserService.BranchId;

            var branchesMap = await _context.Branches
                .IgnoreQueryFilters()
                .ToDictionaryAsync(b => b.Id, b => b.Name, cancellationToken);

            // 1. جلب عقود المبيعات السابقة للزبون الموفر في الفرع المسموح به
            var contracts = await _context.SalesContracts
                .Include(sc => sc.Vehicle)
                .Where(sc => sc.CustomerId == request.CustomerId && sc.BranchId == userBranchId)
                .OrderByDescending(sc => sc.SaleDate)
                .ToListAsync(cancellationToken);

            if (!contracts.Any())
            {
                return new List<CustomerPurchasedVehicleDto>();
            }

            var vehicleIds = contracts.Select(c => c.VehicleId).Distinct().ToList();

            // 2. جلب جميع المشتريات المرتبطة بهذه السيارات للتحقق مما إذا كان قد تم إعادة شرائها سابقًا
            var activePurchases = await _context.Purchases
                .Where(p => vehicleIds.Contains(p.VehicleId) && p.Status != "Cancelled")
                .ToListAsync(cancellationToken);

            var result = new List<CustomerPurchasedVehicleDto>();

            foreach (var sc in contracts)
            {
                var v = sc.Vehicle;

                string ownershipStatus = "SoldToCustomer";
                bool eligible = true;
                string? reason = null;

                if (sc.Status == "Cancelled")
                {
                    ownershipStatus = "CancelledSale";
                    eligible = false;
                    reason = "عقد البيع ملغى";
                }
                else if (v == null)
                {
                    ownershipStatus = "Unknown";
                    eligible = false;
                    reason = "لا يمكن التحقق من ملكية السيارة";
                }
                else if (v.Status == "Available" || !v.IsSold)
                {
                    ownershipStatus = "InInventory";
                    eligible = false;
                    reason = "السيارة موجودة حالياً في المخزون";
                }
                else
                {
                    // فحص إذا كانت هناك عملية شراء تم تسجيلها لهذه السيارة بعد تاريخ البيع
                    var subsequentPurchase = activePurchases
                        .FirstOrDefault(p => p.VehicleId == v.Id && p.PurchaseDate >= sc.SaleDate);

                    if (subsequentPurchase != null)
                    {
                        ownershipStatus = "AlreadyReacquired";
                        eligible = false;
                        reason = "تم إرجاع السيارة سابقاً إلى المخزون";
                    }
                }

                branchesMap.TryGetValue(sc.BranchId, out var bName);

                result.Add(new CustomerPurchasedVehicleDto
                {
                    VehicleId = sc.VehicleId,
                    SaleContractId = sc.Id,
                    SaleContractNumber = sc.ContractNumber,
                    SaleDate = sc.SaleDate,
                    Make = v?.Brand ?? string.Empty,
                    Model = v?.Model ?? string.Empty,
                    Trim = v?.Trim,
                    Year = v?.Year ?? 0,
                    Color = v?.Color,
                    Vin = v?.ChassisNumber ?? string.Empty,
                    ChassisNumber = v?.ChassisNumber ?? string.Empty,
                    PlateNumber = v?.PlateNumber,
                    PreviousSalePrice = sc.NetPrice,
                    BranchId = sc.BranchId,
                    BranchName = bName ?? string.Empty,
                    CurrentOwnershipStatus = ownershipStatus,
                    EligibleForBuyback = eligible,
                    IneligibilityReason = reason
                });
            }

            return result;
        }
    }
}
