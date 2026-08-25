using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class Message : BaseEntity
    {
        public Guid ConversationId { get; set; }
        public virtual Conversation? Conversation { get; set; }

        // "Customer" أو "Admin" — يحدد جهة الإرسال داخل فقاعات الدردشة
        public string SenderType { get; set; } = "Customer";
        public string SenderName { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public bool IsRead { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
