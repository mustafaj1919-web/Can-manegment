using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    // مستخدم دخل عبر Google Sign-In من تطبيق الموبايل. غير مرتبط بفرع أو محاسبة —
    // يُستخدم للتصفح فقط إلى أن يُربط يدوياً بحساب Customer حقيقي عند توقيع عقد.
    public class AppUser : BaseEntity
    {
        public string GoogleId { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? PhotoUrl { get; set; }
        public Guid? LinkedCustomerId { get; set; }
        public virtual Customer? LinkedCustomer { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
