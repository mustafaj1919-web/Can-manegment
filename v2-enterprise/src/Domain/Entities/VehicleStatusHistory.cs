using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    /// <summary>
    /// سجل تاريخ تغيير حالة السيارة — يُسجَّل تلقائياً عند كل تغيير لحقل Status
    /// </summary>
    public class VehicleStatusHistory : BaseEntity
    {
        public Guid VehicleId { get; set; }
        public virtual Vehicle? Vehicle { get; set; }

        public string? OldStatus { get; set; }   // الحالة السابقة
        public string NewStatus { get; set; } = string.Empty; // الحالة الجديدة

        public string? ChangedBy { get; set; }   // اسم المستخدم الذي غيّر الحالة
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
        public string? Notes { get; set; }
        public Guid BranchId { get; set; }
    }
}
