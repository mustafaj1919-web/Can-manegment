using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    // عمولة موظف على عملية بيع
    public class EmployeeCommission : AuditableEntity
    {
        public Guid EmployeeId { get; set; }
        public Guid? SaleId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "IQD";
        public bool IsPaid { get; set; } = false;
        public string? Description { get; set; }
    }

    // هدف موظف لفترة معينة
    public class EmployeeTarget : AuditableEntity
    {
        public Guid EmployeeId { get; set; }
        public string Period { get; set; } = string.Empty; // مثل 2026-06
        public int TargetSalesCount { get; set; }
        public decimal TargetRevenue { get; set; }
        public decimal TargetProfit { get; set; }
        public string Currency { get; set; } = "IQD";
    }
}
