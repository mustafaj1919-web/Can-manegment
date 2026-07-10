using System;
using System.Collections.Generic;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    // محادثة عميل حول سيارة محددة، من تطبيق الموبايل. غير مرتبطة بفرع —
    // العميل يرى محادثاته فقط، والمدير (بالاسم) يرى كل المحادثات ويرد عليها.
    public class Conversation : BaseEntity
    {
        public Guid VehicleId { get; set; }
        public virtual Vehicle? Vehicle { get; set; }

        // مالك المحادثة: إما عميل حقيقي (Customer) أو مستخدم Google غير مربوط (AppUser)
        public Guid? CustomerId { get; set; }
        public virtual Customer? Customer { get; set; }
        public Guid? AppUserId { get; set; }
        public virtual AppUser? AppUser { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<Message> Messages { get; set; } = new List<Message>();
    }
}
