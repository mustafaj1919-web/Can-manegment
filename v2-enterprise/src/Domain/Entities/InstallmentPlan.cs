using System;
using System.Collections.Generic;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class InstallmentPlan : AuditableEntity
    {
        public Guid? SalesContractId { get; set; }  // null when it's a supplier purchase plan
        public Guid? PurchaseId { get; set; }         // set when linked to a supplier purchase

        public decimal TotalAmount { get; set; } // المبلغ المتبقي الأصلي للتقسيط (قبل الأرباح المضافة)
        public decimal DownPayment { get; set; } // الدفعة الأولى المسددة
        public int InstallmentPeriodMonths { get; set; } // مدة التقسيط بالأشهر
        public decimal ProfitRatePercentage { get; set; } // نسبة الربح السنوية أو الكلية
        public decimal TotalProfit { get; set; } // إجمالي الأرباح المحتسبة والمضافة
        public decimal TotalPlanAmount { get; set; } // إجمالي مبلغ خطة التقسيط شامل الأرباح
        public decimal MonthlyInstallmentAmount { get; set; } // مبلغ القسط الشهري الثابت

        public string Status { get; set; } = "Active"; // Active, Completed, Cancelled

        // علاقات التنقل
        public virtual SalesContract? SalesContract { get; set; }
        public virtual Purchase? Purchase { get; set; }  // linked to supplier purchase when PurchaseId is set
        public virtual ICollection<Installment> Installments { get; set; } = new List<Installment>();
    }
}
