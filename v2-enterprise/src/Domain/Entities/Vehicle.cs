using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class Vehicle : AuditableEntity
    {
        public string? Brand { get; set; }
        public string Model { get; set; } = string.Empty;
        public string? Trim { get; set; }
        public string ChassisNumber { get; set; } = string.Empty; // رقم الشاسيه (فريد)
        public string? EngineNumber { get; set; }
        public string? Color { get; set; }
        public int Year { get; set; }
        public string? Condition { get; set; } // New, Used, Damaged, Salvage
        public string? PlateNumber { get; set; }
        public string? PlateStatus { get; set; } // No Plate, Temporary, Registered
        public int? Mileage { get; set; }
        public string? EngineSize { get; set; }
        public int? Cylinders { get; set; }
        public string? Transmission { get; set; } // Automatic, Manual, CVT, DCT
        public string? FuelType { get; set; } // Gasoline, Diesel, Hybrid, Electric
        public string? ImportCountry { get; set; }
        public int? SeatCount { get; set; }
        public string? SeatMaterial { get; set; }
        public string Currency { get; set; } = "IQD";
        public string? Notes { get; set; }

        // تكلفة السيارة (Vehicle Costing)
        public decimal PurchaseCost { get; set; } = 0; // سعر الشراء الأساسي
        public decimal CustomDuties { get; set; } = 0; // الرسوم الجمركية
        public decimal MaintenanceCost { get; set; } = 0; // تكاليف الصيانة والتحسينات

        public decimal TotalCost => PurchaseCost + CustomDuties + MaintenanceCost; // إجمالي التكلفة الفعلية
        public decimal BookValue { get; set; } = 0; // القيمة الدفترية الحالية للسيارة (تزداد بالتكاليف)
        public decimal TargetSellingPrice { get; set; } = 0; // سعر البيع المستهدف
        public bool IsSold { get; set; } = false;
        public string Status { get; set; } = "Available"; // Available, Sold, Reserved

        // علاقات التنقل
        public virtual ICollection<VehicleImage> Images { get; set; } = new List<VehicleImage>();
        public virtual ICollection<VehicleCost> DetailedCosts { get; set; } = new List<VehicleCost>();
        public virtual ICollection<VehicleStatusHistory> StatusHistory { get; set; } = new List<VehicleStatusHistory>();
    }
}
