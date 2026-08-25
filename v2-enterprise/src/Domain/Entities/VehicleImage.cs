using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class VehicleImage : BaseEntity
    {
        public Guid VehicleId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        // علاقات التنقل
        public virtual Vehicle? Vehicle { get; set; }
    }
}
