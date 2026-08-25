using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    // ربط نوع مصروف السيارة (شحن، تخليص، فحص، تجهيز...) بحساب مصروفات محدد بشجرة الحسابات
    public class VehicleCostAccountMapping : AuditableEntity
    {
        public string CostType { get; set; } = string.Empty;
        public Guid AccountId { get; set; }

        public virtual Account? Account { get; set; }
    }
}
