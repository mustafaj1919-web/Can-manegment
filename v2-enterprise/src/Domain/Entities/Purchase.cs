using System;
using CarShowroomManagementV2.Domain.Common;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class Purchase : AuditableEntity
    {
        public string PurchaseNumber { get; set; } = string.Empty; // رقم فاتورة الشراء الفريد
        public PurchaseSourceType SourceType { get; set; } = PurchaseSourceType.Supplier; // مصدر الشراء: مورد أو زبون
        public Guid? SupplierId { get; set; }
        public Guid? CustomerId { get; set; }
        public Guid? PreviousSaleContractId { get; set; } // عقد البيع السابق في حال إعادة الشراء (Buyback)
        public Guid VehicleId { get; set; }
        public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;

        public decimal PurchaseCost { get; set; } // تكلفة الشراء الأساسية
        public decimal AmountPaid { get; set; } // المبلغ المدفوع فعلياً حتى الآن
        public PaymentMethod PaymentMethod { get; set; } // طريقة الدفع المعتمدة للشراء
        public string Status { get; set; } = "Active"; // Active, Cancelled

        // العملة المعتمدة لفاتورة الشراء وقت الإنشاء — لا تتأثر بتغيّر عملة السيارة لاحقاً
        public string? Currency { get; set; }

        // علاقات التنقل
        public virtual Supplier? Supplier { get; set; }
        public virtual Customer? Customer { get; set; }
        public virtual SalesContract? PreviousSaleContract { get; set; }
        public virtual Vehicle? Vehicle { get; set; }
    }
}
