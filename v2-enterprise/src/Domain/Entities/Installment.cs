using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class Installment : AuditableEntity
    {
        public Guid InstallmentPlanId { get; set; }
        public int InstallmentNumber { get; set; } // رقم الدفعة (مثال: 1, 2...)
        public DateTime DueDate { get; set; } // تاريخ استحقاق الدفعة
        public decimal Amount { get; set; } // قيمة القسط المستحقة
        public decimal PaidAmount { get; set; } = 0; // المبلغ الذي تم سداده فعلياً
        public string Status { get; set; } = "Pending"; // Pending, Paid, PartiallyPaid, Overdue, Cancelled
        public DateTime? PaymentDate { get; set; } // تاريخ السداد المالي الفعلي
        public bool IsProfitRecognized { get; set; } = false;

        // علاقة التنقل
        public virtual InstallmentPlan? InstallmentPlan { get; set; }
    }
}
