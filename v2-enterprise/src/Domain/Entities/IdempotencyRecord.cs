using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class IdempotencyRecord : AuditableEntity
    {
        public string OperationType { get; set; } = string.Empty; // e.g. "InstallmentPayment"
        public string IdempotencyKey { get; set; } = string.Empty; // Client UUID
        public string RequestHash { get; set; } = string.Empty; // SHA256 normalized hash
        public string Status { get; set; } = "Processing"; // Processing | Completed | FailedRetryable | FailedFinal | Expired
        public Guid? PaymentId { get; set; }
        public Guid? ReceiptId { get; set; }
        public string? FailureCode { get; set; }
        public string? FailureMessage { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
    }
}
