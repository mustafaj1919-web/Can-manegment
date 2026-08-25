using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    // تفاعل مع عميل (اتصال، زيارة، واتساب، تجربة قيادة...)
    public class CrmInteraction : AuditableEntity
    {
        public Guid CustomerId { get; set; }
        public Guid? EmployeeId { get; set; }
        public string InteractionType { get; set; } = "call"; // call/whatsapp/visit/test_drive/email/other
        public string? Notes { get; set; }
        public string? Outcome { get; set; } // interested/not_interested/follow_up/closed
        public DateTime? FollowUpDate { get; set; }
        public DateTime InteractionDate { get; set; } = DateTime.UtcNow;
    }
}
