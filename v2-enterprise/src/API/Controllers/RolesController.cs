using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    public class RolesController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;

        public RolesController(IApplicationDbContext context)
        {
            _context = context;
        }

        // 1. GET /api/roles
        [HttpGet]
        public async Task<IActionResult> GetRoles()
        {
            var dbRoles = await _context.Roles
                .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
                .ToListAsync();

            var dbPermissions = await _context.Permissions.ToListAsync();

            var rolesList = dbRoles.Select(r => new
            {
                role = r.Name,
                label = r.Description,
                permissions = r.RolePermissions
                    .Where(rp => rp.Permission != null)
                    .Select(rp => rp.Permission!.Name)
                    .ToList(),
                is_fixed = r.Name == "Owner"
            }).ToList();

            var allPermissionsList = dbPermissions.Select(p => new
            {
                key = p.Name,
                label = p.Description
            }).ToList();

            return Ok(new
            {
                roles = rolesList,
                all_permissions = allPermissionsList
            });
        }

        // 2. PUT /api/roles/{roleName}
        [Authorize(Roles = "Owner,Admin")]
        [HttpPut("{roleName}")]
        public async Task<IActionResult> UpdateRolePermissions(string roleName, [FromBody] UpdateRolePermissionsRequest request)
        {
            if (string.Equals(roleName, "Owner", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { success = false, error = "لا يمكن تعديل صلاحيات دور المالك." });
            }

            var role = await _context.Roles
                .Include(r => r.RolePermissions)
                .FirstOrDefaultAsync(r => r.Name == roleName);

            if (role == null)
            {
                return NotFound(new { success = false, error = "الدور المحدد غير موجود." });
            }

            if (request == null || request.Permissions == null)
            {
                return BadRequest(new { success = false, error = "قائمة الصلاحيات مطلوبة." });
            }

            // إزالة الصلاحيات الحالية للدور
            var existingRP = _context.RolePermissions.Where(rp => rp.RoleId == role.Id);
            _context.RolePermissions.RemoveRange(existingRP);
            await _context.SaveChangesAsync();

            // إضافة الصلاحيات الجديدة
            var targetPerms = await _context.Permissions
                .Where(p => request.Permissions.Contains(p.Name))
                .ToListAsync();

            // نضمن دائماً وجود صلاحية view_dashboard للدور
            var dashboardPerm = await _context.Permissions.FirstOrDefaultAsync(p => p.Name == "view_dashboard");
            if (dashboardPerm != null && !targetPerms.Any(p => p.Name == "view_dashboard"))
            {
                targetPerms.Add(dashboardPerm);
            }

            foreach (var perm in targetPerms)
            {
                _context.RolePermissions.Add(new RolePermission
                {
                    RoleId = role.Id,
                    PermissionId = perm.Id
                });
            }

            await _context.SaveChangesAsync();

            // جلب البيانات المحدثة للإرجاع
            var updatedRole = await _context.Roles
                .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(r => r.Id == role.Id);

            return Ok(new
            {
                role = updatedRole!.Name,
                label = updatedRole.Description,
                permissions = updatedRole.RolePermissions
                    .Where(rp => rp.Permission != null)
                    .Select(rp => rp.Permission!.Name)
                    .ToList(),
                is_fixed = updatedRole.Name == "Owner"
            });
        }

        // 3. POST /api/roles/{roleName}/reset
        [Authorize(Roles = "Owner,Admin")]
        [HttpPost("{roleName}/reset")]
        public async Task<IActionResult> ResetRolePermissions(string roleName)
        {
            if (string.Equals(roleName, "Owner", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { success = false, error = "لا يمكن تعديل صلاحيات دور المالك." });
            }

            var role = await _context.Roles
                .Include(r => r.RolePermissions)
                .FirstOrDefaultAsync(r => r.Name == roleName);

            if (role == null)
            {
                return NotFound(new { success = false, error = "الدور المحدد غير موجود." });
            }

            // إزالة الصلاحيات الحالية
            var existingRP = _context.RolePermissions.Where(rp => rp.RoleId == role.Id);
            _context.RolePermissions.RemoveRange(existingRP);
            await _context.SaveChangesAsync();

            // الصلاحيات الافتراضية لكل دور
            var defaultPermNames = new List<string> { "view_dashboard" };
            if (roleName == "Admin")
            {
                var allPerms = await _context.Permissions.ToListAsync();
                defaultPermNames = allPerms.Select(p => p.Name).ToList();
            }
            else if (roleName == "Accountant")
            {
                defaultPermNames.AddRange(new[] {
                    "view_inventory", "view_sales", "manage_sales",
                    "view_purchases", "manage_purchases", "view_installments", "manage_installments",
                    "view_accounting", "manage_accounting", "view_reports"
                });
            }
            else if (roleName == "Sales")
            {
                defaultPermNames.AddRange(new[] {
                    "view_inventory", "view_sales", "manage_sales",
                    "view_installments", "manage_installments", "view_reports"
                });
            }
            else if (roleName == "Viewer")
            {
                defaultPermNames.AddRange(new[] {
                    "view_inventory", "view_sales", "view_purchases",
                    "view_installments", "view_accounting", "view_reports"
                });
            }

            var targetPerms = await _context.Permissions
                .Where(p => defaultPermNames.Contains(p.Name))
                .ToListAsync();

            foreach (var perm in targetPerms)
            {
                _context.RolePermissions.Add(new RolePermission
                {
                    RoleId = role.Id,
                    PermissionId = perm.Id
                });
            }

            await _context.SaveChangesAsync();

            // جلب البيانات المحدثة للإرجاع
            var updatedRole = await _context.Roles
                .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(r => r.Id == role.Id);

            return Ok(new
            {
                role = updatedRole!.Name,
                label = updatedRole.Description,
                permissions = updatedRole.RolePermissions
                    .Where(rp => rp.Permission != null)
                    .Select(rp => rp.Permission!.Name)
                    .ToList(),
                is_fixed = updatedRole.Name == "Owner"
            });
        }
    }

    public class UpdateRolePermissionsRequest
    {
        public List<string> Permissions { get; set; } = new List<string>();
    }
}
