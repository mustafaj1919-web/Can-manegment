using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class AuditLog : BaseEntity
    {
        public string? UserId { get; set; } // هوية المستخدم القائم بالعملية
        public string Action { get; set; } = string.Empty; // مثل Insert, Update, Delete
        public string TableName { get; set; } = string.Empty; // اسم الجدول المتأثر
        public string PrimaryKey { get; set; } = string.Empty; // المعرف الأساسي للسجل المتأثر
        public string? OldValues { get; set; } // القيم القديمة بصيغة JSON
        public string? NewValues { get; set; } // القيم الجديدة بصيغة JSON
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public Guid BranchId { get; set; } // الفرع الذي تمت فيه العملية
    }
}
