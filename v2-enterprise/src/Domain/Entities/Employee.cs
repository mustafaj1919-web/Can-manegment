using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    // موظف المعرض (مندوب مبيعات، محاسب، ...). معزول بالفرع.
    public class Employee : AuditableEntity
    {
        public string FullName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? IdNumber { get; set; }
        public string? Address { get; set; }
        public string? Title { get; set; }            // المسمى الوظيفي
        public bool IsActive { get; set; } = true;
        public string? SignatureFilename { get; set; } // ملف التوقيع إن وُجد
    }
}
