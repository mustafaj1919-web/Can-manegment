using System;
using System.IO;
using System.Text.Json;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using CarShowroomManagementV2.Application.Common.Interfaces;
using System.Net.Http;
using System.Linq;

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

        // Try to load notifications settings from storage/notification_settings.json
        var settingsPath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "notification_settings.json");
        string? whatsAppToken = null;
        string? phoneNumberId = null;

        if (File.Exists(settingsPath))
        {
            try
            {
                var json = await File.ReadAllTextAsync(settingsPath);
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("WhatsAppToken", out var tokenProp))
                    whatsAppToken = tokenProp.GetString();
                if (doc.RootElement.TryGetProperty("WhatsAppPhoneNumberId", out var idProp))
                    phoneNumberId = idProp.GetString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to read WhatsApp token/ID from settings file.");
            }
        }

        if (!string.IsNullOrEmpty(whatsAppToken) && !string.IsNullOrEmpty(phoneNumberId))
        {
            try
            {
                // Format the telephone number (only digits, strip leading zero if present, prefix with country code)
                var cleanedPhone = new string(phone.Where(char.IsDigit).ToArray());
                if (cleanedPhone.StartsWith("0"))
                {
                    cleanedPhone = "964" + cleanedPhone.Substring(1);
                }
                else if (!cleanedPhone.StartsWith("964") && cleanedPhone.Length == 10)
                {
                    cleanedPhone = "964" + cleanedPhone;
                }

                using var client = new HttpClient();
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", whatsAppToken);

                var payload = new
                {
                    messaging_product = "whatsapp",
                    recipient_type = "individual",
                    to = cleanedPhone,
                    type = "text",
                    text = new { body = message }
                };

                var jsonPayload = JsonSerializer.Serialize(payload);
                using var content = new StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");

                var response = await client.PostAsync(
                    $"https://graph.facebook.com/v18.0/{phoneNumberId}/messages", 
                    content
                );

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("WhatsApp message sent successfully to {Phone}", cleanedPhone);
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to send WhatsApp message. Status: {Status}, Error: {Error}", response.StatusCode, errorContent);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while calling Meta WhatsApp Cloud API.");
                return false;
            }
        }

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
