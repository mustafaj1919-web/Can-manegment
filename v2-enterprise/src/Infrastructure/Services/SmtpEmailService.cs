using System.Net;
using System.Net.Mail;
using CarShowroomManagementV2.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CarShowroomManagementV2.Infrastructure.Services;

public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    private SmtpClient BuildClient()
    {
        var host    = _config["Email:SmtpHost"] ?? "smtp.gmail.com";
        var port    = int.TryParse(_config["Email:SmtpPort"], out var p) ? p : 587;
        var user    = _config["Email:Username"] ?? "";
        var pass    = _config["Email:Password"] ?? "";
        var ssl     = bool.TryParse(_config["Email:EnableSsl"], out var s) ? s : true;

        var client = new SmtpClient(host, port)
        {
            EnableSsl = ssl,
            Credentials = new NetworkCredential(user, pass),
            DeliveryMethod = SmtpDeliveryMethod.Network
        };
        return client;
    }

    public async Task SendOverdueInstallmentReminderAsync(
        string toEmail, string customerName,
        int installmentNumber, decimal remainingAmount, DateTime dueDate,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_config["Email:Username"])) return;
        try
        {
            var fromName  = _config["Email:FromName"] ?? "المعرض";
            var fromEmail = _config["Email:FromEmail"] ?? _config["Email:Username"] ?? "";

            var msg = new MailMessage
            {
                From       = new MailAddress(fromEmail, fromName),
                Subject    = $"تذكير: قسط متأخر رقم {installmentNumber}",
                IsBodyHtml = true,
                Body       = $@"
<div dir='rtl' style='font-family:Arial;padding:20px'>
  <h2>تذكير بالقسط المتأخر</h2>
  <p>عزيزي/عزيزتي <strong>{customerName}</strong>،</p>
  <p>نودّ تذكيركم بأن القسط رقم <strong>{installmentNumber}</strong> المستحق بتاريخ
     <strong>{dueDate:dd/MM/yyyy}</strong> لم يتم سداده بعد.</p>
  <p>المبلغ المتبقي: <strong>{remainingAmount:N0} د.ع</strong></p>
  <p>يرجى التواصل معنا لترتيب السداد في أقرب وقت.</p>
  <br/><p>مع التقدير</p>
</div>"
            };
            msg.To.Add(toEmail);

            using var client = BuildClient();
            await Task.Run(() => client.Send(msg), cancellationToken);
            _logger.LogInformation("Email sent to {Email} for installment {Num}", toEmail, installmentNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", toEmail);
        }
    }

    public async Task<bool> SendTestEmailAsync(string toEmail, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_config["Email:Username"])) return false;
        try
        {
            var fromName  = _config["Email:FromName"] ?? "المعرض";
            var fromEmail = _config["Email:FromEmail"] ?? _config["Email:Username"] ?? "";
            var msg = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = "اختبار إعداد البريد",
                Body = "تم إعداد البريد الإلكتروني بنجاح.",
                IsBodyHtml = false
            };
            msg.To.Add(toEmail);
            using var client = BuildClient();
            await Task.Run(() => client.Send(msg), cancellationToken);
            return true;
        }
        catch { return false; }
    }
}
