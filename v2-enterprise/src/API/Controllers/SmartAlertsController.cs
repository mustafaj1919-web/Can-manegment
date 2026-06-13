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
    [Route("api/smart-alerts")]
    public class SmartAlertsController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;

        public SmartAlertsController(IApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetSmartAlerts()
        {
            var today = DateTime.UtcNow.Date;

            var alerts = new List<AlertDto>();

            // 1. أقساط متأخرة
            var overdueInstallments = await _context.Installments
                .Where(i => i.Status != "Paid" && (i.Status == "Overdue" || i.DueDate < today))
                .ToListAsync();

            if (overdueInstallments.Count > 0)
            {
                var overdueAmount = overdueInstallments.Sum(i => i.Amount - i.PaidAmount);
                alerts.Add(new AlertDto
                {
                    type      = "overdue_installments",
                    severity  = "critical",
                    title     = $"أقساط متأخرة: {overdueInstallments.Count}",
                    body      = $"إجمالي المتأخر: {overdueAmount:N0} د.ع",
                    link      = "/installments?filter=overdue",
                    count     = overdueInstallments.Count,
                    amount    = overdueAmount,
                    currency  = "IQD"
                });
            }

            // 2. أقساط مستحقة اليوم
            var dueTodayCount = await _context.Installments
                .CountAsync(i => i.Status != "Paid" && i.DueDate.Date == today);

            if (dueTodayCount > 0)
            {
                alerts.Add(new AlertDto
                {
                    type     = "due_today",
                    severity = "high",
                    title    = $"أقساط مستحقة اليوم: {dueTodayCount}",
                    body     = "تستحق الدفع اليوم — يُنصح بالتواصل مع العملاء",
                    link     = "/installments?filter=due_today",
                    count    = dueTodayCount
                });
            }

            // 3. مخزون منخفض
            var availableCount = await _context.Vehicles.CountAsync(v => v.Status == "Available");
            if (availableCount < 5)
            {
                alerts.Add(new AlertDto
                {
                    type     = "low_inventory",
                    severity = availableCount == 0 ? "critical" : "warning",
                    title    = availableCount == 0
                                   ? "المخزون فارغ — لا سيارات متاحة"
                                   : $"مخزون منخفض: {availableCount} سيارة فقط",
                    body     = "يُنصح بإضافة سيارات جديدة للمخزون",
                    link     = "/inventory"
                });
            }

            // 4. أقساط مستحقة غداً (تحذير مسبق)
            var tomorrow        = today.AddDays(1);
            var dueTomorrowCount = await _context.Installments
                .CountAsync(i => i.Status != "Paid" && i.DueDate.Date == tomorrow);

            if (dueTomorrowCount > 0)
            {
                alerts.Add(new AlertDto
                {
                    type     = "due_tomorrow",
                    severity = "warning",
                    title    = $"أقساط مستحقة غداً: {dueTomorrowCount}",
                    body     = "يُنصح بالتذكير المسبق للعملاء",
                    link     = "/installments?filter=due_tomorrow",
                    count    = dueTomorrowCount
                });
            }

            var counts = new
            {
                total    = alerts.Count,
                critical = alerts.Count(a => a.severity == "critical"),
                high     = alerts.Count(a => a.severity == "high"),
                warning  = alerts.Count(a => a.severity == "warning"),
                info     = alerts.Count(a => a.severity == "info")
            };

            return Ok(new { alerts, counts });
        }

        private class AlertDto
        {
            public string  type      { get; set; } = string.Empty;
            public string  severity  { get; set; } = "info";
            public string  title     { get; set; } = string.Empty;
            public string  body      { get; set; } = string.Empty;
            public string? link      { get; set; }
            public int?    count     { get; set; }
            public decimal? amount   { get; set; }
            public string? currency  { get; set; }
            public int?    days_overdue { get; set; }
        }
    }
}
