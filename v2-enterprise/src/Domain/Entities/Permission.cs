using System.Collections.Generic;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class Permission : BaseEntity
    {
        public string Name { get; set; } = string.Empty; // مثل "Accounting.CreateJournalEntry"
        public string Description { get; set; } = string.Empty;

        // علاقات التنقل
        public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    }
}
