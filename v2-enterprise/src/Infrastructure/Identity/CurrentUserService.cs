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

        public Guid BranchId => Guid.Parse("22222222-2222-2222-2222-222222222222");

        public bool CanSeeAllBranches => true;
    }
}
