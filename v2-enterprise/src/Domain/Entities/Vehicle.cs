using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class Vehicle : AuditableEntity
    {
        public string Model { get; set; } = string.Empty;
        public string ChassisNumber { get; set; } = string.Empty; // رقم الشاسيه (فريد)
        public string? EngineNumber { get; set; }
        public string? Color { get; set; }
        public int Year { get; set; }
        
        // تكلفة السيارة (Vehicle Costing)
        public decimal PurchaseCost { get; set; } = 0; // سعر الشراء الأساسي
        public decimal CustomDuties { get; set; } = 0; // الرسوم الجمركية
        public decimal MaintenanceCost { get; set; } = 0; // تكاليف الصيانة والتحسينات

        public decimal TotalCost => PurchaseCost + CustomDuties + MaintenanceCost; // إجمالي التكلفة الفعلية
        public decimal BookValue { get; set; } = 0; // القيمة الدفترية الحالية للسيارة (تزداد بالتكاليف)
        public decimal TargetSellingPrice { get; set; } = 0; // سعر البيع المستهدف
        public bool IsSold { get; set; } = false;
        public string Status { get; set; } = "Available"; // Available, Sold, UnderMaintenance, Reserved

        // علاقات التنقل
        public virtual ICollection<VehicleImage> Images { get; set; } = new List<VehicleImage>();
        public virtual ICollection<VehicleCost> DetailedCosts { get; set; } = new List<VehicleCost>();
    }
}
