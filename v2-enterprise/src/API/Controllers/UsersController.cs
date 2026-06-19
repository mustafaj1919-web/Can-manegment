using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Infrastructure.Identity;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize(Roles = "Owner,Admin")]
    public class UsersController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly IdentityService _identityService;

        public UsersController(IApplicationDbContext context, IdentityService identityService)
        {
            _context = context;
            _identityService = identityService;
        }

        private static string? ValidatePasswordComplexity(string password)
        {
            if (password.Length < 8)
                return "كلمة المرور يجب أن تكون 8 أحرف على الأقل.";
            if (!Regex.IsMatch(password, @"[A-Z]"))
                return "كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل.";
            if (!Regex.IsMatch(password, @"[a-z]"))
                return "كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل.";
            if (!Regex.IsMatch(password, @"[0-9]"))
                return "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.";
            if (!Regex.IsMatch(password, @"[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/?]"))
                return "كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل.";
            return null;
        }

        // 1. جلب قائمة المستخدمين
        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int per_page = 25, [FromQuery] string? search = null, [FromQuery] string? role = null)
        {
            var usersQuery = _context.Users
                .Include(u => u.DefaultBranch)
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                var s = search.ToLower();
                usersQuery = usersQuery.Where(u => u.Username.ToLower().Contains(s) || u.FullName.ToLower().Contains(s));
            }

            if (!string.IsNullOrEmpty(role))
            {
                usersQuery = usersQuery.Where(u => u.UserRoles.Any(ur => ur.Role != null && ur.Role.Name == role));
            }

            var total = await usersQuery.CountAsync();
            var dbItems = await usersQuery
                .Skip((page - 1) * per_page)
                .Take(per_page)
                .ToListAsync();

            var rolesList = await _context.Roles
                .Select(r => new { value = r.Name, label = r.Description })
                .ToListAsync();

            var items = dbItems.Select(u => {
                var roleName = u.UserRoles.FirstOrDefault()?.Role?.Name ?? "Viewer";
                var roleLabel = u.UserRoles.FirstOrDefault()?.Role?.Description ?? "مشاهد";
                return new
                {
                    id = u.Id,
                    username = u.Username,
                    role = roleName,
                    role_label = roleLabel,
                    branch_id = u.DefaultBranchId,
                    can_access_all_branches = (roleName == "Owner" || roleName == "Admin" || roleName == "Accountant"),
                    is_active_user = u.IsActive,
                    branch = u.DefaultBranch != null ? new {
                        id = u.DefaultBranch.Id,
                        name = u.DefaultBranch.Name,
                        is_main = u.DefaultBranch.Code == "HQ-01",
                        created_at = ""
                    } : null,
                    created_at = ""
                };
            }).ToList();

            return Ok(new
            {
                total,
                page,
                per_page,
                roles = rolesList,
                items
            });
        }

        // 2. جلب مستخدم محدد
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(Guid id)
        {
            var u = await _context.Users
                .Include(user => user.DefaultBranch)
                .Include(user => user.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(user => user.Id == id);

            if (u == null)
            {
                return NotFound(new { success = false, message = "المستخدم غير موجود." });
            }

            var roleName = u.UserRoles.FirstOrDefault()?.Role?.Name ?? "Viewer";
            var roleLabel = u.UserRoles.FirstOrDefault()?.Role?.Description ?? "مشاهد";

            return Ok(new
            {
                id = u.Id,
                username = u.Username,
                role = roleName,
                role_label = roleLabel,
                branch_id = u.DefaultBranchId,
                can_access_all_branches = (roleName == "Owner" || roleName == "Admin" || roleName == "Accountant"),
                is_active_user = u.IsActive,
                branch = u.DefaultBranch != null ? new {
                    id = u.DefaultBranch.Id,
                    name = u.DefaultBranch.Name,
                    is_main = u.DefaultBranch.Code == "HQ-01",
                    created_at = ""
                } : null,
                created_at = ""
            });
        }

        // 3. إنشاء مستخدم جديد
        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { success = false, message = "اسم المستخدم وكلمة المرور مطلوبان." });
            }

            var pwdError = ValidatePasswordComplexity(request.Password);
            if (pwdError != null)
                return BadRequest(new { success = false, message = pwdError });

            var existing = await _context.Users.AnyAsync(u => u.Username.ToLower() == request.Username.ToLower());
            if (existing)
            {
                return BadRequest(new { success = false, message = "اسم المستخدم مستخدم بالفعل." });
            }

            var defaultBranchId = request.BranchId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");

            var user = new User
            {
                Username = request.Username.Trim(),
                FullName = request.Username.Trim(),
                Email = $"{request.Username.Trim()}@showroom.local",
                DefaultBranchId = defaultBranchId,
                IsActive = true,
                PasswordHash = _identityService.HashPassword(request.Password)
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // إسناد الدور
            var roleName = string.IsNullOrWhiteSpace(request.Role) ? "Sales" : request.Role;
            var dbRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
            if (dbRole != null)
            {
                _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = dbRole.Id });
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                id = user.Id,
                username = user.Username,
                role = roleName,
                role_label = dbRole?.Description ?? roleName,
                branch_id = user.DefaultBranchId,
                can_access_all_branches = (roleName == "Owner" || roleName == "Admin" || roleName == "Accountant"),
                is_active_user = user.IsActive,
                created_at = ""
            });
        }

        // 4. تعديل بيانات مستخدم
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
            {
                return NotFound(new { success = false, message = "المستخدم غير موجود." });
            }

            // منع تعديل اسم المستخدم الخاص بالـ admin للحماية
            if (user.Username.ToLower() == "admin" && request.Username.ToLower() != "admin")
            {
                return BadRequest(new { success = false, message = "لا يمكن تغيير اسم المستخدم للمسؤول الرئيسي." });
            }

            // تحقق من عدم تكرار اسم المستخدم الجديد
            if (user.Username.ToLower() != request.Username.ToLower())
            {
                var existing = await _context.Users.AnyAsync(u => u.Username.ToLower() == request.Username.ToLower() && u.Id != id);
                if (existing)
                {
                    return BadRequest(new { success = false, message = "اسم المستخدم مستخدم بالفعل." });
                }
            }

            user.Username = request.Username.Trim();
            user.FullName = request.Username.Trim();
            if (request.BranchId.HasValue)
            {
                user.DefaultBranchId = request.BranchId.Value;
            }
            if (request.IsActiveUser.HasValue)
            {
                // منع تعطيل الـ admin
                if (user.Username.ToLower() == "admin" && !request.IsActiveUser.Value)
                {
                    return BadRequest(new { success = false, message = "لا يمكن تعطيل حساب المسؤول الرئيسي." });
                }
                user.IsActive = request.IsActiveUser.Value;
            }

            if (!string.IsNullOrEmpty(request.Password))
            {
                var pwdErr = ValidatePasswordComplexity(request.Password);
                if (pwdErr != null)
                    return BadRequest(new { success = false, message = pwdErr });
                user.PasswordHash = _identityService.HashPassword(request.Password);
            }

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            // تحديث الدور
            if (!string.IsNullOrEmpty(request.Role))
            {
                // منع تغيير دور الـ admin
                if (user.Username.ToLower() == "admin" && request.Role != "Owner" && request.Role != "Admin")
                {
                    return BadRequest(new { success = false, message = "لا يمكن تغيير دور المسؤول الرئيسي إلى مرتبة أدنى." });
                }

                var dbRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == request.Role);
                if (dbRole != null)
                {
                    var existingRoles = _context.UserRoles.Where(ur => ur.UserId == user.Id);
                    _context.UserRoles.RemoveRange(existingRoles);
                    await _context.SaveChangesAsync();

                    _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = dbRole.Id });
                    await _context.SaveChangesAsync();
                }
            }

            var finalRole = request.Role ?? "Sales";

            return Ok(new
            {
                id = user.Id,
                username = user.Username,
                role = finalRole,
                branch_id = user.DefaultBranchId,
                can_access_all_branches = (finalRole == "Owner" || finalRole == "Admin" || finalRole == "Accountant"),
                is_active_user = user.IsActive,
                created_at = ""
            });
        }

        // 5. تفعيل أو تعطيل مستخدم
        [HttpPost("{id}/toggle-active")]
        public async Task<IActionResult> ToggleUserActive(Guid id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
            {
                return NotFound(new { success = false, message = "المستخدم غير موجود." });
            }

            if (user.Username.ToLower() == "admin")
            {
                return BadRequest(new { success = false, message = "لا يمكن تعطيل حساب المسؤول الرئيسي." });
            }

            user.IsActive = !user.IsActive;
            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, is_active_user = user.IsActive });
        }

        // 6. إعادة تعيين كلمة مرور مستخدم
        [HttpPost("{id}/reset-password")]
        public async Task<IActionResult> ResetUserPassword(Guid id, [FromBody] ResetPasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { success = false, message = "كلمة المرور الجديدة مطلوبة." });
            }

            var resetPwdError = ValidatePasswordComplexity(request.Password);
            if (resetPwdError != null)
                return BadRequest(new { success = false, message = resetPwdError });

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
            {
                return NotFound(new { success = false, message = "المستخدم غير موجود." });
            }

            user.PasswordHash = _identityService.HashPassword(request.Password);
            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "تمت إعادة تعيين كلمة المرور بنجاح." });
        }

        // 7. حذف مستخدم
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(Guid id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
            {
                return NotFound(new { success = false, message = "المستخدم غير موجود." });
            }

            if (user.Username.ToLower() == "admin")
            {
                return BadRequest(new { success = false, message = "لا يمكن حذف المسؤول الرئيسي للنظام." });
            }

            // حذف علاقة الأدوار
            var roles = _context.UserRoles.Where(ur => ur.UserId == id);
            _context.UserRoles.RemoveRange(roles);

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "تم حذف المستخدم بنجاح." });
        }
    }

    public class CreateUserRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public Guid? BranchId { get; set; }
        public bool CanAccessAllBranches { get; set; }
    }

    public class UpdateUserRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public Guid? BranchId { get; set; }
        public bool? CanAccessAllBranches { get; set; }
        public bool? IsActiveUser { get; set; }
        public string? Password { get; set; }
    }

    public class ResetPasswordRequest
    {
        public string Password { get; set; } = string.Empty;
    }
}
