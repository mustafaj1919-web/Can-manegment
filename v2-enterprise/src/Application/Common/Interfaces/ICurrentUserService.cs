using System;

namespace CarShowroomManagementV2.Application.Common.Interfaces
{
    public interface ICurrentUserService
    {
        string? UserId { get; }
        Guid BranchId { get; } // فرع المستخدم الحالي الفعال لتصفية البيانات
    }
}
