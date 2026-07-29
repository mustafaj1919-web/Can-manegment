using System;
using System.IO;
using System.Text.Json;
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
    public class RemindersController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        private readonly IMessageNotificationService _notificationService;
        private readonly string _settingsPath;

        public RemindersController(
            IApplicationDbContext context, 
            ICurrentUserService currentUserService,
            IMessageNotificationService notificationService)
        {
            _context = context;
            _currentUserService = currentUserService;
            _notificationService = notificationService;
            _settingsPath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "notification_settings.json");
        }

        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var settings = await LoadSettingsAsync();
            return Ok(settings);
        }

        [HttpPost("settings")]
        public async Task<IActionResult> SaveSettings([FromBody] ReminderSettings settings)
        {
            if (settings == null) return BadRequest("إعدادات غير صالحة");
            await SaveSettingsAsync(settings);
            return Ok(new { message = "تم حفظ الإعدادات بنجاح" });
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory()
        {
            // Fetch directly from CRM logs of type sms/whatsapp
            var history = await _context.CrmInteractions
                .Where(ci => ci.InteractionType == "sms" || ci.InteractionType == "whatsapp")
                .OrderByDescending(ci => ci.InteractionDate)
                .Take(100)
                .ToListAsync();

            var result = new List<object>();
            foreach (var ci in history)
            {
                var customer = await _context.Customers
                    .Where(c => c.Id == ci.CustomerId)
                    .Select(c => new { Name = c.FullName ?? c.Name, Phone = c.Phone })
                    .FirstOrDefaultAsync();

                result.Add(new
                {
                    id = ci.Id,
                    customerName = customer?.Name ?? "عميل مجهول",
                    phone = customer?.Phone ?? "—",
                    type = ci.InteractionType,
                    message = ci.Notes,
                    status = ci.Outcome ?? "Sent",
                    timestamp = ci.InteractionDate
                });
            }

            return Ok(result);
        }

        [HttpPost("send-due")]
        public async Task<IActionResult> SendDueReminders()
        {
            var settings = await LoadSettingsAsync();
            var today = DateTime.UtcNow.Date;
            var soonDate = today.AddDays(3);

            var plans = await _context.InstallmentPlans
                .Include(p => p.SalesContract)
                    .ThenInclude(sc => sc!.Customer)
                .Include(p => p.SalesContract)
                    .ThenInclude(sc => sc!.Vehicle)
                .Include(p => p.Installments)
                .Where(p => p.Status == "Active")
                .ToListAsync();

            int smsSent = 0;
            int whatsAppSent = 0;
            var details = new List<string>();

            Guid? employeeId = null;
            if (!string.IsNullOrEmpty(_currentUserService.UserId) && Guid.TryParse(_currentUserService.UserId, out var parsedGuid))
            {
                employeeId = parsedGuid;
            }

            foreach (var p in plans)
            {
                var sc = p.SalesContract;
                var customer = sc?.Customer;
                var vehicle = sc?.Vehicle;
                
                if (customer == null || vehicle == null) continue;

                var currency = "IQD";

                var activeInstallments = p.Installments
                    .Where(i => i.Status != "Paid" && i.Status != "Cancelled")
                    .ToList();

                foreach (var inst in activeInstallments)
                {
                    string? template = null;
                    string category = "";

                    if (inst.DueDate.Date == today)
                    {
                        template = settings.DueTodayTemplate;
                        category = "due_today";
                    }
                    else if (inst.DueDate.Date == soonDate)
                    {
                        template = settings.DueSoonTemplate;
                        category = "due_soon";
                    }
                    else if (inst.DueDate.Date < today || inst.Status == "Overdue")
                    {
                        template = settings.OverdueTemplate;
                        category = "overdue";
                    }

                    if (string.IsNullOrEmpty(template)) continue;

                    // Avoid double sending to this customer for this installment today
                    var alreadySentToday = await _context.CrmInteractions
                        .AnyAsync(ci => ci.CustomerId == customer.Id 
                                        && (ci.InteractionType == "sms" || ci.InteractionType == "whatsapp") 
                                        && ci.InteractionDate.Date == today 
                                        && ci.Notes != null 
                                        && ci.Notes.Contains($"رقم {inst.InstallmentNumber}")
                                        && ci.Notes.Contains(vehicle.Model));

                    if (alreadySentToday) continue;

                    var messageText = FormatMessage(template, customer, vehicle, inst, currency);
                    bool success = false;

                    if (settings.SmsProvider == "WhatsApp")
                    {
                        success = await _notificationService.SendWhatsAppAsync(customer.Phone, messageText);
                        if (success) whatsAppSent++;
                    }
                    else
                    {
                        success = await _notificationService.SendSmsAsync(customer.Phone, messageText);
                        if (success) smsSent++;
                    }

                    if (success)
                    {
                        var interaction = new CrmInteraction
                        {
                            Id = Guid.NewGuid(),
                            CustomerId = customer.Id,
                            EmployeeId = employeeId,
                            InteractionType = settings.SmsProvider == "WhatsApp" ? "whatsapp" : "sms",
                            Notes = messageText,
                            Outcome = "Sent",
                            InteractionDate = DateTime.UtcNow
                        };
                        _context.CrmInteractions.Add(interaction);
                        details.Add($"تم الإرسال لـ {customer.FullName ?? customer.Name} ({category})");
                    }
                }
            }

            if (smsSent > 0 || whatsAppSent > 0)
            {
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                smsSent,
                whatsAppSent,
                details
            });
        }

        private string FormatMessage(string template, Customer customer, Vehicle vehicle, Installment inst, string currency)
        {
            var name = customer.FullName ?? customer.Name ?? "العميل";
            var car = $"{vehicle.Brand} {vehicle.Model}";
            return template
                .Replace("{Name}", name)
                .Replace("{InstallmentNumber}", inst.InstallmentNumber.ToString())
                .Replace("{Amount}", (inst.Amount - inst.PaidAmount).ToString("N0"))
                .Replace("{Currency}", currency)
                .Replace("{DueDate}", inst.DueDate.ToString("yyyy/MM/dd"))
                .Replace("{CarModel}", car);
        }

        private async Task<ReminderSettings> LoadSettingsAsync()
        {
            if (System.IO.File.Exists(_settingsPath))
            {
                try
                {
                    var json = await System.IO.File.ReadAllTextAsync(_settingsPath);
                    return JsonSerializer.Deserialize<ReminderSettings>(json) ?? new ReminderSettings();
                }
                catch
                {
                    return new ReminderSettings();
                }
            }
            return new ReminderSettings();
        }

        private async Task SaveSettingsAsync(ReminderSettings settings)
        {
            var dir = Path.GetDirectoryName(_settingsPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
            var json = JsonSerializer.Serialize(settings, new JsonSerializerOptions { WriteIndented = true });
            await System.IO.File.WriteAllTextAsync(_settingsPath, json);
        }
    }

    public class ReminderSettings
    {
        public string SmsProvider { get; set; } = "Simulator"; // Simulator, Twilio, WhatsApp
        public string TwilioAccountSid { get; set; } = string.Empty;
        public string TwilioAuthToken { get; set; } = string.Empty;
        public string TwilioFromNumber { get; set; } = string.Empty;
        public string WhatsAppToken { get; set; } = string.Empty;
        public string WhatsAppPhoneNumberId { get; set; } = string.Empty;

        public string DueTodayTemplate { get; set; } = "عزيزي العميل {Name}، نود تذكيركم بموعد استحقاق القسط رقم {InstallmentNumber} بمبلغ {Amount} {Currency} المستحق اليوم {DueDate} للسيارة {CarModel}. شكراً لكم، معرض الأصدقاء.";
        public string DueSoonTemplate { get; set; } = "تذكير: عزيزي العميل {Name}، يستحق القسط رقم {InstallmentNumber} بمبلغ {Amount} {Currency} في غضون 3 أيام بتاريخ {DueDate} للسيارة {CarModel}. معرض الأصدقاء.";
        public string OverdueTemplate { get; set; } = "تنبيه هام: عزيزي العميل {Name}، القسط رقم {InstallmentNumber} بمبلغ {Amount} {Currency} للسيارة {CarModel} متأخر منذ {DueDate}. يرجى السداد لتجنب الإجراءات القانونية. معرض الأصدقاء.";
    }
}
