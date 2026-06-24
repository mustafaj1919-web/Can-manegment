using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class Branch : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty; // رمز الفرع للربط المالي والمحاسبي
        public string? Address { get; set; }
        public string? PhoneNumber { get; set; }
        public string? VatNumber { get; set; } // الرقم الضريبي للمنشأة/الفرع
        public string? TaxName { get; set; } // الاسم الضريبي للمنشأة/الفرع
        public bool IsActive { get; set; } = true;
    }
}
