using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Infrastructure.Identity;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    public class AuthController : ApiControllerBase
    {
        private readonly IdentityService _identityService;
        private readonly IApplicationDbContext _context;

        public AuthController(IdentityService identityService, IApplicationDbContext context)
        {
            _identityService = identityService;
            _context = context;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        [EnableRateLimiting("LoginPolicy")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest(new { success = false, message = "اسم المستخدم وكلمة المرور مطلوبان." });
            }

            var token = await _identityService.AuthenticateAsync(request.Username, request.Password);

            if (token == null)
            {
                return Unauthorized(new { success = false, message = "فشل تسجيل الدخول: اسم المستخدم أو كلمة المرور غير صحيحة." });
            }

            // جلب معلومات المستخدم وصلاحياته بالكامل من شجرة الأدوار
            var user = await _context.Users
                .Include(u => u.DefaultBranch)
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role!)
                .ThenInclude(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission!)
                .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

            if (user == null)
            {
                return NotFound(new { success = false, message = "المستخدم غير موجود." });
            }

            var permissions = new List<string>();
            var roleName = "Viewer";
            foreach (var ur in user.UserRoles)
            {
                if (ur.Role != null)
                {
                    roleName = ur.Role.Name;
                    foreach (var rp in ur.Role.RolePermissions)
                    {
                        if (rp.Permission != null)
                        {
                            permissions.Add(rp.Permission.Name);
                        }
                    }
                }
            }

            var branchesList = await _context.Branches
                .Where(b => b.IsActive)
                .Select(b => new
                {
                    id = b.Id,
                    name = b.Name,
                    is_main = b.Code == "HQ-01",
                    created_at = ""
                })
                .ToListAsync();

            var activeBranch = branchesList.FirstOrDefault(b => b.id == user.DefaultBranchId) ?? branchesList.FirstOrDefault();

            return Ok(new
            {
                success = true,
                message = "تم تسجيل الدخول بنجاح.",
                token = token,
                user = new
                {
                    id = user.Id,
                    username = user.Username,
                    role = roleName,
                    branch_id = user.DefaultBranchId,
                    can_access_all_branches = (roleName == "Owner" || roleName == "Admin" || roleName == "Accountant"),
                    is_active_user = user.IsActive,
                    permissions = permissions,
                    created_at = ""
                },
                branches = branchesList,
                active_branch = activeBranch
            });
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { success = false, message = "غير مصرح بالوصول." });
            }

            var user = await _context.Users
                .Include(u => u.DefaultBranch)
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role!)
                .ThenInclude(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission!)
                .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);

            if (user == null)
            {
                return NotFound(new { success = false, message = "المستخدم غير موجود." });
            }

            var permissions = new List<string>();
            var roleName = "Viewer";
            foreach (var ur in user.UserRoles)
            {
                if (ur.Role != null)
                {
                    roleName = ur.Role.Name;
                    foreach (var rp in ur.Role.RolePermissions)
                    {
                        if (rp.Permission != null)
                        {
                            permissions.Add(rp.Permission.Name);
                        }
                    }
                }
            }


            var branchesList = await _context.Branches
                .Where(b => b.IsActive)
                .Select(b => new
                {
                    id = b.Id,
                    name = b.Name,
                    is_main = b.Code == "HQ-01",
                    created_at = ""
                })
                .ToListAsync();

            var currentBranchClaim = User.FindFirst("BranchId")?.Value;
            Guid.TryParse(currentBranchClaim, out var activeBranchId);
            if (activeBranchId == Guid.Empty)
            {
                activeBranchId = user.DefaultBranchId;
            }

            var activeBranch = branchesList.FirstOrDefault(b => b.id == activeBranchId) ?? branchesList.FirstOrDefault();

            return Ok(new
            {
                success = true,
                user = new
                {
                    id = user.Id,
                    username = user.Username,
                    role = roleName,
                    branch_id = activeBranchId,
                    can_access_all_branches = (roleName == "Owner" || roleName == "Admin" || roleName == "Accountant"),
                    is_active_user = user.IsActive,
                    permissions = permissions,
                    created_at = ""
                },
                branches = branchesList,
                active_branch = activeBranch
            });
        }

        [HttpPost("switch-branch")]
        public async Task<IActionResult> SwitchBranch([FromForm] Guid branch_id)
        {
            if (branch_id == Guid.Empty)
                return BadRequest(new { success = false, message = "معرّف الفرع غير صالح." });

            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { success = false, message = "غير مصرح بالوصول." });
            }

            var user = await _context.Users
                .Include(u => u.DefaultBranch)
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);

            if (user == null)
            {
                return NotFound(new { success = false, message = "المستخدم غير موجود." });
            }

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branch_id && b.IsActive);
            if (branch == null)
            {
                return BadRequest(new { success = false, message = "الفرع المحدد غير موجود أو غير نشط." });
            }

            // توليد رمز JWT جديد يحتوي على معرّف الفرع الجديد في الادعاءات
            var newToken = _identityService.GenerateJwtToken(user, branch_id);

            var permissions = new List<string>();
            var roleName = "Viewer";
            
            var dbUserFull = await _context.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role!)
                .ThenInclude(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission!)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (dbUserFull != null)
            {
                foreach (var ur in dbUserFull.UserRoles)
                {
                    if (ur.Role != null)
                    {
                        roleName = ur.Role.Name;
                        foreach (var rp in ur.Role.RolePermissions)
                        {
                            if (rp.Permission != null)
                            {
                                permissions.Add(rp.Permission.Name);
                            }
                        }
                    }
                }
            }


            var branchesList = await _context.Branches
                .Where(b => b.IsActive)
                .Select(b => new
                {
                    id = b.Id,
                    name = b.Name,
                    is_main = b.Code == "HQ-01",
                    created_at = ""
                })
                .ToListAsync();

            var activeBranch = branchesList.FirstOrDefault(b => b.id == branch_id) ?? branchesList.FirstOrDefault();

            return Ok(new
            {
                success = true,
                message = "تم تبديل الفرع بنجاح.",
                token = newToken,
                user = new
                {
                    id = user.Id,
                    username = user.Username,
                    role = roleName,
                    branch_id = branch_id,
                    can_access_all_branches = (roleName == "Owner" || roleName == "Admin" || roleName == "Accountant"),
                    is_active_user = user.IsActive,
                    permissions = permissions,
                    created_at = ""
                },
                branches = branchesList,
                active_branch = activeBranch
            });
        }
    }

    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
