using System;
using System.Collections.Generic;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class RecurringJournalTemplate : AuditableEntity
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Frequency { get; set; } = "Monthly"; // Monthly, Quarterly, Yearly
        public int DayOfMonth { get; set; } = 1;
        public bool IsActive { get; set; } = true;
        public DateTime? LastRunAt { get; set; }
        public virtual ICollection<RecurringTemplateLine> Lines { get; set; } = new List<RecurringTemplateLine>();
    }
}
