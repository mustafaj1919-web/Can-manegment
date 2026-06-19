using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    [Route("api/reports")]
    public class ReportsController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;

        public ReportsController(IApplicationDbContext context)
        {
            _context = context;
        }

        // GET /api/reports/monthly-profit?months=6
        [HttpGet("monthly-profit")]
        public async Task<IActionResult> GetMonthlyProfit([FromQuery] int months = 12)
        {
            if (months < 1 || months > 36) months = 12;

            var now        = DateTime.UtcNow;
            var rangeStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc)
                                 .AddMonths(-(months - 1));

            // جلب عقود البيع النشطة في النطاق الزمني
            var sales = await _context.SalesContracts
                .Where(sc => sc.SaleDate >= rangeStart && sc.Status != "Cancelled")
                .Select(sc => new
                {
                    sc.SaleDate,
                    sc.SalePrice,
                    sc.Profit
                })
                .ToListAsync();

            // جلب المشتريات في النطاق الزمني
            var purchases = await _context.Purchases
                .Where(p => p.PurchaseDate >= rangeStart && p.Status != "Cancelled")
                .Select(p => new { p.PurchaseDate, p.PurchaseCost })
                .ToListAsync();

            // بناء صفوف الأشهر
            var rows = new List<object>();

            for (int i = months - 1; i >= 0; i--)
            {
                var monthDate  = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-i);
                var monthStart = monthDate;
                var monthEnd   = monthDate.AddMonths(1);
                var monthKey   = monthDate.ToString("yyyy-MM");

                var monthSales = sales
                    .Where(s => s.SaleDate >= monthStart && s.SaleDate < monthEnd)
                    .ToList();

                var monthPurchases = purchases
                    .Where(p => p.PurchaseDate >= monthStart && p.PurchaseDate < monthEnd)
                    .ToList();

                var revenue      = monthSales.Sum(s => s.SalePrice);
                var cost         = monthPurchases.Sum(p => p.PurchaseCost);
                var grossProfit  = monthSales.Sum(s => s.Profit);
                var salesCount   = monthSales.Count;

                rows.Add(new
                {
                    month       = monthKey,
                    label       = GetArabicMonthLabel(monthDate),
                    sales_count = salesCount,
                    revenue,
                    cost,
                    expenses    = 0m,
                    gross_profit = grossProfit,
                    net_profit   = grossProfit
                });
            }

            var totals = new
            {
                revenue      = sales.Sum(s => s.SalePrice),
                cost         = purchases.Sum(p => p.PurchaseCost),
                expenses     = 0m,
                gross_profit = sales.Sum(s => s.Profit),
                net_profit   = sales.Sum(s => s.Profit),
                sales_count  = sales.Count
            };

            return Ok(new { months = rows, totals });
        }

        // مقارنة الشهر الحالي بالشهر الماضي (لودجت لوحة التحكم)
        [HttpGet("mom-comparison")]
        public async Task<IActionResult> GetMomComparison()
        {
            var now = DateTime.UtcNow;
            var thisStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var lastStart = thisStart.AddMonths(-1);

            var sales = await _context.SalesContracts
                .Where(sc => sc.SaleDate >= lastStart && sc.Status != "Cancelled")
                .Select(sc => new { sc.SaleDate, sc.NetPrice, sc.Profit, sc.DownPayment })
                .ToListAsync();
            var expenses = await _context.Expenses
                .Where(e => e.ExpenseDate >= lastStart)
                .Select(e => new { e.ExpenseDate, e.Amount })
                .ToListAsync();

            object Build(string label, DateTime start, DateTime end)
            {
                var s = sales.Where(x => x.SaleDate >= start && x.SaleDate < end).ToList();
                var exp = expenses.Where(x => x.ExpenseDate >= start && x.ExpenseDate < end).Sum(x => x.Amount);
                var gross = s.Sum(x => x.Profit);
                return new
                {
                    label, sales_count = s.Count, revenue = s.Sum(x => x.NetPrice),
                    cost = s.Sum(x => x.NetPrice - x.Profit), expenses = exp,
                    gross_profit = gross, net_profit = gross - exp, cash_in = s.Sum(x => x.DownPayment)
                };
            }

            dynamic tm = Build(GetArabicMonthLabel(thisStart), thisStart, thisStart.AddMonths(1));
            dynamic lm = Build(GetArabicMonthLabel(lastStart), lastStart, thisStart);

            double? Pct(decimal cur, decimal prev) => prev != 0 ? (double?)Math.Round((double)((cur - prev) / Math.Abs(prev)) * 100, 1) : null;
            var changes = new Dictionary<string, double?>
            {
                ["sales_count"] = Pct(tm.sales_count, lm.sales_count),
                ["revenue"] = Pct(tm.revenue, lm.revenue),
                ["gross_profit"] = Pct(tm.gross_profit, lm.gross_profit),
                ["expenses"] = Pct(tm.expenses, lm.expenses),
                ["net_profit"] = Pct(tm.net_profit, lm.net_profit),
                ["cash_in"] = Pct(tm.cash_in, lm.cash_in),
            };
            return Ok(new { this_month = tm, last_month = lm, changes });
        }

        private static string GetArabicMonthLabel(DateTime date)
        {
            string[] arabicMonths =
            {
                "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
                "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
            };
            return $"{arabicMonths[date.Month - 1]} {date.Year}";
        }
    }
}
