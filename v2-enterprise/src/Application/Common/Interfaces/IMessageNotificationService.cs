using System.Threading.Tasks;

namespace CarShowroomManagementV2.Application.Common.Interfaces;

public interface IMessageNotificationService
{
    Task<bool> SendSmsAsync(string phone, string message);
    Task<bool> SendWhatsAppAsync(string phone, string message, string? documentUrl = null);
}
