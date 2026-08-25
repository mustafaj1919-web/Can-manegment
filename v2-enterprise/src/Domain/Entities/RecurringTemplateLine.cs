using System;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class RecurringTemplateLine
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TemplateId { get; set; }
        public string AccountCode { get; set; } = string.Empty;
        public string AccountName { get; set; } = string.Empty;
        public bool IsDebit { get; set; }
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public int SortOrder { get; set; }
        public virtual RecurringJournalTemplate? Template { get; set; }
    }
}
