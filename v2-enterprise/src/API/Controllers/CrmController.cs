using System;
using System.Collections.Generic;
using System.Globalization;
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
    public class CrmController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CrmController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        private static readonly Dictionary<string, string> TypeLabels = new()
        { ["call"]="اتصال", ["whatsapp"]="واتساب", ["visit"]="زيارة", ["test_drive"]="تجربة قيادة", ["email"]="بريد إلكتروني", ["other"]="أخرى" };
        private static readonly Dictionary<string, string> OutcomeLabels = new()
        { ["interested"]="مهتم", ["not_interested"]="غير مهتم", ["follow_up"]="متابعة", ["closed"]="مغلق" };
        private static readonly Dictionary<string, string> StageLabels = new()
        { ["lead"]="مهتم", ["contacted"]="تم التواصل", ["test_drive"]="تجربة قيادة", ["negotiating"]="تفاوض", ["reserved"]="محجوز", ["won"]="مكتمل", ["lost"]="خسر" };
        private static readonly Dictionary<string, string> StageColors = new()
        { ["lead"]="slate", ["contacted"]="cyan", ["test_drive"]="violet", ["negotiating"]="amber", ["reserved"]="orange", ["won"]="emerald", ["lost"]="rose" };

        // ───────── Interactions ─────────
        [HttpGet("interactions")]
        public async Task<IActionResult> GetInteractions([FromQuery] Guid? customer_id, [FromQuery] int page = 1, [FromQuery] string? type = null, [FromQuery] string? outcome = null)
        {
            if (page < 1) page = 1; var per = 25;
            var q = _context.CrmInteractions.AsQueryable();
            if (customer_id.HasValue) q = q.Where(i => i.CustomerId == customer_id.Value);
            if (!string.IsNullOrWhiteSpace(type)) q = q.Where(i => i.InteractionType == type);
            if (!string.IsNullOrWhiteSpace(outcome)) q = q.Where(i => i.Outcome == outcome);

            var all = await q.OrderByDescending(i => i.InteractionDate).ToListAsync();
            var custNames = await _context.Customers.ToDictionaryAsync(c => c.Id, c => c.Name);
            var empNames = await _context.Employees.ToDictionaryAsync(e => e.Id, e => e.FullName);
            string? CN(Guid id) => custNames.TryGetValue(id, out var n) ? n : null;
            string? EN(Guid? id) => id.HasValue && empNames.TryGetValue(id.Value, out var n) ? n : null;

            var total = all.Count;
            var items = all.Skip((page - 1) * per).Take(per).Select(i => MapInteraction(i, CN(i.CustomerId), EN(i.EmployeeId))).ToList();
            var now = DateTime.UtcNow;
            var dueSoon = all.Where(i => i.FollowUpDate != null && i.FollowUpDate >= now && i.FollowUpDate <= now.AddDays(3))
                             .Select(i => MapInteraction(i, CN(i.CustomerId), EN(i.EmployeeId))).ToList();

            return Ok(new { success = true, data = new { total, page, per_page = per, items, due_soon = dueSoon, type_labels = TypeLabels, outcome_labels = OutcomeLabels } });
        }

        [HttpPost("interactions")]
        public async Task<IActionResult> CreateInteraction([FromBody] InteractionDto dto)
        {
            if (dto.CustomerId == Guid.Empty) return BadRequest(new { success = false, message = "العميل مطلوب." });
            var entity = new CrmInteraction
            {
                Id = Guid.NewGuid(),
                CustomerId = dto.CustomerId,
                EmployeeId = dto.EmployeeId,
                InteractionType = dto.InteractionType ?? "call",
                Notes = dto.Notes,
                Outcome = dto.Outcome,
                FollowUpDate = dto.FollowUpDate?.ToUniversalTime(),
                InteractionDate = (dto.InteractionDate ?? DateTime.UtcNow).ToUniversalTime(),
                BranchId = _currentUserService.BranchId,
                CreatedBy = _currentUserService.UserId,
            };
            _context.CrmInteractions.Add(entity);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, id = entity.Id, message = "تم تسجيل التفاعل بنجاح." });
        }

        [HttpPut("interactions/{id}")]
        public async Task<IActionResult> UpdateInteraction(Guid id, [FromBody] InteractionDto dto)
        {
            var e = await _context.CrmInteractions.FirstOrDefaultAsync(x => x.Id == id);
            if (e == null) return NotFound(new { success = false, message = "التفاعل غير موجود." });
            if (!string.IsNullOrWhiteSpace(dto.InteractionType)) e.InteractionType = dto.InteractionType;
            if (dto.Notes != null) e.Notes = dto.Notes;
            if (dto.Outcome != null) e.Outcome = dto.Outcome;
            if (dto.FollowUpDate.HasValue) e.FollowUpDate = dto.FollowUpDate.Value.ToUniversalTime();
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "تم تحديث التفاعل." });
        }

        [HttpDelete("interactions/{id}")]
        public async Task<IActionResult> DeleteInteraction(Guid id)
        {
            var e = await _context.CrmInteractions.FirstOrDefaultAsync(x => x.Id == id);
            if (e == null) return NotFound(new { success = false, message = "التفاعل غير موجود." });
            _context.CrmInteractions.Remove(e);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var weekAgo = now.AddDays(-7);
            var totalCustomers = await _context.Customers.CountAsync();
            var newThisMonth = await _context.Customers.CountAsync(c => c.CreatedAt >= monthStart);
            var interactions = await _context.CrmInteractions.ToListAsync();
            var byType = interactions.GroupBy(i => i.InteractionType)
                .ToDictionary(g => g.Key, g => new { count = g.Count(), label = TypeLabels.GetValueOrDefault(g.Key, g.Key) });
            var byOutcome = interactions.Where(i => i.Outcome != null).GroupBy(i => i.Outcome!)
                .ToDictionary(g => g.Key, g => new { count = g.Count(), label = OutcomeLabels.GetValueOrDefault(g.Key, g.Key) });
            return Ok(new { success = true, data = new {
                total_customers = totalCustomers,
                new_this_month = newThisMonth,
                interactions_week = interactions.Count(i => i.InteractionDate >= weekAgo),
                follow_ups_due = interactions.Count(i => i.FollowUpDate != null && i.FollowUpDate <= now.AddDays(3) && i.FollowUpDate >= now.AddDays(-30)),
                by_type = byType, by_outcome = byOutcome
            }});
        }

        // ───────── Pipeline / Deals ─────────
        [HttpGet("pipeline")]
        public async Task<IActionResult> GetPipeline([FromQuery] Guid? employee_id)
        {
            var q = _context.Deals.AsQueryable();
            if (employee_id.HasValue) q = q.Where(d => d.AssignedToId == employee_id.Value);
            var deals = await q.ToListAsync();
            var custNames = await _context.Customers.ToDictionaryAsync(c => c.Id, c => c.Name);
            var custPhones = await _context.Customers.ToDictionaryAsync(c => c.Id, c => c.Phone);
            var empNames = await _context.Employees.ToDictionaryAsync(e => e.Id, e => e.FullName);
            var vehNames = await _context.Vehicles.ToDictionaryAsync(v => v.Id, v => v.Model);

            object MapD(Deal d) => MapDeal(d,
                custNames.GetValueOrDefault(d.CustomerId),
                custPhones.GetValueOrDefault(d.CustomerId),
                d.AssignedToId.HasValue ? empNames.GetValueOrDefault(d.AssignedToId.Value) : null,
                d.VehicleId.HasValue ? vehNames.GetValueOrDefault(d.VehicleId.Value) : null);
            var byStage = StageLabels.Keys.ToDictionary(s => s, s => deals.Where(d => d.Stage == s).Select(MapD).ToList());

            var won = deals.Count(d => d.Stage == "won");
            var lost = deals.Count(d => d.Stage == "lost");
            var closed = won + lost;
            return Ok(new { success = true, data = new {
                by_stage = byStage,
                stage_labels = StageLabels, stage_colors = StageColors,
                total_deals = deals.Count,
                active_deals = deals.Count(d => d.Stage != "won" && d.Stage != "lost"),
                total_expected_iqd = deals.Where(d => d.Stage != "lost").Sum(d => d.ExpectedPrice ?? 0),
                conversion_rate = closed > 0 ? Math.Round((double)won / closed * 100, 1) : 0,
                won_count = won, lost_count = lost
            }});
        }

        [HttpPost("deals")]
        public async Task<IActionResult> CreateDeal([FromBody] DealDto dto)
        {
            if (dto.CustomerId == Guid.Empty) return BadRequest(new { success = false, message = "العميل مطلوب." });
            var d = new Deal
            {
                Id = Guid.NewGuid(),
                CustomerId = dto.CustomerId,
                VehicleId = dto.VehicleId,
                AssignedToId = dto.AssignedToId,
                Stage = string.IsNullOrWhiteSpace(dto.Stage) ? "lead" : dto.Stage,
                ExpectedPrice = dto.ExpectedPrice,
                Currency = dto.Currency ?? "IQD",
                Notes = dto.Notes,
                StageChangedAt = DateTime.UtcNow,
                BranchId = _currentUserService.BranchId,
                CreatedBy = _currentUserService.UserId,
            };
            _context.Deals.Add(d);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, id = d.Id, message = "تم إنشاء الصفقة بنجاح." });
        }

        [HttpPost("deals/{id}/stage")]
        public async Task<IActionResult> MoveStage(Guid id, [FromBody] MoveStageDto dto)
        {
            var d = await _context.Deals.FirstOrDefaultAsync(x => x.Id == id);
            if (d == null) return NotFound(new { success = false, message = "الصفقة غير موجودة." });
            d.Stage = dto.Stage ?? d.Stage;
            d.StageChangedAt = DateTime.UtcNow;
            if (dto.Stage == "lost" && !string.IsNullOrWhiteSpace(dto.LostReason)) d.LostReason = dto.LostReason;
            if (!string.IsNullOrWhiteSpace(dto.Notes)) d.Notes = dto.Notes;
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "تم نقل الصفقة." });
        }

        [HttpPut("deals/{id}")]
        public async Task<IActionResult> UpdateDeal(Guid id, [FromBody] DealDto dto)
        {
            var d = await _context.Deals.FirstOrDefaultAsync(x => x.Id == id);
            if (d == null) return NotFound(new { success = false, message = "الصفقة غير موجودة." });
            if (dto.VehicleId.HasValue) d.VehicleId = dto.VehicleId;
            if (dto.AssignedToId.HasValue) d.AssignedToId = dto.AssignedToId;
            if (dto.ExpectedPrice.HasValue) d.ExpectedPrice = dto.ExpectedPrice;
            if (dto.Notes != null) d.Notes = dto.Notes;
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "تم تحديث الصفقة." });
        }

        [HttpDelete("deals/{id}")]
        public async Task<IActionResult> DeleteDeal(Guid id)
        {
            var d = await _context.Deals.FirstOrDefaultAsync(x => x.Id == id);
            if (d == null) return NotFound(new { success = false, message = "الصفقة غير موجودة." });
            _context.Deals.Remove(d);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // ───────── Employee Performance ─────────
        [HttpGet("performance")]
        public async Task<IActionResult> GetPerformance([FromQuery] string? period)
        {
            period ??= DateTime.UtcNow.ToString("yyyy-MM");
            var employees = await _context.Employees.Where(e => e.IsActive).ToListAsync();
            var contracts = await _context.SalesContracts.Where(c => c.SalesRepId != null).ToListAsync();
            var commissions = await _context.EmployeeCommissions.ToListAsync();
            var interactions = await _context.CrmInteractions.ToListAsync();
            var deals = await _context.Deals.ToListAsync();
            var targets = await _context.EmployeeTargets.Where(t => t.Period == period).ToListAsync();

            var list = employees.Select(e =>
            {
                var myContracts = contracts.Where(c => c.SalesRepId == e.Id).ToList();
                var revenue = myContracts.Sum(c => c.NetPrice);
                var profit = myContracts.Sum(c => c.Profit);
                var commission = commissions.Where(c => c.EmployeeId == e.Id).Sum(c => c.Amount);
                var target = targets.FirstOrDefault(t => t.EmployeeId == e.Id);
                double? Pct(decimal actual, decimal tgt) => tgt > 0 ? (double?)Math.Round((double)(actual / tgt) * 100, 1) : null;
                return new
                {
                    employee_id = e.Id,
                    employee_name = e.FullName,
                    employee_phone = e.Phone,
                    title = e.Title,
                    sales_count = myContracts.Count,
                    revenue_iqd = revenue,
                    profit_iqd = profit,
                    total_commission_iqd = commission,
                    crm_interactions = interactions.Count(i => i.EmployeeId == e.Id),
                    pipeline_active = deals.Count(d => d.AssignedToId == e.Id && d.Stage != "won" && d.Stage != "lost"),
                    target = new { sales = target?.TargetSalesCount ?? 0, revenue = target?.TargetRevenue ?? 0, profit = target?.TargetProfit ?? 0 },
                    achievement = new {
                        sales_pct = target != null && target.TargetSalesCount > 0 ? (double?)Math.Round((double)myContracts.Count / target.TargetSalesCount * 100, 1) : null,
                        revenue_pct = Pct(revenue, target?.TargetRevenue ?? 0),
                        profit_pct = Pct(profit, target?.TargetProfit ?? 0),
                    },
                    period,
                };
            })
            .OrderByDescending(x => x.revenue_iqd)
            .Select((x, idx) => new { x.employee_id, x.employee_name, x.employee_phone, x.title, rank = idx + 1,
                x.sales_count, x.revenue_iqd, x.profit_iqd, x.total_commission_iqd, x.crm_interactions, x.pipeline_active,
                x.target, x.achievement, performance_score = (double?)null, x.period })
            .ToList();

            return Ok(new { success = true, data = new {
                period,
                employees = list,
                summary = new {
                    total_sales = list.Sum(x => x.sales_count),
                    total_revenue = list.Sum(x => x.revenue_iqd),
                    total_profit = list.Sum(x => x.profit_iqd),
                    best_employee = list.FirstOrDefault()?.employee_name
                }
            }});
        }

        [HttpPost("targets")]
        public async Task<IActionResult> SetTarget([FromBody] TargetDto dto)
        {
            var period = string.IsNullOrWhiteSpace(dto.Period) ? DateTime.UtcNow.ToString("yyyy-MM") : dto.Period;
            var existing = await _context.EmployeeTargets.FirstOrDefaultAsync(t => t.EmployeeId == dto.EmployeeId && t.Period == period);
            if (existing == null)
            {
                existing = new EmployeeTarget { Id = Guid.NewGuid(), EmployeeId = dto.EmployeeId, Period = period, BranchId = _currentUserService.BranchId, CreatedBy = _currentUserService.UserId };
                _context.EmployeeTargets.Add(existing);
            }
            existing.TargetSalesCount = dto.TargetSalesCount;
            existing.TargetRevenue = dto.TargetRevenue;
            existing.TargetProfit = dto.TargetProfit;
            existing.Currency = dto.Currency ?? "IQD";
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "تم حفظ الهدف." });
        }

        [HttpPost("commissions")]
        public async Task<IActionResult> AddCommission([FromBody] CommissionDto dto)
        {
            decimal amount = dto.CommissionAmount ?? 0;
            if (amount <= 0 && dto.CommissionRate.HasValue && dto.SaleId.HasValue)
            {
                var c = await _context.SalesContracts.FirstOrDefaultAsync(x => x.Id == dto.SaleId.Value);
                if (c != null) amount = Math.Round(c.Profit * (dto.CommissionRate.Value / 100), 2);
            }
            var comm = new EmployeeCommission
            {
                Id = Guid.NewGuid(), EmployeeId = dto.EmployeeId, SaleId = dto.SaleId,
                Amount = amount, Currency = dto.Currency ?? "IQD", IsPaid = false,
                BranchId = _currentUserService.BranchId, CreatedBy = _currentUserService.UserId,
            };
            _context.EmployeeCommissions.Add(comm);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, id = comm.Id, amount });
        }

        [HttpPost("commissions/{id}/pay")]
        public async Task<IActionResult> PayCommission(Guid id)
        {
            var c = await _context.EmployeeCommissions.FirstOrDefaultAsync(x => x.Id == id);
            if (c == null) return NotFound(new { success = false, message = "العمولة غير موجودة." });
            c.IsPaid = true;
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // ───────── helpers ─────────
        private static object MapInteraction(CrmInteraction i, string? custName, string? empName) => new
        {
            id = i.Id, customer_id = i.CustomerId, customer_name = custName,
            employee_id = i.EmployeeId, employee_name = empName,
            interaction_type = i.InteractionType, type_label = TypeLabels.GetValueOrDefault(i.InteractionType, i.InteractionType),
            notes = i.Notes, outcome = i.Outcome, outcome_label = i.Outcome != null ? OutcomeLabels.GetValueOrDefault(i.Outcome, i.Outcome) : "",
            follow_up_date = i.FollowUpDate, interaction_date = i.InteractionDate, created_at = i.CreatedAt,
        };

        private static object MapDeal(Deal d, string? custName, string? custPhone, string? empName, string? carName) => new
        {
            id = d.Id, customer_id = d.CustomerId,
            customer_name = custName, customer_phone = custPhone,
            car_id = d.VehicleId, car_name = carName,
            assigned_to_id = d.AssignedToId, assigned_name = empName,
            sale_id = d.SaleId,
            stage = d.Stage, stage_label = StageLabels.GetValueOrDefault(d.Stage, d.Stage), stage_color = StageColors.GetValueOrDefault(d.Stage, "slate"),
            expected_price = d.ExpectedPrice, currency = d.Currency, notes = d.Notes, lost_reason = d.LostReason,
            stage_changed_at = d.StageChangedAt, created_at = d.CreatedAt,
            days_in_stage = (int)(DateTime.UtcNow - d.StageChangedAt).TotalDays,
        };

        public class InteractionDto { public Guid CustomerId { get; set; } public Guid? EmployeeId { get; set; } public string? InteractionType { get; set; } public string? Notes { get; set; } public string? Outcome { get; set; } public DateTime? FollowUpDate { get; set; } public DateTime? InteractionDate { get; set; } }
        public class DealDto { public Guid CustomerId { get; set; } public Guid? VehicleId { get; set; } public Guid? AssignedToId { get; set; } public string? Stage { get; set; } public decimal? ExpectedPrice { get; set; } public string? Currency { get; set; } public string? Notes { get; set; } }
        public class MoveStageDto { public string? Stage { get; set; } public string? LostReason { get; set; } public string? Notes { get; set; } }
        public class TargetDto { public Guid EmployeeId { get; set; } public string? Period { get; set; } public int TargetSalesCount { get; set; } public decimal TargetRevenue { get; set; } public decimal TargetProfit { get; set; } public string? Currency { get; set; } }
        public class CommissionDto { public Guid EmployeeId { get; set; } public Guid? SaleId { get; set; } public decimal? CommissionRate { get; set; } public decimal? CommissionAmount { get; set; } public string? Currency { get; set; } }
    }
}
