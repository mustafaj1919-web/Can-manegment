namespace CarShowroomManagementV2.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendOverdueInstallmentReminderAsync(
        string toEmail, string customerName,
        int installmentNumber, decimal remainingAmount, DateTime dueDate,
        CancellationToken cancellationToken = default);

    Task<bool> SendTestEmailAsync(string toEmail, CancellationToken cancellationToken = default);
}
