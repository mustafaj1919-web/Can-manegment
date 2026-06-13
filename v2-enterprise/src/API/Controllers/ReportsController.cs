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
