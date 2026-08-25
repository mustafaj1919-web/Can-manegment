using System;
using System.Collections.Generic;
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
    public class NotificationsController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public NotificationsController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var branchId = _currentUserService.BranchId;
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            var soonEnd = today.AddDays(7);

            // جلب الأقساط النشطة المعزولة بالفرع
            var plans = await _context.InstallmentPlans
                .Include(p => p.SalesContract)
                    .ThenInclude(sc => sc!.Customer)
                .Include(p => p.SalesContract)
                    .ThenInclude(sc => sc!.Vehicle)
                .Include(p => p.Installments)
                .Where(p => p.Status == "Active")
                .ToListAsync();

            var overdue = new List<object>();
            var dueToday = new List<object>();
            var dueSoon = new List<object>();

            var customerOverdueMap = new Dictionary<Guid, (string Name, string Phone, int Count, decimal Amount, string Currency)>();

            foreach (var p in plans)
            {
                var sc = p.SalesContract;
                var customer = sc?.Customer;
                var vehicle = sc?.Vehicle;
                var currency = "IQD";

                foreach (var inst in p.Installments.Where(i => i.Status != "Paid"))
                {
                    var remAmount = inst.Amount - inst.PaidAmount;
                    var item = new
                    {
                        id = inst.Id,
                        customer_name = customer != null ? (customer.FullName ?? customer.Name) : "عميل مجهول",
                        car_name = vehicle != null ? vehicle.Model : "سيارة مجهولة",
                        invoice_number = sc?.ContractNumber ?? "—",
                        amount = remAmount,
                        currency = currency,
                        due_date = inst.DueDate,
                        status = inst.Status
                    };

                    if (inst.Status == "Overdue" || inst.DueDate < today)
                    {
                        overdue.Add(item);

                        if (customer != null)
                        {
                            if (customerOverdueMap.ContainsKey(customer.Id))
                            {
                                var current = customerOverdueMap[customer.Id];
                                customerOverdueMap[customer.Id] = (current.Name, current.Phone, current.Count + 1, current.Amount + remAmount, current.Currency);
                            }
                            else
                            {
                                customerOverdueMap[customer.Id] = (customer.FullName ?? customer.Name, customer.Phone ?? "—", 1, remAmount, currency);
                            }
                        }
                    }
                    else if (inst.DueDate.Date == today)
                    {
                        dueToday.Add(item);
                    }
                    else if (inst.DueDate >= tomorrow && inst.DueDate <= soonEnd)
                    {
                        dueSoon.Add(item);
                    }
                }
            }

            var defaultingCustomers = customerOverdueMap.Select(kv => new
            {
                customer_id = kv.Key,
                customer_name = kv.Value.Name,
                customer_phone = kv.Value.Phone,
                overdue_count = kv.Value.Count,
                overdue_amount = kv.Value.Amount,
                currency = kv.Value.Currency
            }).ToList();

            // جلب سجلات التدقيق الأخيرة
            var auditLogs = await _context.AuditLogs
                .OrderByDescending(al => al.Timestamp)
                .Take(10)
                .Select(al => new
                {
                    id = al.Id,
                    user_id = al.UserId,
                    action = al.Action,
                    entity_type = al.TableName,
                    entity_id = al.PrimaryKey,
                    details = $"Old: {al.OldValues} | New: {al.NewValues}",
                    created_at = al.Timestamp
                })
                .ToListAsync();

            return Ok(new
            {
                overdue,
                due_today = dueToday,
                due_soon = dueSoon,
                defaulting_customers = defaultingCustomers,
                audit_logs = auditLogs
            });
        }
    }
}
