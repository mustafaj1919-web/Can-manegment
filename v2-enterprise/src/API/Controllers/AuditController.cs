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
    public class AuditController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;

        public AuditController(IApplicationDbContext context)
        {
            _context = context;
        }

        // تحويل اسم الجدول إلى نوع كيان صديق للواجهة
        private static string MapEntityType(string tableName) => tableName switch
        {
            "Vehicles"         => "car",
            "SalesContracts"   => "sale",
            "Purchases"        => "purchase",
            "Customers"        => "customer",
            "InstallmentPlans" => "installment",
            "Installments"     => "installment",
            "Payments"         => "payment",
            "Users"            => "user",
            "Expenses"         => "expense",
            "JournalEntries"   => "journal",
            "Accounts"         => "account",
            "Employees"        => "employee",
            "Branches"         => "branch",
            _                  => tableName.ToLowerInvariant()
        };

        // تحويل فعل التدقيق (Insert/Update/Delete) إلى شكل صديق
        private static string MapAction(string action, string tableName)
        {
            var entity = MapEntityType(tableName);
            return action.ToUpperInvariant() switch
            {
                "INSERT" => $"create_{entity}",
                "UPDATE" => $"update_{entity}",
                "DELETE" => $"delete_{entity}",
                _        => action.ToLowerInvariant()
            };
        }

        // استخراج وصف قصير من قيم JSON
        private static string? ExtractDetails(string? newValues, string? oldValues, string tableName)
        {
            var raw = newValues ?? oldValues;
            if (string.IsNullOrEmpty(raw)) return null;
            // عرض أول 120 حرف فقط بعد إزالة الأقواس
            var clean = raw.Trim('{', '}').Replace("\"", "").Replace(",", " | ");
            return clean.Length > 120 ? clean[..120] + "…" : clean;
        }

        [HttpGet]
        public async Task<IActionResult> GetLogs(
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 50,
            [FromQuery] string? search = null,
            [FromQuery] string? action = null,
            [FromQuery] string? entity = null)
        {
            if (page < 1)    page = 1;
            if (per_page < 1 || per_page > 200) per_page = 50;

            // Limit search parameter lengths to prevent excessive DB load
            if (search?.Length > 200) search = search[..200];
            if (action?.Length > 50)  action = action[..50];
            if (entity?.Length > 100) entity = entity[..100];

            var query = _context.AuditLogs.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(l =>
                    l.Action.Contains(s) ||
                    l.TableName.Contains(s) ||
                    (l.NewValues != null && l.NewValues.Contains(s)) ||
                    (l.OldValues != null && l.OldValues.Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(action) && action != "all")
            {
                var act = action.ToUpperInvariant();
                query = query.Where(l => l.Action.ToUpper() == act);
            }

            if (!string.IsNullOrWhiteSpace(entity) && entity != "all")
            {
                query = query.Where(l => l.TableName.ToLower().Contains(entity.ToLower()));
            }

            var total = await query.CountAsync();

            var rows = await query
                .OrderByDescending(l => l.Timestamp)
                .Skip((page - 1) * per_page)
                .Take(per_page)
                .ToListAsync();

            // جلب أسماء المستخدمين
            var userIds = rows
                .Where(r => !string.IsNullOrEmpty(r.UserId))
                .Select(r => r.UserId!)
                .Distinct()
                .ToList();

            var usersMap = await _context.Users
                .Where(u => userIds.Contains(u.Id.ToString()))
                .ToDictionaryAsync(u => u.Id.ToString(), u => u.Username ?? "");

            var data = rows.Select(l =>
            {
                var entityType = MapEntityType(l.TableName);
                var mappedAction = MapAction(l.Action, l.TableName);

                // محاولة تحليل PrimaryKey كرقم
                int? entityId = int.TryParse(l.PrimaryKey, out var pk) ? pk : null;

                string? username = null;
                if (!string.IsNullOrEmpty(l.UserId))
                    usersMap.TryGetValue(l.UserId, out username);

                return new
                {
                    id          = l.Id,
                    user_id     = l.UserId,
                    username    = username ?? l.UserId ?? "النظام",
                    action      = mappedAction,
                    raw_action  = l.Action,
                    entity_type = entityType,
                    table_name  = l.TableName,
                    entity_id   = entityId,
                    primary_key = l.PrimaryKey,
                    details     = ExtractDetails(l.NewValues, l.OldValues, l.TableName),
                    old_values  = l.OldValues,
                    new_values  = l.NewValues,
                    created_at  = l.Timestamp,
                    branch_id   = l.BranchId,
                };
            }).ToList();

            // إحصاءات سريعة
            var stats = new
            {
                total_inserts = await _context.AuditLogs.CountAsync(l => l.Action.ToUpper() == "INSERT"),
                total_updates = await _context.AuditLogs.CountAsync(l => l.Action.ToUpper() == "UPDATE"),
                total_deletes = await _context.AuditLogs.CountAsync(l => l.Action.ToUpper() == "DELETE"),
                total_all     = await _context.AuditLogs.CountAsync(),
            };

            return Ok(new { success = true, total, page, per_page, data, stats });
        }
    }
}
