using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    [Route("api/dashboard")]
    public class DashboardController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;

        public DashboardController(IApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetDashboard()
        {
            var now    = DateTime.UtcNow;
            var today  = now.Date;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            // ─── Counts ───────────────────────────────────────────────────────────
            var availableCars  = await _context.Vehicles.CountAsync(v => v.Status == "Available");
            var soldCars       = await _context.Vehicles.CountAsync(v => v.Status == "Sold");
            var customers      = await _context.Customers.CountAsync();
            var salesCount     = await _context.SalesContracts.CountAsync();
            var purchasesCount = await _context.Purchases.CountAsync();

            // ─── Financials ───────────────────────────────────────────────────────
            var totalRevenue     = await _context.SalesContracts.SumAsync(sc => (decimal?)sc.SalePrice) ?? 0m;
            var totalPurchCost   = await _context.Purchases.SumAsync(p  => (decimal?)p.PurchaseCost)   ?? 0m;

            var monthlySalesPaid = await _context.SalesContracts
                .Where(sc => sc.SaleDate >= monthStart)
                .SumAsync(sc => (decimal?)sc.DownPayment) ?? 0m;

            var monthlyPurchPaid = await _context.Purchases
                .Where(p => p.PurchaseDate >= monthStart)
                .SumAsync(p => (decimal?)p.PurchaseCost) ?? 0m;

            var monthlyProfit = monthlySalesPaid - monthlyPurchPaid;
            var carsSoldMonth = await _context.SalesContracts.CountAsync(sc => sc.SaleDate >= monthStart);

            // ─── Inventory value (sum of available vehicles' book value) ──────────
            var inventoryValue = await _context.Vehicles
                .Where(v => v.Status == "Available")
                .SumAsync(v => (decimal?)v.BookValue) ?? 0m;

            // ─── Cashbox balance from journal lines ───────────────────────────────
            decimal cashboxBalance = 0m;
            var cashAccount = await _context.Accounts
                .FirstOrDefaultAsync(a => a.AccountCode == "111001");
            if (cashAccount != null)
            {
                var debits  = await _context.JournalLines.Where(jl => jl.AccountId == cashAccount.Id).SumAsync(jl => (decimal?)jl.Debit)  ?? 0m;
                var credits = await _context.JournalLines.Where(jl => jl.AccountId == cashAccount.Id).SumAsync(jl => (decimal?)jl.Credit) ?? 0m;
                cashboxBalance = debits - credits;
            }

            // ─── Installments summary (computed in memory to avoid complex SQL) ───
            var plans = await _context.InstallmentPlans
                .Include(ip => ip.Installments)
                .ToListAsync();

            var tomorrow  = today.AddDays(1);
            var in2Days   = today.AddDays(2);
            var in7Days   = today.AddDays(7);

            decimal totalReceivables    = 0m;
            decimal overdueAmount       = 0m;
            decimal dueTodayAmount      = 0m;
            decimal dueTomorrowAmount   = 0m;
            decimal dueIn2DaysAmount    = 0m;
            decimal dueIn7DaysAmount    = 0m;
            int     overdueCount        = 0;
            int     dueTodayCount       = 0;
            int     dueTomorrowCount    = 0;
            int     dueIn2DaysCount     = 0;
            int     activeInstallments  = 0;

            foreach (var plan in plans)
            {
                var planPaid      = plan.Installments.Sum(i => i.PaidAmount);
                var planRemaining = Math.Max(0m, plan.TotalPlanAmount - planPaid);
                totalReceivables += planRemaining;

                if (plan.Status != "Completed") activeInstallments++;

                foreach (var inst in plan.Installments.Where(i => i.Status != "Paid"))
                {
                    var rem = inst.Amount - inst.PaidAmount;
                    var isOverdue = inst.Status == "Overdue" || inst.DueDate < today;

                    if (isOverdue)            { overdueAmount     += rem; overdueCount++;     }
                    else if (inst.DueDate.Date == today)    { dueTodayAmount   += rem; dueTodayCount++;   }
                    else if (inst.DueDate.Date == tomorrow) { dueTomorrowAmount+= rem; dueTomorrowCount++;}
                    else if (inst.DueDate.Date == in2Days)  { dueIn2DaysAmount += rem; dueIn2DaysCount++; }
                    else if (inst.DueDate.Date <= in7Days)  { dueIn7DaysAmount += rem; }
                }
            }

            return Ok(new
            {
                available_cars_count  = availableCars,
                sold_cars_count       = soldCars,
                customers_count       = customers,
                sales_count           = salesCount,
                purchases_count       = purchasesCount,
                installments          = activeInstallments,
                cashbox_balance       = cashboxBalance,
                overdue_installments  = overdueCount,
                total_revenue         = totalRevenue,
                total_purchases_paid  = totalPurchCost,
                monthly_sales_paid    = monthlySalesPaid,
                monthly_purchases_paid= monthlyPurchPaid,
                monthly_profit        = monthlyProfit,
                inventory_value       = inventoryValue,
                cars_sold_month       = carsSoldMonth,
                installment_summary = new
                {
                    total_receivables    = totalReceivables,
                    overdue_amount       = overdueAmount,
                    due_today_amount     = dueTodayAmount,
                    due_tomorrow_amount  = dueTomorrowAmount,
                    due_in_2_days_amount = dueIn2DaysAmount,
                    due_in_7_days_amount = dueIn7DaysAmount,
                    overdue_count        = overdueCount,
                    due_today_count      = dueTodayCount,
                    due_tomorrow_count   = dueTomorrowCount,
                    due_in_2_days_count  = dueIn2DaysCount,
                    due_in_7_days_count  = 0
                },
                monthly_summary = new
                {
                    sales_paid     = monthlySalesPaid,
                    purchases_paid = monthlyPurchPaid,
                    profit         = monthlyProfit
                }
            });
        }
    }
}
