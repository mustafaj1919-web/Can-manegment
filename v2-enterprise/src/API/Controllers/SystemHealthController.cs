using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    public class SystemHealthController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private static readonly DateTime _startTime = DateTime.UtcNow;

        public SystemHealthController(IApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetHealth()
        {
            var now = DateTime.UtcNow;
            var uptime = now - _startTime;

            bool dbOk = true;
            string dbError = "";

            try { await _context.Branches.CountAsync(); }
            catch (Exception ex) { dbOk = false; dbError = ex.Message; }

            // عدد السجلات في الجداول الرئيسية
            var vehicles       = await _context.Vehicles.CountAsync();
            var sales          = await _context.SalesContracts.CountAsync();
            var customers      = await _context.Customers.CountAsync();
            var purchases      = await _context.Purchases.CountAsync();
            var installments   = await _context.InstallmentPlans.CountAsync();
            var users          = await _context.Users.CountAsync();
            var branches       = await _context.Branches.CountAsync();
            var expenses       = await _context.Expenses.CountAsync();
            var journalEntries = await _context.JournalEntries.CountAsync();
            var auditLogs      = await _context.AuditLogs.CountAsync();
            var payments       = await _context.Payments.CountAsync();
            var employees      = await _context.Employees.CountAsync();
            var crmInteractions= await _context.CrmInteractions.CountAsync();

            // أحدث نشاط
            var lastSale = await _context.SalesContracts
                .OrderByDescending(s => s.SaleDate)
                .Select(s => s.SaleDate)
                .FirstOrDefaultAsync();

            var lastAudit = await _context.AuditLogs
                .OrderByDescending(a => a.Timestamp)
                .Select(a => a.Timestamp)
                .FirstOrDefaultAsync();

            return Ok(new
            {
                success = true,
                data = new
                {
                    status    = dbOk ? "healthy" : "degraded",
                    timestamp = now,
                    uptime_seconds = (long)uptime.TotalSeconds,
                    uptime_label   = FormatUptime(uptime),
                    version   = "2.0.0",
                    environment = "Production",

                    database = new
                    {
                        ok      = dbOk,
                        error   = dbError,
                        tables  = new
                        {
                            vehicles,
                            sales,
                            customers,
                            purchases,
                            installments,
                            users,
                            branches,
                            expenses,
                            journal_entries  = journalEntries,
                            payments,
                            employees,
                            crm_interactions = crmInteractions,
                            audit_logs       = auditLogs,
                        }
                    },

                    activity = new
                    {
                        last_sale  = lastSale == default ? (DateTime?)null : lastSale,
                        last_audit = lastAudit == default ? (DateTime?)null : lastAudit,
                    }
                }
            });
        }

        private static string FormatUptime(TimeSpan ts)
        {
            if (ts.TotalDays >= 1)
                return $"{(int)ts.TotalDays} يوم {ts.Hours} ساعة";
            if (ts.TotalHours >= 1)
                return $"{(int)ts.TotalHours} ساعة {ts.Minutes} دقيقة";
            return $"{ts.Minutes} دقيقة";
        }
    }
}
