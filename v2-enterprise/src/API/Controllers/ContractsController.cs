using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    public class ContractsController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ContractsController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<IActionResult> GetContracts(
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 25,
            [FromQuery] string? status = null,
            [FromQuery] string? search = null)
        {
            if (page < 1) page = 1;
            if (per_page < 1 || per_page > 100) per_page = 25;

            var branchId = _currentUserService.BranchId;

            var query = _context.SalesContracts
                .Include(sc => sc.Customer)
                .Include(sc => sc.Vehicle)
                .Include(sc => sc.InstallmentPlan)
                    .ThenInclude(ip => ip!.Installments)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                if (status == "active")
                    query = query.Where(sc => sc.Status == "Active" && sc.InstallmentPlan != null && sc.InstallmentPlan.Status == "Active");
                else if (status == "paid")
                    query = query.Where(sc => sc.Status == "Active" && sc.InstallmentPlan != null && sc.InstallmentPlan.Status == "Completed");
                else if (status == "cancelled")
                    query = query.Where(sc => sc.Status == "Cancelled");
            }

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(sc => sc.ContractNumber.Contains(search) || 
                                          (sc.Customer != null && sc.Customer.Name.Contains(search)) ||
                                          (sc.Vehicle != null && (sc.Vehicle.Model.Contains(search) || sc.Vehicle.ChassisNumber.Contains(search))));
            }

            var total = await query.CountAsync();
            var itemsList = await query
                .OrderByDescending(sc => sc.SaleDate)
                .Skip((page - 1) * per_page)
                .Take(per_page)
                .ToListAsync();

            var items = itemsList.Select(sc => {
                var plan = sc.InstallmentPlan;
                var vehicle = sc.Vehicle;
                var customer = sc.Customer;

                var totalPlanAmount = plan?.TotalPlanAmount ?? sc.RemainingBalance;
                var planPaid = plan?.Installments.Where(i => i.Status == "Paid").Sum(i => i.PaidAmount) ?? 0;
                var planRemaining = Math.Max(0, totalPlanAmount - planPaid);

                return new
                {
                    sale_id = sc.Id,
                    plan_id = plan?.Id,
                    invoice_number = sc.ContractNumber,
                    sale_date = sc.SaleDate.ToString("yyyy-MM-dd"),
                    car = vehicle != null ? $"{vehicle.Model} {vehicle.Year}" : "سيارة غير معروفة",
                    customer_name = customer != null ? (customer.FullName ?? customer.Name) : "عميل غير معروف",
                    customer_id = sc.CustomerId,
                    selling_price = sc.SalePrice,
                    currency = sc.Currency ?? (vehicle != null ? vehicle.Currency : "IQD"),
                    paid_amount = sc.DownPayment + planPaid,
                    remaining_amount = planRemaining,
                    number_of_months = plan?.InstallmentPeriodMonths,
                    installment_amount = plan?.MonthlyInstallmentAmount,
                    installment_start_date = plan?.CreatedAt.ToString("yyyy-MM-dd"),
                    sale_status = sc.Status,
                    plan_status = plan?.Status
                };
            }).ToList();

            return Ok(new
            {
                total,
                page,
                per_page,
                items
            });
        }
    }
}
