using System;
using System.IO;
using System.Text.Json;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.Infrastructure.Services;

public class MessageNotificationService : IMessageNotificationService
{
    private readonly IConfiguration _config;
    private readonly ILogger<MessageNotificationService> _logger;
    private readonly string _storageDir;
    private readonly string _historyFilePath;

    public MessageNotificationService(IConfiguration config, ILogger<MessageNotificationService> logger)
    {
        _config = config;
        _logger = logger;
        
        // Define directory relative to current application directory
        _storageDir = Path.Combine(Directory.GetCurrentDirectory(), "storage");
        _historyFilePath = Path.Combine(_storageDir, "sent_messages.json");
    }

    public async Task<bool> SendSmsAsync(string phone, string message)
    {
        _logger.LogInformation("Sending SMS to {Phone}: {Message}", phone, message);

        // Add to simulator file
        await AppendToHistoryAsync(phone, message, "sms");

        // Here we can configure real Twilio/HTTP gate in future:
        // var provider = _config["SmsSettings:Provider"] ?? "Simulator";
        // if (provider == "Twilio") { ... }

        return true;
    }

    public async Task<bool> SendWhatsAppAsync(string phone, string message, string? documentUrl = null)
    {
        _logger.LogInformation("Sending WhatsApp to {Phone}: {Message} (Document: {Doc})", phone, message, documentUrl ?? "None");

        // Add to simulator file
        await AppendToHistoryAsync(phone, message, "whatsapp");

        return true;
    }

    private async Task AppendToHistoryAsync(string phone, string message, string type)
    {
        try
        {
            if (!Directory.Exists(_storageDir))
            {
                Directory.CreateDirectory(_storageDir);
            }

            List<SentMessageRecord> history;

            if (File.Exists(_historyFilePath))
            {
                var existingJson = await File.ReadAllTextAsync(_historyFilePath);
                try
                {
                    history = JsonSerializer.Deserialize<List<SentMessageRecord>>(existingJson) ?? new List<SentMessageRecord>();
                }
                catch
                {
                    history = new List<SentMessageRecord>();
                }
            }
            else
            {
                history = new List<SentMessageRecord>();
            }

            history.Insert(0, new SentMessageRecord
            {
                Id = Guid.NewGuid(),
                Phone = phone,
                Message = message,
                Type = type,
                Status = "Sent",
                Timestamp = DateTime.UtcNow
            });

            var newJson = JsonSerializer.Serialize(history, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(_historyFilePath, newJson);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write sent message to history log file.");
        }
    }

    public class SentMessageRecord
    {
        public Guid Id { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = "Sent";
        public DateTime Timestamp { get; set; }
    }
}
