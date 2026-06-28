using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.Infrastructure.Identity
{
    public class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public string? UserId => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        public Guid BranchId
        {
            get
            {
                var branchClaim = _httpContextAccessor.HttpContext?.User?.FindFirstValue("BranchId");
                if (Guid.TryParse(branchClaim, out var branchId))
                    return branchId;
                return Guid.Parse("11111111-1111-1111-1111-111111111111");
            }
        }

        public bool CanSeeAllBranches
        {
            get
            {
                var claim = _httpContextAccessor.HttpContext?.User?.FindFirstValue("CanSeeAllBranches");
                return claim == "true";
            }
        }
    }
}
