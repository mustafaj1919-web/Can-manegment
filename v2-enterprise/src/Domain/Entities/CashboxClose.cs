using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class CashboxClose : BaseEntity
    {
        public DateTime CloseDate { get; set; }
        public Guid? BranchId { get; set; }
        public string AccountCode { get; set; } = string.Empty;
        public string AccountName { get; set; } = string.Empty;
        public decimal SystemBalance { get; set; }
        public decimal ActualBalance { get; set; }
        public decimal Difference { get; set; }
        public string? Note { get; set; }
        public string? ClosedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
