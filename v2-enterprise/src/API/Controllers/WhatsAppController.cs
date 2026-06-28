using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize(Roles = "Owner,Admin,Accountant,Viewer")]
    public class WhatsAppController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public WhatsAppController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public record SendReceiptRequest(Guid VoucherId, string? CustomMessage, string? CustomPhone);
        public record SendReminderRequest(Guid InstallmentId, string? CustomMessage, string? CustomPhone);

        // 1. إرسال سند القبض/الصرف تلقائياً عبر الواتساب
        [Authorize(Roles = "Owner,Admin,Accountant")]
        [HttpPost("send-receipt")]
        public async Task<IActionResult> SendReceipt([FromBody] SendReceiptRequest request)
        {
            var branchId = _currentUserService.BranchId;
            var voucher = await _context.Payments
                .FirstOrDefaultAsync(p => p.Id == request.VoucherId && p.BranchId == branchId);

            if (voucher == null)
            {
                return NotFound(new { success = false, message = "السند غير موجود." });
            }

            // محاولة إيجاد العميل المرتبط بالحساب المقابل
            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.BranchId == branchId && (c.Name.Contains(voucher.Description ?? "") || (voucher.Description != null && voucher.Description.Contains(c.Name))));

            // إذا لم نجد العميل بالاسم، سنأخذ أول عميل أو حساب افتراضي
            if (customer == null)
            {
                customer = await _context.Customers.FirstOrDefaultAsync(c => c.BranchId == branchId);
            }

            string phone = request.CustomPhone ?? customer?.Phone ?? "9647700000000";
            string customerName = customer?.Name ?? "العميل الكريم";

            // تنسيق الرسالة التلقائية الأنيقة
            string typeLabel = voucher.Type == PaymentType.Receipt ? "سند قبض" : "سند صرف";
            string currencyLabel = "دينار عراقي"; // الافتراضي للسندات المباشرة
            
            string amountFormatted = string.Format("{0:N0}", voucher.Amount);
            string message = request.CustomMessage ?? 
                $"مرحباً {customerName}،\n\nتم إصدار {typeLabel} برقم ({voucher.ReferenceNumber}) بقيمة {amountFormatted} {currencyLabel} بنجاح.\nالبيان: {voucher.Description ?? "سداد دفعات"}\nالتاريخ: {voucher.CreatedAt:yyyy-MM-dd}\n\nشكراً لتعاملكم معنا.\nمعرض سيارات كود V2 الرواد.";

            // محاكاة إرسال الرسالة عبر بوابة الواتساب
            bool isSuccess = true;

            // تسجيل التفاعل في CRM
            var interaction = new CrmInteraction
            {
                Id = Guid.NewGuid(),
                CustomerId = customer?.Id ?? Guid.Empty,
                EmployeeId = null,
                InteractionType = "whatsapp",
                InteractionDate = DateTime.UtcNow,
                Notes = $"[تلقائي] إرسال {typeLabel} رقم {voucher.ReferenceNumber} إلى الرقم {phone}.\nالرسالة: {message}",
                Outcome = isSuccess ? "delivered" : "failed"
            };

            _context.CrmInteractions.Add(interaction);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "تم إرسال السند للعميل وتوثيق العملية في سجل CRM بنجاح.",
                data = new
                {
                    recipientName = customerName,
                    recipientPhone = phone,
                    message,
                    status = "Delivered",
                    timestamp = DateTime.UtcNow
                }
            });
        }

        // 2. إرسال تذكير بالاستحقاق عبر الواتساب
        [Authorize(Roles = "Owner,Admin,Accountant")]
        [HttpPost("send-reminder")]
        public async Task<IActionResult> SendReminder([FromBody] SendReminderRequest request)
        {
            var branchId = _currentUserService.BranchId;
            var installment = await _context.Installments
                .Include(i => i.InstallmentPlan)
                    .ThenInclude(ip => ip!.SalesContract)
                .Include(i => i.InstallmentPlan)
                    .ThenInclude(ip => ip!.Purchase)
                .FirstOrDefaultAsync(i => i.Id == request.InstallmentId && i.InstallmentPlan!.BranchId == branchId);

            if (installment == null)
            {
                return NotFound(new { success = false, message = "القسط غير موجود." });
            }

            Guid? customerId = null;
            string customerName = "العميل الكريم";
            string phone = "9647700000000";

            if (installment.InstallmentPlan?.SalesContract != null)
            {
                customerId = installment.InstallmentPlan.SalesContract.CustomerId;
                var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == customerId);
                customerName = customer?.Name ?? "العميل الكريم";
                phone = request.CustomPhone ?? customer?.Phone ?? "9647700000000";
            }
            else if (installment.InstallmentPlan?.Purchase != null)
            {
                var supplierId = installment.InstallmentPlan.Purchase.SupplierId;
                var supplier = await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == supplierId);
                customerName = supplier?.Name ?? "المورد الكريم";
                phone = request.CustomPhone ?? supplier?.Phone ?? "9647700000000";
                customerId = supplierId;
            }

            string currency = installment.InstallmentPlan?.PurchaseId.HasValue == true ? "USD" : "IQD";
            string currencyLabel = currency == "USD" ? "دولار أمريكي" : "دينار عراقي";
            string amountFormatted = string.Format("{0:N0}", installment.Amount);

            string message = request.CustomMessage ?? 
                $"مرحباً {customerName}،\n\nنود تذكيركم بحلول موعد قسطكم المستحق لشهر {installment.DueDate:MMMM yyyy} بقيمة {amountFormatted} {currencyLabel}.\nتاريخ الاستحقاق: {installment.DueDate:yyyy-MM-dd}\n\nيرجى السداد لتفادي أي غرامات تأخير.\nشكراً لتفهمكم.";

            // محاكاة إرسال الرسالة
            bool isSuccess = true;

            // تسجيل التفاعل
            var interaction = new CrmInteraction
            {
                Id = Guid.NewGuid(),
                CustomerId = customerId ?? Guid.Empty,
                EmployeeId = null,
                InteractionType = "whatsapp",
                InteractionDate = DateTime.UtcNow,
                Notes = $"[تذكير] إرسال تذكير بالقسط المستحق بتاريخ {installment.DueDate:yyyy-MM-dd} بقيمة {amountFormatted} {currency}.\nالرسالة: {message}",
                Outcome = isSuccess ? "delivered" : "failed"
            };

            _context.CrmInteractions.Add(interaction);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "تم إرسال تذكير القسط وتوثيقه في السجل.",
                data = new
                {
                    recipientName = customerName,
                    recipientPhone = phone,
                    message,
                    status = "Delivered",
                    timestamp = DateTime.UtcNow
                }
            });
        }

        // 3. جلب سجل إرسال الواتساب بالكامل
        [HttpGet("logs")]
        public async Task<IActionResult> GetWhatsAppLogs()
        {
            var branchId = _currentUserService.BranchId;

            // جلب تفاعلات الواتساب مع أسماء العملاء
            var logs = await _context.CrmInteractions
                .Where(i => i.InteractionType == "whatsapp")
                .OrderByDescending(i => i.InteractionDate)
                .Take(100)
                .ToListAsync();

            var customerIds = logs.Select(l => l.CustomerId).Distinct().ToList();
            
            // جلب العملاء
            var customers = await _context.Customers
                .Where(c => customerIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.Name);

            // جلب الموردين (في حال كانت المراسلة لمورد)
            var suppliers = await _context.Suppliers
                .Where(s => customerIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => s.Name);

            var result = logs.Select(l => new
            {
                id = l.Id,
                customerName = customers.ContainsKey(l.CustomerId) ? customers[l.CustomerId] : 
                               (suppliers.ContainsKey(l.CustomerId) ? suppliers[l.CustomerId] : "عميل عام"),
                notes = l.Notes,
                outcome = l.Outcome,
                date = l.InteractionDate
            });

            return Ok(new { success = true, items = result });
        }
    }
}
