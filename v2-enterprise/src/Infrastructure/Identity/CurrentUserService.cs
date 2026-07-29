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
                var branchClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("BranchId")?.Value;
                return Guid.TryParse(branchClaim, out var guid) ? guid : Guid.Empty;
            }
        }

        public bool CanSeeAllBranches
        {
            get
            {
                var canSeeAllClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("CanSeeAllBranches")?.Value;
                return canSeeAllClaim != null && canSeeAllClaim.Equals("true", StringComparison.OrdinalIgnoreCase);
            }
        }
    }
}
