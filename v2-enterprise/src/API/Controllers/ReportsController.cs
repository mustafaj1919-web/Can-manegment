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
        private readonly ICurrentUserService _currentUserService;

        public ReportsController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
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

        // GET /api/reports/kpi
        [HttpGet("kpi")]
        public async Task<IActionResult> GetKpiDashboard()
        {
            var branchId = _currentUserService.BranchId;
            var now = DateTime.UtcNow;
            var todayStart = now.Date.ToUniversalTime();
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var lastMonthStart = monthStart.AddMonths(-1);

            // ─── مبيعات اليوم ───
            var todaySales = await _context.SalesContracts.IgnoreQueryFilters()
                .Where(s => s.BranchId == branchId && s.SaleDate >= todayStart && s.Status != "Cancelled")
                .ToListAsync();
            var todaySalesRevenue = todaySales.Sum(s => s.SalePrice);
            var todaySalesCount = todaySales.Count;

            // ─── مبيعات هذا الشهر ───
            var monthSales = await _context.SalesContracts.IgnoreQueryFilters()
                .Where(s => s.BranchId == branchId && s.SaleDate >= monthStart && s.Status != "Cancelled")
                .ToListAsync();
            var monthSalesRevenue = monthSales.Sum(s => s.SalePrice);
            var monthSalesCount = monthSales.Count;
            var monthGrossProfit = monthSales.Sum(s => s.Profit);
            var monthProfitMargin = monthSalesRevenue > 0 ? Math.Round(monthGrossProfit / monthSalesRevenue * 100, 1) : 0;

            // ─── مبيعات الشهر الماضي ───
            var lastMonthSalesRevenue = await _context.SalesContracts.IgnoreQueryFilters()
                .Where(s => s.BranchId == branchId && s.SaleDate >= lastMonthStart && s.SaleDate < monthStart && s.Status != "Cancelled")
                .SumAsync(s => s.SalePrice);

            // ─── الرصيد النقدي الحالي ───
            var cashAccount = await _context.Accounts.IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "111001" && a.BranchId == branchId);
            var cashBalance = cashAccount != null
                ? await _context.JournalLines.Where(l => l.AccountId == cashAccount.Id).SumAsync(l => l.Debit - l.Credit)
                : 0;

            var bankAccount = await _context.Accounts.IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "112001" && a.BranchId == branchId);
            var bankBalance = bankAccount != null
                ? await _context.JournalLines.Where(l => l.AccountId == bankAccount.Id).SumAsync(l => l.Debit - l.Credit)
                : 0;

            // ─── الأقساط المتأخرة ───
            var overdueCount = await _context.Installments.IgnoreQueryFilters()
                .Where(i => i.BranchId == branchId && (i.Status == "Pending" || i.Status == "PartiallyPaid") && i.DueDate < now)
                .CountAsync();
            var overdueAmount = await _context.Installments.IgnoreQueryFilters()
                .Where(i => i.BranchId == branchId && (i.Status == "Pending" || i.Status == "PartiallyPaid") && i.DueDate < now)
                .SumAsync(i => i.Amount - i.PaidAmount);

            // ─── الأقساط المستحقة اليوم ───
            var dueTodayCount = await _context.Installments.IgnoreQueryFilters()
                .Where(i => i.BranchId == branchId && (i.Status == "Pending" || i.Status == "PartiallyPaid")
                    && i.DueDate >= todayStart && i.DueDate < todayStart.AddDays(1))
                .CountAsync();

            // ─── المصاريف هذا الشهر ───
            var expenseAccounts = await _context.Accounts.IgnoreQueryFilters()
                .Where(a => a.BranchId == branchId && a.Type == CarShowroomManagementV2.Domain.Enums.AccountType.Expense && a.IsActive)
                .Select(a => a.Id).ToListAsync();
            var monthExpenses = expenseAccounts.Any()
                ? await _context.JournalLines.Include(l => l.JournalEntry)
                    .Where(l => expenseAccounts.Contains(l.AccountId)
                        && l.JournalEntry != null && l.JournalEntry.IsPosted
                        && l.JournalEntry.BranchId == branchId
                        && l.JournalEntry.EntryDate >= monthStart)
                    .SumAsync(l => l.Debit - l.Credit)
                : 0;

            // ─── الموردون غير المسددون ───
            var unpaidSuppliersCount = await _context.Purchases.IgnoreQueryFilters()
                .Where(p => p.BranchId == branchId && p.Status == "Active" && p.AmountPaid < p.PurchaseCost)
                .CountAsync();
            var unpaidSuppliersAmount = await _context.Purchases.IgnoreQueryFilters()
                .Where(p => p.BranchId == branchId && p.Status == "Active" && p.AmountPaid < p.PurchaseCost)
                .SumAsync(p => p.PurchaseCost - p.AmountPaid);

            // ─── المخزون الحالي ───
            var inventoryCount = await _context.Vehicles.IgnoreQueryFilters()
                .Where(v => v.BranchId == branchId && v.Status == "Available" && !v.IsSold)
                .CountAsync();

            var revenueChangePct = lastMonthSalesRevenue > 0
                ? Math.Round((monthSalesRevenue - lastMonthSalesRevenue) / lastMonthSalesRevenue * 100, 1)
                : 0;

            return Ok(new {
                success = true,
                generated_at = now,
                today = new {
                    sales_count = todaySalesCount,
                    sales_revenue = todaySalesRevenue,
                    due_installments_count = dueTodayCount
                },
                this_month = new {
                    sales_count = monthSalesCount,
                    sales_revenue = monthSalesRevenue,
                    gross_profit = monthGrossProfit,
                    profit_margin_pct = monthProfitMargin,
                    expenses = monthExpenses,
                    revenue_vs_last_month_pct = revenueChangePct
                },
                balances = new {
                    cash = cashBalance,
                    bank = bankBalance,
                    total_liquid = cashBalance + bankBalance,
                    inventory_count = inventoryCount
                },
                alerts = new {
                    overdue_installments_count = overdueCount,
                    overdue_installments_amount = overdueAmount,
                    unpaid_suppliers_count = unpaidSuppliersCount,
                    unpaid_suppliers_amount = unpaidSuppliersAmount
                }
            });
        }

        // GET /api/reports/export/trial-balance
        [HttpGet("export/trial-balance")]
        public async Task<IActionResult> ExportTrialBalance()
        {
            var branchId = _currentUserService.BranchId;
            var accounts = await _context.Accounts.IgnoreQueryFilters()
                .Where(a => a.BranchId == branchId && a.IsActive)
                .OrderBy(a => a.AccountCode)
                .ToListAsync();

            var sb = new System.Text.StringBuilder();
            sb.AppendLine("كود الحساب,اسم الحساب,النوع,مدين,دائن,الرصيد");

            decimal totalDebit = 0, totalCredit = 0;
            foreach (var acc in accounts)
            {
                var debit = await _context.JournalLines
                    .Where(l => l.AccountId == acc.Id).SumAsync(l => l.Debit);
                var credit = await _context.JournalLines
                    .Where(l => l.AccountId == acc.Id).SumAsync(l => l.Credit);
                var balance = debit - credit;
                totalDebit += debit;
                totalCredit += credit;
                sb.AppendLine($"{acc.AccountCode},{acc.Name},{acc.Type},{debit:F2},{credit:F2},{balance:F2}");
            }
            sb.AppendLine($"الإجمالي,,, {totalDebit:F2},{totalCredit:F2},{totalDebit - totalCredit:F2}");

            var bytes = System.Text.Encoding.UTF8.GetPreamble().Concat(System.Text.Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
            return File(bytes, "text/csv; charset=utf-8", $"trial-balance-{DateTime.UtcNow:yyyyMMdd}.csv");
        }

        // GET /api/reports/export/installment-aging
        [HttpGet("export/installment-aging")]
        public async Task<IActionResult> ExportInstallmentAging()
        {
            var branchId = _currentUserService.BranchId;
            var now = DateTime.UtcNow;

            var installments = await _context.Installments
                .IgnoreQueryFilters()
                .Include(i => i.InstallmentPlan)
                    .ThenInclude(p => p!.SalesContract)
                        .ThenInclude(sc => sc!.Customer)
                .Where(i => i.BranchId == branchId && (i.Status == "Pending" || i.Status == "PartiallyPaid" || i.Status == "Overdue"))
                .OrderBy(i => i.DueDate)
                .ToListAsync();

            var sb = new System.Text.StringBuilder();
            sb.AppendLine("العميل,رقم القسط,تاريخ الاستحقاق,المبلغ,المدفوع,المتبقي,الحالة,أيام التأخير");

            foreach (var inst in installments)
            {
                var customerName = inst.InstallmentPlan?.SalesContract?.Customer?.FullName ?? "غير معروف";
                var daysLate = (int)(now - inst.DueDate).TotalDays;
                var remaining = inst.Amount - inst.PaidAmount;
                sb.AppendLine($"{customerName},{inst.InstallmentNumber},{inst.DueDate:yyyy-MM-dd},{inst.Amount:F2},{inst.PaidAmount:F2},{remaining:F2},{inst.Status},{(daysLate > 0 ? daysLate.ToString() : "0")}");
            }

            var bytes = System.Text.Encoding.UTF8.GetPreamble().Concat(System.Text.Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
            return File(bytes, "text/csv; charset=utf-8", $"installment-aging-{DateTime.UtcNow:yyyyMMdd}.csv");
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
