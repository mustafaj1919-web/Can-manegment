using System;
using CarShowroomManagementV2.Domain.Common;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class Payment : AuditableEntity
    {
        public PaymentType Type { get; set; }
        public PaymentMethod Method { get; set; }
        public decimal Amount { get; set; }
        public string ReferenceNumber { get; set; } = string.Empty; // رقم السند / الشيك / الحوالة
        public string Description { get; set; } = string.Empty;
        
        public Guid AccountId { get; set; } // حساب الصندوق أو البنك المتأثر
        public Guid ContraAccountId { get; set; } // الحساب المقابل (مثل العميل أو المورد)
        public Guid? JournalEntryId { get; set; } // القيد المحاسبي المولد تلقائياً

        // علاقات التنقل
        public virtual Account? Account { get; set; }
        public virtual Account? ContraAccount { get; set; }
        public virtual JournalEntry? JournalEntry { get; set; }
    }
}
