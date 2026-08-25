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
            var now        = DateTime.UtcNow;
            var today      = now.Date;
            var tomorrow   = today.AddDays(1);
            var in2Days    = today.AddDays(2);
            var in7Days    = today.AddDays(7);
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            // ── ١: حالة المخزون في query واحدة ──────────────────────────────────────
            var vehicleStats = await _context.Vehicles
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Available = g.Count(v => v.Status == "Available"),
                    Sold      = g.Count(v => v.Status == "Sold"),
                    InvValue  = g.Where(v => v.Status == "Available").Sum(v => (decimal?)v.BookValue) ?? 0m,
                })
                .FirstOrDefaultAsync();

            // ── ٢: الأعداد العامة ────────────────────────────────────────────────────
            var customers      = await _context.Customers.CountAsync();
            var salesCount     = await _context.SalesContracts.CountAsync();
            var purchasesCount = await _context.Purchases.CountAsync();
            var totalRevenue   = await _context.SalesContracts.SumAsync(sc => (decimal?)sc.SalePrice) ?? 0m;
            var totalPurchCost = await _context.Purchases.SumAsync(p  => (decimal?)p.PurchaseCost)   ?? 0m;

            // ── ٣: مبيعات ومشتريات الشهر الحالي في query واحدة لكل منهما ───────────
            var monthlySales = await _context.SalesContracts
                .Where(sc => sc.SaleDate >= monthStart)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Paid  = g.Sum(sc => (decimal?)sc.DownPayment) ?? 0m,
                    Count = g.Count(),
                })
                .FirstOrDefaultAsync();

            var monthlyPurchPaid = await _context.Purchases
                .Where(p => p.PurchaseDate >= monthStart)
                .SumAsync(p => (decimal?)p.PurchaseCost) ?? 0m;

            // ── ٤: ملخص الأقساط — حسابات SQL مباشرة بدل تحميل كل البيانات ──────────
            var overdueStats = await _context.Installments
                .Where(i => i.Status != "Paid" && (i.Status == "Overdue" || i.DueDate < today))
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Count  = g.Count(),
                    Amount = g.Sum(i => (decimal?)(i.Amount - i.PaidAmount)) ?? 0m,
                })
                .FirstOrDefaultAsync();

            var dueTodayStats = await _context.Installments
                .Where(i => i.Status != "Paid" && i.DueDate.Date == today)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Count  = g.Count(),
                    Amount = g.Sum(i => (decimal?)(i.Amount - i.PaidAmount)) ?? 0m,
                })
                .FirstOrDefaultAsync();

            var dueTomorrowStats = await _context.Installments
                .Where(i => i.Status != "Paid" && i.DueDate.Date == tomorrow)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Count  = g.Count(),
                    Amount = g.Sum(i => (decimal?)(i.Amount - i.PaidAmount)) ?? 0m,
                })
                .FirstOrDefaultAsync();

            var dueIn2DaysStats = await _context.Installments
                .Where(i => i.Status != "Paid" && i.DueDate.Date == in2Days)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Count  = g.Count(),
                    Amount = g.Sum(i => (decimal?)(i.Amount - i.PaidAmount)) ?? 0m,
                })
                .FirstOrDefaultAsync();

            var dueIn7DaysAmount = await _context.Installments
                .Where(i => i.Status != "Paid" && i.DueDate.Date > in2Days && i.DueDate.Date <= in7Days)
                .SumAsync(i => (decimal?)(i.Amount - i.PaidAmount)) ?? 0m;

            // المستحقات = إجمالي كل خطة مطروحاً منها ما تم دفعه فعلياً
            var totalReceivables = await _context.InstallmentPlans
                .Where(ip => ip.Status != "Completed")
                .Select(ip => ip.TotalPlanAmount - ip.Installments.Sum(i => (decimal?)i.PaidAmount ?? 0m))
                .SumAsync(r => (decimal?)r) ?? 0m;
            var activeInstallments = await _context.InstallmentPlans.CountAsync(ip => ip.Status != "Completed");

            // ── ٥: رصيد الصندوق ───────────────────────────────────────────────────────
            decimal cashboxBalance = 0m;
            var cashAccountId = await _context.Accounts
                .Where(a => a.AccountCode == "111001")
                .Select(a => a.Id)
                .FirstOrDefaultAsync();

            if (cashAccountId != default)
            {
                var debits  = await _context.JournalLines.Where(jl => jl.AccountId == cashAccountId).SumAsync(jl => (decimal?)jl.Debit)  ?? 0m;
                var credits = await _context.JournalLines.Where(jl => jl.AccountId == cashAccountId).SumAsync(jl => (decimal?)jl.Credit) ?? 0m;
                cashboxBalance = debits - credits;
            }

            var monthlySalesPaid = monthlySales?.Paid  ?? 0m;
            var carsSoldMonth    = monthlySales?.Count ?? 0;
            var monthlyProfit    = monthlySalesPaid - monthlyPurchPaid;

            return Ok(new
            {
                available_cars_count   = vehicleStats?.Available  ?? 0,
                sold_cars_count        = vehicleStats?.Sold        ?? 0,
                customers_count        = customers,
                sales_count            = salesCount,
                purchases_count        = purchasesCount,
                installments           = activeInstallments,
                cashbox_balance        = cashboxBalance,
                overdue_installments   = overdueStats?.Count  ?? 0,
                total_revenue          = totalRevenue,
                total_purchases_paid   = totalPurchCost,
                monthly_sales_paid     = monthlySalesPaid,
                monthly_purchases_paid = monthlyPurchPaid,
                monthly_profit         = monthlyProfit,
                inventory_value        = vehicleStats?.InvValue ?? 0m,
                cars_sold_month        = carsSoldMonth,
                installment_summary = new
                {
                    total_receivables    = totalReceivables,
                    overdue_amount       = overdueStats?.Amount    ?? 0m,
                    due_today_amount     = dueTodayStats?.Amount   ?? 0m,
                    due_tomorrow_amount  = dueTomorrowStats?.Amount ?? 0m,
                    due_in_2_days_amount = dueIn2DaysStats?.Amount  ?? 0m,
                    due_in_7_days_amount = dueIn7DaysAmount,
                    overdue_count        = overdueStats?.Count    ?? 0,
                    due_today_count      = dueTodayStats?.Count   ?? 0,
                    due_tomorrow_count   = dueTomorrowStats?.Count ?? 0,
                    due_in_2_days_count  = dueIn2DaysStats?.Count  ?? 0,
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
