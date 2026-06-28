using System;

namespace CarShowroomManagementV2.Application.Common.Interfaces
{
    public interface ICurrentUserService
    {
        string? UserId { get; }
        Guid BranchId { get; }
        bool CanSeeAllBranches { get; }
    }
}
