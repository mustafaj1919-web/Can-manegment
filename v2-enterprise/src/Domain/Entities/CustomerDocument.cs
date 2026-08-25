using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class CustomerDocument : BaseEntity
    {
        public Guid CustomerId { get; set; }
        public string DocumentType { get; set; } = string.Empty; // id_front, id_back, document_photo, etc.
        public string FileName { get; set; } = string.Empty; // اسم الملف المشفر المخزن في storage/private/customers
        public string? OriginalFileName { get; set; } // الاسم الأصلي للملف المرفوع
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        // علاقات التنقل
        public virtual Customer? Customer { get; set; }
    }
}
