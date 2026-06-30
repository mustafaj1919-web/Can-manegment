using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class JournalLine : BaseEntity
    {
        public Guid JournalEntryId { get; set; }
        public Guid AccountId { get; set; }
        public decimal Debit { get; set; } = 0;
        public decimal Credit { get; set; } = 0;
        public string? Description { get; set; } // البيان التفصيلي لهذا السطر
        public Guid? VehicleId { get; set; }

        // علاقات التنقل
        public virtual JournalEntry? JournalEntry { get; set; }
        public virtual Account? Account { get; set; }
        public virtual Vehicle? Vehicle { get; set; }
    }
}
