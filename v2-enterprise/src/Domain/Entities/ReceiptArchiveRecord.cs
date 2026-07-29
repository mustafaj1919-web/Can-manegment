using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class ReceiptArchiveRecord : AuditableEntity
    {
        public Guid PaymentId { get; set; }
        public string ReceiptNumber { get; set; } = string.Empty;
        public string ArchiveStatus { get; set; } = "Pending"; // Pending | Uploaded | ManuallyConfirmed | Failed
        public string ArchiveMethod { get; set; } = string.Empty; // ManuallyConfirmed | Uploaded | Automatic
        public string? StorageReference { get; set; }
        public string? DocumentFileName { get; set; }
        public string? ConfirmedByUserId { get; set; }
        public string? ConfirmedByUserName { get; set; }
        public DateTime? ConfirmedAt { get; set; }
        public string? Notes { get; set; }

        public virtual Payment? Payment { get; set; }
    }
}
