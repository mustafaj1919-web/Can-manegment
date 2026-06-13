using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class Supplier : AuditableEntity
    {
        public string Name { get; set; } = string.Empty; // اسم المورد
        public string Code { get; set; } = string.Empty; // كود المورد الفريد
        public string Phone { get; set; } = string.Empty; // هاتف المورد
        public string? Address { get; set; } // عنوان المورد
        public string? Notes { get; set; } // ملاحظات إضافية
        public bool IsActive { get; set; } = true;

        // ربط الحساب المحاسبي (Subledger تحت 2101)
        public Guid AccountId { get; set; }
        public virtual Account? Account { get; set; }
    }
}
