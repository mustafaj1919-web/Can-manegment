using System;

namespace CarShowroomManagementV2.Domain.Common
{
    public abstract class AuditableEntity : BaseEntity
    {
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? CreatedBy { get; set; }
        public DateTime? LastModifiedAt { get; set; }
        public string? LastModifiedBy { get; set; }
        public Guid BranchId { get; set; }

        // Soft Delete — السجل يبقى في DB لكن يُخفى تلقائياً بدلاً من الحذف النهائي
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
