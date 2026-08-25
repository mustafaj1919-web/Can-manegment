using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class VehicleCost : BaseEntity
    {
        public Guid VehicleId { get; set; }
        public string CostType { get; set; } = string.Empty; // shipping, clearance, inspection, preparation, other, maintenance
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // علاقات التنقل
        public virtual Vehicle? Vehicle { get; set; }
    }
}
