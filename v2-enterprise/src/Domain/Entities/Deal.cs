using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    // صفقة في خط أنابيب المبيعات (Pipeline)
    public class Deal : AuditableEntity
    {
        public Guid CustomerId { get; set; }
        public Guid? VehicleId { get; set; }
        public Guid? AssignedToId { get; set; }   // الموظف المسؤول
        public Guid? SaleId { get; set; }          // عقد البيع عند الإتمام
        public string Stage { get; set; } = "lead"; // lead/contacted/test_drive/negotiating/reserved/won/lost
        public decimal? ExpectedPrice { get; set; }
        public string Currency { get; set; } = "IQD";
        public string? Notes { get; set; }
        public string? LostReason { get; set; }
        public DateTime StageChangedAt { get; set; } = DateTime.UtcNow;
    }
}
