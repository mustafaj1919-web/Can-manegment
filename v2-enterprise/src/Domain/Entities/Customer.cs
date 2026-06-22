using System;
using System.Collections.Generic;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class Customer : AuditableEntity
    {
        public string Name { get; set; } = string.Empty; // الاسم التجاري أو المختصر
        public string? FullName { get; set; } // الاسم الكامل للعميل
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? IdType { get; set; } // نوع الهوية (البطاقة الوطنية، جواز سفر...)
        public string IdNumber { get; set; } = string.Empty; // رقم الهوية الفريد
        public DateTime? IdIssueDate { get; set; }
        public DateTime? IdExpiryDate { get; set; }
        public string? Nationality { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string CustomerType { get; set; } = "Individual"; // Individual or Company
        public string? Notes { get; set; }

        // ربط الحساب المحاسبي (Subledger)
        public Guid AccountId { get; set; }
        public virtual Account? Account { get; set; }

        // علاقات التنقل
        public virtual ICollection<CustomerDocument> Documents { get; set; } = new List<CustomerDocument>();
    }
}
