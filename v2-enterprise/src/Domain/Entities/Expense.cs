using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    // مصروف تشغيلي عام (إيجار، رواتب، خدمات...). سجل قائم بذاته معزول بالفرع.
    public class Expense : AuditableEntity
    {
        public string Title { get; set; } = string.Empty;       // وصف/عنوان المصروف
        public decimal Amount { get; set; }                      // قيمة المصروف
        public string Currency { get; set; } = "IQD";            // العملة USD | IQD
        public string? Category { get; set; }                    // تصنيف المصروف
        public string? Notes { get; set; }                       // ملاحظات
        public DateTime ExpenseDate { get; set; } = DateTime.UtcNow; // تاريخ المصروف
    }
}
