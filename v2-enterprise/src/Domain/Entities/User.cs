using System;
using System.Collections.Generic;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class User : BaseEntity
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public Guid DefaultBranchId { get; set; } // الفرع الافتراضي للمستخدم
        public bool IsActive { get; set; } = true;

        // علاقات التنقل
        public virtual Branch? DefaultBranch { get; set; }
        public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    }
}
