using System;
using CarShowroomManagementV2.Domain.Common;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class Purchase : AuditableEntity
    {
        public string PurchaseNumber { get; set; } = string.Empty; // رقم فاتورة الشراء الفريد
        public Guid SupplierId { get; set; }
        public Guid VehicleId { get; set; }
        public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;

        public decimal PurchaseCost { get; set; } // تكلفة الشراء الأساسية
        public PaymentMethod PaymentMethod { get; set; } // طريقة الدفع المعتمدة للشراء
        public string Status { get; set; } = "Active"; // Active, Cancelled

        // علاقات التنقل
        public virtual Supplier? Supplier { get; set; }
        public virtual Vehicle? Vehicle { get; set; }
    }
}
