using System;
using System.Collections.Generic;
using CarShowroomManagementV2.Domain.Common;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class Account : AuditableEntity
    {
        public string AccountCode { get; set; } = string.Empty; // رمز الحساب المحاسبي (مثال: 1101001)
        public string Name { get; set; } = string.Empty; // اسم الحساب باللغة العربية أو الإنجليزية
        public AccountType Type { get; set; }
        public Guid? ParentAccountId { get; set; } // الحساب الأب للهيكلية الشجرية
        public bool IsActive { get; set; } = true;
        public string? Description { get; set; }

        // علاقات التنقل
        public virtual Account? ParentAccount { get; set; }
        public virtual ICollection<Account> ChildAccounts { get; set; } = new List<Account>();
    }
}
