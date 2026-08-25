using System;
using System.Collections.Generic;
using System.Linq;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class JournalEntry : AuditableEntity
    {
        public string EntryNumber { get; set; } = string.Empty; // رقم القيد التسلسلي الفريد
        public DateTime EntryDate { get; set; } = DateTime.UtcNow;
        public string Description { get; set; } = string.Empty; // البيان الإجمالي للقيد
        public bool IsPosted { get; set; } = false; // هل تم ترحيله للحسابات الختامية
        public bool IsReversed { get; set; } = false; // هل تم عكسه
        public Guid? ReversedEntryId { get; set; } // معرّف القيد الأصلي في حالة قيد تسوية عكسي
        
        // المرجعية للعمليات والمستندات المصدرية
        public string? ReferenceType { get; set; } // مثل "Vehicle", "Payment", "VehicleCost"
        public Guid? ReferenceId { get; set; } // معرف المستند المصدر

        // علاقات التنقل
        public virtual JournalEntry? ReversedEntry { get; set; }
        public virtual ICollection<JournalLine> Lines { get; set; } = new List<JournalLine>();

        // التحقق من توازن القيد المحاسبي
        public bool IsBalanced => TotalDebit == TotalCredit;
        public decimal TotalDebit => Lines.Sum(l => l.Debit);
        public decimal TotalCredit => Lines.Sum(l => l.Credit);
    }
}
