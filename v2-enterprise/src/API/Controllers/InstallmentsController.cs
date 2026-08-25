using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Installments.Commands;
using CarShowroomManagementV2.Application.Installments.Queries;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    public class InstallmentsController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public InstallmentsController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // 1. جلب قائمة خطط الأقساط مع الترقيم والفلترة والملخص
        [HttpGet]
        public async Task<IActionResult> GetInstallments(
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 25,
            [FromQuery] string? filter = null,
            [FromQuery] string? search = null)
        {
            if (page < 1) page = 1;
            if (per_page < 1 || per_page > 100) per_page = 25;

            var branchId = _currentUserService.BranchId;

            // استعلام جميع الخطط في نفس الفرع
            var query = _context.InstallmentPlans
                .Include(p => p.SalesContract)
                    .ThenInclude(sc => sc!.Customer)
                .Include(p => p.SalesContract)
                    .ThenInclude(sc => sc!.Vehicle)
                .Include(p => p.Purchase)
                    .ThenInclude(pu => pu!.Supplier)
                .Include(p => p.Purchase)
                    .ThenInclude(pu => pu!.Vehicle)
                .Include(p => p.Installments)
                .AsQueryable();

            if (filter != "cancelled")
            {
                query = query.Where(p => p.Status != "Cancelled" && (p.SalesContract == null || p.SalesContract.Status != "Cancelled"));
            }

            var allPlans = await query.ToListAsync();

            // إجراء الحسابات وتصنيف الفلترة في الذاكرة لتجنب مشاكل الترجمة المعقدة في EF
            var now = DateTime.UtcNow;
            var today = now.Date;
            var tomorrow = today.AddDays(1);
            var in2Days = today.AddDays(2);
            var in7Days = today.AddDays(7);

            var itemsList = allPlans.Select(p => {
                var sc = p.SalesContract;
                var vehicle = sc?.Vehicle ?? p.Purchase?.Vehicle;
                var customer = sc?.Customer;
                var supplier = p.Purchase?.Supplier;

                var total = p.TotalPlanAmount;
                var paid = p.Installments.Sum(i => i.PaidAmount);
                var remaining = Math.Max(0, total - paid);

                var installmentsOrdered = p.Installments.OrderBy(i => i.InstallmentNumber).ToList();
                var nextUnpaid = installmentsOrdered.FirstOrDefault(i => i.Status != "Paid");

                var scheduleCount = p.Installments.Count;
                var paidCount = p.Installments.Count(i => i.Status == "Paid");
                var partialCount = p.Installments.Count(i => i.Status == "PartiallyPaid");
                var unpaidCount = p.Installments.Count(i => i.Status == "Pending" || i.Status == "PartiallyPaid");
                var overdueCount = p.Installments.Count(i => i.Status == "Overdue" || (i.Status != "Paid" && i.DueDate < today));
                var dueTodayCount = p.Installments.Count(i => i.Status != "Paid" && i.DueDate.Date == today);
                var dueTomorrowCount = p.Installments.Count(i => i.Status != "Paid" && i.DueDate.Date == tomorrow);
                var dueIn2DaysCount = p.Installments.Count(i => i.Status != "Paid" && i.DueDate.Date == in2Days);

                return new
                {
                    id = p.Id,
                    sale_id = p.SalesContractId,
                    purchase_id = p.PurchaseId,
                    plan_type = p.PurchaseId.HasValue ? "purchase" : "sale",
                    invoice_number = sc?.ContractNumber ?? p.Purchase?.PurchaseNumber,
                    car_name = vehicle != null ? $"{vehicle.Model} {vehicle.Year}" : null,
                    buyer_id = sc?.CustomerId,
                    buyer_name = customer != null ? (customer.FullName ?? customer.Name) : (supplier != null ? $"مورد: {supplier.Name}" : null),
                    buyer_phone = customer?.Phone ?? supplier?.Phone,
                    total_amount = total,
                    paid_amount = paid,
                    remaining_amount = remaining,
                    currency = sc?.Currency ?? p.Purchase?.Currency ?? vehicle?.Currency ?? "IQD",
                    number_of_months = p.InstallmentPeriodMonths,
                    installment_amount = p.MonthlyInstallmentAmount,
                    installment_due_day = 1,
                    next_due_date = nextUnpaid?.DueDate,
                    next_due_amount = nextUnpaid?.Amount ?? 0,
                    schedule_count = scheduleCount,
                    paid_schedule_count = paidCount,
                    partial_count = partialCount,
                    unpaid_count = unpaidCount,
                    overdue_count = overdueCount,
                    due_today_count = dueTodayCount,
                    due_tomorrow_count = dueTomorrowCount,
                    due_in_2_days_count = dueIn2DaysCount,
                    status = (p.Status == "Cancelled" || (sc != null && sc.Status == "Cancelled"))
                        ? "Cancelled"
                        : (p.Status == "Completed" ? "Paid" : "Active")
                };
            }).ToList();

            // تطبيق الفلترة بالبحث
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                itemsList = itemsList.Where(i =>
                    (i.buyer_name != null && i.buyer_name.ToLower().Contains(s)) ||
                    (i.invoice_number != null && i.invoice_number.ToLower().Contains(s)) ||
                    (i.buyer_phone != null && i.buyer_phone.Contains(s)) ||
                    (i.car_name != null && i.car_name.ToLower().Contains(s))
                ).ToList();
            }

            // تطبيق الفلترة
            if (!string.IsNullOrEmpty(filter) && filter != "all")
            {
                if (filter == "overdue")
                    itemsList = itemsList.Where(i => i.overdue_count > 0).ToList();
                else if (filter == "due_today")
                    itemsList = itemsList.Where(i => i.due_today_count > 0).ToList();
                else if (filter == "due_tomorrow")
                    itemsList = itemsList.Where(i => i.due_tomorrow_count > 0).ToList();
                else if (filter == "due_in_2_days")
                    itemsList = itemsList.Where(i => i.due_in_2_days_count > 0).ToList();
                else if (filter == "partial")
                    itemsList = itemsList.Where(i => i.partial_count > 0).ToList();
                else if (filter == "paid")
                    itemsList = itemsList.Where(i => i.status == "Paid").ToList();
                else if (filter == "unpaid")
                    itemsList = itemsList.Where(i => i.unpaid_count > 0).ToList();
            }

            // حساب الملخص العام للأقساط المعروضة
            var totalPlans = itemsList.Count;
            var activePlans = itemsList.Count(i => i.status == "Active");
            var paidPlans = itemsList.Count(i => i.status == "Paid");
            var totalReceivables = itemsList.Sum(i => i.remaining_amount);
            var totalPaidAmount = itemsList.Sum(i => i.paid_amount);
            
            // حساب مجاميع التنبيهات والأقساط المستحقة
            decimal overdueAmount = 0;
            decimal dueTodayAmount = 0;
            decimal dueTomorrowAmount = 0;
            decimal dueIn2DaysAmount = 0;

            int totalOverdueCount = 0;
            int totalDueTodayCount = 0;
            int totalDueTomorrowCount = 0;
            int totalDueIn2DaysCount = 0;
            int totalPartialCount = 0;
            int totalUnpaidCount = 0;
            int totalPaidScheduleCount = 0;

            foreach (var p in allPlans)
            {
                totalPaidScheduleCount += p.Installments.Count(i => i.Status == "Paid");
                totalPartialCount += p.Installments.Count(i => i.Status == "PartiallyPaid");
                totalUnpaidCount += p.Installments.Count(i => i.Status != "Paid");

                foreach (var inst in p.Installments.Where(i => i.Status != "Paid"))
                {
                    var rem = inst.Amount - inst.PaidAmount;
                    if (inst.Status == "Overdue" || inst.DueDate < today)
                    {
                        overdueAmount += rem;
                        totalOverdueCount++;
                    }
                    else if (inst.DueDate.Date == today)
                    {
                        dueTodayAmount += rem;
                        totalDueTodayCount++;
                    }
                    else if (inst.DueDate.Date == tomorrow)
                    {
                        dueTomorrowAmount += rem;
                        totalDueTomorrowCount++;
                    }
                    else if (inst.DueDate.Date == in2Days)
                    {
                        dueIn2DaysAmount += rem;
                        totalDueIn2DaysCount++;
                    }
                }
            }

            var summary = new
            {
                total_plans = totalPlans,
                active_plans = activePlans,
                paid_plans = paidPlans,
                total_receivables = totalReceivables,
                total_paid_amount = totalPaidAmount,
                overdue_amount = overdueAmount,
                due_today_amount = dueTodayAmount,
                due_tomorrow_amount = dueTomorrowAmount,
                due_in_2_days_amount = dueIn2DaysAmount,
                overdue_count = totalOverdueCount,
                due_today_count = totalDueTodayCount,
                due_tomorrow_count = totalDueTomorrowCount,
                due_in_2_days_count = totalDueIn2DaysCount,
                partial_count = totalPartialCount,
                unpaid_count = totalUnpaidCount,
                paid_schedule_count = totalPaidScheduleCount
            };

            var totalItems = itemsList.Count;
            var items = itemsList
                .Skip((page - 1) * per_page)
                .Take(per_page)
                .ToList();

            return Ok(new
            {
                total = totalItems,
                page,
                per_page,
                summary,
                items
            });
        }

        // 2. جلب تفاصيل خطة تقسيط معينة بالكامل
        [HttpGet("{planId}")]
        public async Task<IActionResult> GetInstallmentPlan(Guid planId)
        {
            var plan = await _context.InstallmentPlans
                .Include(p => p.SalesContract)
                    .ThenInclude(sc => sc!.Customer)
                .Include(p => p.SalesContract)
                    .ThenInclude(sc => sc!.Vehicle)
                .Include(p => p.Purchase)
                    .ThenInclude(pu => pu!.Supplier)
                .Include(p => p.Purchase)
                    .ThenInclude(pu => pu!.Vehicle)
                .Include(p => p.Installments)
                .FirstOrDefaultAsync(p => p.Id == planId);

            if (plan == null)
            {
                return NotFound(new { success = false, message = "خطة التقسيط غير موجودة." });
            }

            var sc = plan.SalesContract;
            var customer = sc?.Customer;
            var vehicle = sc?.Vehicle ?? plan.Purchase?.Vehicle;
            var supplier = plan.Purchase?.Supplier;

            var paid = plan.Installments.Where(i => i.Status == "Paid").Sum(i => i.PaidAmount);
            var remaining = Math.Max(0, plan.TotalPlanAmount - plan.Installments.Sum(i => i.PaidAmount));

            // جلب سجل الدفعات المباشرة المرتبطة بالعميل أو المورد مع حالة الأرشفة ورابط القسط
            var contraAccId = customer?.AccountId ?? supplier?.AccountId;
            var rawPayments = contraAccId.HasValue ? await _context.Payments
                .Where(p => p.ContraAccountId == contraAccId.Value && p.Status != "cancelled")
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync() : new List<Payment>();

            var paymentIds = rawPayments.Select(p => p.Id).ToList();

            var archiveMap = await _context.ReceiptArchiveRecords
                .Where(r => paymentIds.Contains(r.PaymentId))
                .ToDictionaryAsync(r => r.PaymentId);

            var planInstallmentIds = plan.Installments.Select(i => i.Id).ToHashSet();

            var payments = rawPayments.Select(p => {
                archiveMap.TryGetValue(p.Id, out var arc);

                Guid? schedId = p.InstallmentId;
                if (schedId.HasValue && !planInstallmentIds.Contains(schedId.Value))
                {
                    schedId = null;
                }

                var statusStr = arc?.ArchiveStatus;
                var isArchived = string.Equals(statusStr, "Uploaded", StringComparison.OrdinalIgnoreCase) ||
                                 string.Equals(statusStr, "ManuallyConfirmed", StringComparison.OrdinalIgnoreCase);

                return new
                {
                    id = p.Id,
                    schedule_id = schedId,
                    amount = p.Amount,
                    currency = p.Currency ?? sc?.Currency ?? plan.Purchase?.Currency ?? vehicle?.Currency ?? "IQD",
                    payment_method = p.Method.ToString(),
                    payment_date = p.CreatedAt,
                    notes = p.Description,
                    archive = new
                    {
                        exists = arc != null,
                        is_archived = isArchived,
                        archive_id = arc?.Id,
                        receipt_number = arc?.ReceiptNumber ?? p.ReferenceNumber,
                        archive_status = arc?.ArchiveStatus,
                        archive_method = arc?.ArchiveMethod,
                        storage_reference = arc?.StorageReference,
                        document_file_name = arc?.DocumentFileName,
                        archived_by = arc?.ConfirmedByUserName,
                        archived_at = arc?.ConfirmedAt
                    }
                };
            }).ToList();

            var isPlanCancelled = plan.Status == "Cancelled" || (sc != null && sc.Status == "Cancelled");

            // حساب ملخص كشف حساب العميل ماليًا
            var customerStatement = customer != null ? new
            {
                customer_id = customer.Id,
                customer_name = customer.FullName ?? customer.Name,
                plans_count = await _context.InstallmentPlans.CountAsync(ip => ip.SalesContract != null && ip.SalesContract.CustomerId == customer.Id && ip.Status != "Cancelled" && ip.SalesContract.Status != "Cancelled"),
                total_amount = isPlanCancelled ? 0 : plan.TotalPlanAmount,
                paid_amount = paid,
                remaining_amount = isPlanCancelled ? 0 : remaining,
                overdue_amount = isPlanCancelled ? 0 : plan.Installments.Where(i => i.Status == "Overdue" || (i.Status != "Paid" && i.Status != "Cancelled" && i.DueDate < DateTime.UtcNow.Date)).Sum(i => i.Amount - i.PaidAmount),
                currency = sc?.Currency ?? plan.Purchase?.Currency ?? vehicle?.Currency ?? "IQD"
            } : null;

            var detail = new
            {
                id = plan.Id,
                sale_id = plan.SalesContractId,
                purchase_id = plan.PurchaseId,
                plan_type = plan.PurchaseId.HasValue ? "purchase" : "sale",
                branch_id = plan.BranchId,
                notes = plan.PurchaseId.HasValue ? "خطة تقسيط مستحقات مورد" : "خطة تقسيط نشطة لعقد البيع",
                invoice_number = sc?.ContractNumber ?? plan.Purchase?.PurchaseNumber,
                car_name = vehicle != null ? $"{vehicle.Model} {vehicle.Year}" : null,
                buyer_name = customer != null ? (customer.FullName ?? customer.Name) : (supplier != null ? $"مورد: {supplier.Name}" : null),
                buyer_phone = customer?.Phone ?? supplier?.Phone,
                total_amount = plan.TotalPlanAmount,
                paid_amount = paid,
                remaining_amount = remaining,
                currency = sc?.Currency ?? plan.Purchase?.Currency ?? vehicle?.Currency ?? "IQD",
                number_of_months = plan.InstallmentPeriodMonths,
                installment_amount = plan.MonthlyInstallmentAmount,
                installment_start_date = plan.CreatedAt,
                installment_due_day = 1,
                status = (plan.Status == "Cancelled" || (sc != null && sc.Status == "Cancelled"))
                    ? "Cancelled"
                    : (plan.Status == "Completed" ? "Paid" : "Active"),
                schedules = plan.Installments.OrderBy(i => i.InstallmentNumber).Select(i => new
                {
                    id = i.Id,
                    installment_number = i.InstallmentNumber,
                    due_date = i.DueDate,
                    amount = i.Amount,
                    paid_amount = i.PaidAmount,
                    remaining_amount = i.Amount - i.PaidAmount,
                    currency = sc?.Currency ?? plan.Purchase?.Currency ?? vehicle?.Currency ?? "IQD",
                    status = i.Status,
                    payment_date = i.PaymentDate
                }).ToList(),
                payments = payments,
                customer_statement = customerStatement
            };

            return Ok(detail);
        }

        // 2.5. حذف خطة تقسيط كلياً بالمعرف
        [HttpDelete("{planId}")]
        public async Task<IActionResult> DeleteInstallmentPlan(Guid planId)
        {
            var plan = await _context.InstallmentPlans
                .IgnoreQueryFilters()
                .Include(p => p.Installments)
                .FirstOrDefaultAsync(p => p.Id == planId);

            if (plan == null)
            {
                return NotFound(new { success = false, message = "خطة التقسيط غير موجودة." });
            }

            _context.Installments.RemoveRange(plan.Installments);
            _context.InstallmentPlans.Remove(plan);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "تم حذف خطة التقسيط وجميع أقساطها بالكامل بنجاح." });
        }

        // 3. سداد دفعة قسط محدد ماليًا عبر معرّف القسط
        [HttpPost("{id}/pay")]
        public async Task<IActionResult> Pay(Guid id, [FromBody] PayInstallmentCommand command)
        {
            if (id != command.InstallmentId)
            {
                return BadRequest(new { success = false, message = "معرف القسط غير متطابق." });
            }

            var paymentId = await Mediator.Send(command);
            return Ok(new { success = true, paymentId = paymentId, message = "تم سداد القسط وتوليد سند القبض والقيد المحاسبي بنجاح." });
        }

        // 4. سداد دفعة قسط محدد ماليًا عبر مسار الجدول المطلوب في الواجهة
        [HttpPost("schedules/{scheduleId}/payment")]
        public async Task<IActionResult> PaySchedule(Guid scheduleId, [FromBody] PaySchedulePayloadDto payload)
        {
            var isCash = (payload.PaymentMethod ?? "Cash").Equals("Cash", StringComparison.OrdinalIgnoreCase);
            var command = new PayInstallmentCommand
            {
                InstallmentId = scheduleId,
                Amount = payload.Amount,
                PaymentMethod = isCash ? PaymentMethod.Cash : PaymentMethod.Bank,
                AccountId = payload.AccountId,
                DebitAccountCode = isCash ? "111001" : "112001",
                IdempotencyKey = payload.IdempotencyKey,
                Notes = payload.Notes
            };

            var result = await Mediator.Send(command);

            return Ok(result);
        }

        // 5. جلب جدول أقساط عقد بيع معين
        [HttpGet("schedule/{contractId}")]
        public async Task<IActionResult> GetSchedule(Guid contractId)
        {
            var schedule = await Mediator.Send(new GetInstallmentsScheduleQuery { SalesContractId = contractId });
            return Ok(new { success = true, data = schedule });
        }

        // 6. جلب قائمة الأقساط المتأخرة
        [HttpGet("overdue")]
        public async Task<IActionResult> GetOverdue()
        {
            var list = await Mediator.Send(new GetOverdueInstallmentsQuery());
            return Ok(new { success = true, data = list });
        }

        // POST /api/Installments/send-reminders
        [HttpPost("send-reminders")]
        public async Task<IActionResult> SendOverdueReminders([FromServices] IEmailService emailService)
        {
            var branchId = _currentUserService.BranchId;
            var now = DateTime.UtcNow;

            var overdue = await _context.Installments
                .IgnoreQueryFilters()
                .Include(i => i.InstallmentPlan)
                    .ThenInclude(p => p!.SalesContract)
                        .ThenInclude(sc => sc!.Customer)
                .Where(i => i.BranchId == branchId
                    && (i.Status == "Pending" || i.Status == "PartiallyPaid")
                    && i.DueDate < now)
                .ToListAsync();

            int sent = 0, skipped = 0;
            foreach (var inst in overdue)
            {
                var customer = inst.InstallmentPlan?.SalesContract?.Customer;
                if (customer == null || string.IsNullOrWhiteSpace(customer.Email)) { skipped++; continue; }

                await emailService.SendOverdueInstallmentReminderAsync(
                    customer.Email, customer.FullName ?? customer.Name,
                    inst.InstallmentNumber, inst.Amount - inst.PaidAmount, inst.DueDate);
                sent++;
            }

            return Ok(new { success = true, sent, skipped, total = overdue.Count,
                message = $"تم إرسال {sent} تذكير. تخطي {skipped} (بدون بريد إلكتروني)." });
        }
    }

    public class PaySchedulePayloadDto
    {
        public decimal Amount { get; set; }
        public string? PaymentMethod { get; set; }
        public Guid? AccountId { get; set; }
        public string? IdempotencyKey { get; set; }
        public string? Notes { get; set; }
    }
}
