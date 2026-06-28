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
            var today    = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var overdueCount     = await _context.Installments.CountAsync(i => i.Status != "Paid" && (i.Status == "Overdue" || i.DueDate < today));
            var overdueAmount    = await _context.Installments.Where(i => i.Status != "Paid" && (i.Status == "Overdue" || i.DueDate < today)).SumAsync(i => (decimal?)(i.Amount - i.PaidAmount)) ?? 0m;
            var dueTodayCount    = await _context.Installments.CountAsync(i => i.Status != "Paid" && i.DueDate.Date == today);
            var availableCount   = await _context.Vehicles.CountAsync(v => v.Status == "Available");
            var dueTomorrowCount = await _context.Installments.CountAsync(i => i.Status != "Paid" && i.DueDate.Date == tomorrow);

            var alerts = new List<AlertDto>();

            if (overdueCount > 0)
            {
                alerts.Add(new AlertDto
                {
                    type      = "overdue_installments",
                    severity  = "critical",
                    title     = $"أقساط متأخرة: {overdueCount}",
                    body      = $"إجمالي المتأخر: {overdueAmount:N0} د.ع",
                    link      = "/installments?filter=overdue",
                    count     = overdueCount,
                    amount    = overdueAmount,
                    currency  = "IQD"
                });
            }

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
