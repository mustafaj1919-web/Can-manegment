using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Configuration;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.Infrastructure.Identity
{
    public class IdentityService
    {
        private readonly IApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public IdentityService(IApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<string?> AuthenticateAsync(string username, string password)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Username == username && u.IsActive);

            if (user == null || !VerifyPassword(password, user.PasswordHash))
            {
                return null;
            }

            return GenerateJwtToken(user);
        }

        public string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
        }

        public bool VerifyPassword(string password, string hashedPassword)
        {
            try
            {
                // دعم الترحيل: إذا كان الهاش قديم (SHA-256 base64، لا يبدأ بـ $2) نرفضه
                if (!hashedPassword.StartsWith("$2"))
                    return false;

                return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
            }
            catch
            {
                return false;
            }
        }

        public string GenerateJwtToken(User user, Guid? branchId = null)
        {
            var secretKey = _configuration["JwtSettings:Secret"]
                ?? throw new InvalidOperationException("JwtSettings:Secret غير مُهيأ في ملف الإعدادات.");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var canSeeAll = false;
            foreach (var userRole in user.UserRoles)
            {
                if (userRole.Role?.Name is "Owner" or "Admin" or "Accountant")
                    canSeeAll = true;
            }

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim("BranchId", (branchId ?? user.DefaultBranchId).ToString()),
                new Claim("CanSeeAllBranches", canSeeAll ? "true" : "false")
            };

            foreach (var userRole in user.UserRoles)
            {
                if (userRole.Role != null)
                    claims.Add(new Claim(ClaimTypes.Role, userRole.Role.Name));
            }

            var token = new JwtSecurityToken(
                issuer: _configuration["JwtSettings:Issuer"] ?? "CarShowroomEnterprise",
                audience: _configuration["JwtSettings:Audience"] ?? "CarShowroomEnterpriseUsers",
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
