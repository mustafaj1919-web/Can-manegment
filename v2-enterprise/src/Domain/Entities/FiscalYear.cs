using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class FiscalYear : AuditableEntity
    {
        public int Year { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; } = "Open"; // Open | Closed
        public Guid? ClosingJournalEntryId { get; set; }
        public string? Notes { get; set; }
    }
}
