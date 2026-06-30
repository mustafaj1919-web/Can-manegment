using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    [Route("api/customer")]
    public sealed class CustomerPortalController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public CustomerPortalController(IApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // POST /api/customer/auth/login
        [AllowAnonymous]
        [HttpPost("auth/login")]
        public async Task<IActionResult> Login([FromBody] CustomerLoginRequest request)
        {
            if (string.IsNullOrEmpty(request.Phone) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest(new { success = false, message = "رقم الهاتف ورقم الهوية (كلمة المرور) مطلوبين." });
            }

            // Authenticate customer where Phone matches and IdNumber matches request.Password (Identity Card No. is default password)
            var customer = await _context.Customers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Phone == request.Phone && c.IdNumber == request.Password);

            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "بيانات الدخول غير صحيحة، يرجى التحقق من رقم الهاتف ورقم الهوية." });
            }

            var token = GenerateJwtTokenForCustomer(customer);

            return Ok(new
            {
                success = true,
                message = "تم تسجيل الدخول بنجاح",
                data = new
                {
                    token,
                    customer = new
                    {
                        id = customer.Id,
                        name = customer.FullName ?? customer.Name,
                        phone = customer.Phone,
                        email = customer.Email
                    }
                }
            });
        }

        // POST /api/customer/auth/refresh
        [HttpPost("auth/refresh")]
        public async Task<IActionResult> RefreshToken()
        {
            var customerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(customerIdClaim) || !Guid.TryParse(customerIdClaim, out var customerId))
            {
                return Unauthorized(new { success = false, message = "غير مصرح." });
            }

            var customer = await _context.Customers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "الزبون غير موجود." });
            }

            var token = GenerateJwtTokenForCustomer(customer);

            return Ok(new
            {
                success = true,
                data = new { token }
            });
        }

        // GET /api/customer/me
        [HttpGet("me")]
        public async Task<IActionResult> GetProfile()
        {
            var customerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(customerIdClaim) || !Guid.TryParse(customerIdClaim, out var customerId))
            {
                return Unauthorized(new { success = false, message = "غير مصرح." });
            }

            var customer = await _context.Customers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer == null)
            {
                return NotFound(new { success = false, message = "الزبون غير موجود." });
            }

            return Ok(new
            {
                success = true,
                data = new
                {
                    id = customer.Id,
                    name = customer.FullName ?? customer.Name,
                    phone = customer.Phone,
                    email = customer.Email,
                    address = customer.Address,
                    id_number = customer.IdNumber
                }
            });
        }

        // GET /api/customer/contracts
        [HttpGet("contracts")]
        public async Task<IActionResult> GetContracts()
        {
            var customerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(customerIdClaim) || !Guid.TryParse(customerIdClaim, out var customerId))
            {
                return Unauthorized(new { success = false, message = "غير مصرح." });
            }

            var contracts = await _context.SalesContracts
                .IgnoreQueryFilters()
                .Include(c => c.Vehicle)
                .Where(c => c.CustomerId == customerId && c.Status != "Cancelled")
                .Select(c => new
                {
                    id = c.Id,
                    contract_number = c.ContractNumber,
                    sale_date = c.SaleDate,
                    total_price = c.SalePrice,
                    down_payment = c.DownPayment,
                    remaining_balance = c.RemainingBalance,
                    status = c.Status,
                    vehicle = c.Vehicle == null ? null : new
                    {
                        id = c.Vehicle.Id,
                        brand = c.Vehicle.Brand,
                        model = c.Vehicle.Model,
                        year = c.Vehicle.Year
                    }
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = contracts
            });
        }

        // GET /api/customer/installments
        [HttpGet("installments")]
        public async Task<IActionResult> GetInstallments([FromQuery] string? status = null)
        {
            var customerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(customerIdClaim) || !Guid.TryParse(customerIdClaim, out var customerId))
            {
                return Unauthorized(new { success = false, message = "غير مصرح." });
            }

            var query = _context.Installments
                .IgnoreQueryFilters()
                .Include(i => i.InstallmentPlan)
                    .ThenInclude(p => p!.SalesContract)
                .Where(i => i.InstallmentPlan!.SalesContract!.CustomerId == customerId && i.Status != "Cancelled");

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(i => i.Status == status);
            }

            var installments = await query
                .OrderBy(i => i.DueDate)
                .Select(i => new
                {
                    id = i.Id,
                    installment_number = i.InstallmentNumber,
                    due_date = i.DueDate,
                    amount = i.Amount,
                    paid_amount = i.PaidAmount,
                    remaining = i.Amount - i.PaidAmount,
                    status = i.Status,
                    payment_date = i.PaymentDate,
                    contract_number = i.InstallmentPlan!.SalesContract!.ContractNumber
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = installments
            });
        }

        // GET /api/customer/payments
        [HttpGet("payments")]
        public async Task<IActionResult> GetPayments()
        {
            var customerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(customerIdClaim) || !Guid.TryParse(customerIdClaim, out var customerId))
            {
                return Unauthorized(new { success = false, message = "غير مصرح." });
            }

            var customer = await _context.Customers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer == null)
            {
                return NotFound(new { success = false, message = "الزبون غير موجود." });
            }

            var payments = await _context.Payments
                .IgnoreQueryFilters()
                .Where(p => p.ContraAccountId == customer.AccountId && p.Type == PaymentType.Receipt)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    id = p.Id,
                    reference_number = p.ReferenceNumber,
                    amount = p.Amount,
                    payment_date = p.CreatedAt,
                    method = p.Method.ToString(),
                    description = p.Description
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = payments
            });
        }

        // GET /api/customer/dashboard
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var customerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(customerIdClaim) || !Guid.TryParse(customerIdClaim, out var customerId))
            {
                return Unauthorized(new { success = false, message = "غير مصرح." });
            }

            var contracts = await _context.SalesContracts
                .IgnoreQueryFilters()
                .Where(c => c.CustomerId == customerId && c.Status != "Cancelled")
                .ToListAsync();

            var planIds = await _context.InstallmentPlans
                .IgnoreQueryFilters()
                .Where(p => p.SalesContract!.CustomerId == customerId)
                .Select(p => p.Id)
                .ToListAsync();

            var installments = await _context.Installments
                .IgnoreQueryFilters()
                .Where(i => planIds.Contains(i.InstallmentPlanId) && i.Status != "Cancelled")
                .ToListAsync();

            var totalInstallments = installments.Sum(i => i.Amount);
            var totalPaid = installments.Sum(i => i.PaidAmount);
            var totalRemaining = totalInstallments - totalPaid;

            var nextDue = installments
                .Where(i => i.Status != "Paid" && i.DueDate >= DateTime.UtcNow)
                .OrderBy(i => i.DueDate)
                .Select(i => new { i.DueDate, remaining = i.Amount - i.PaidAmount })
                .FirstOrDefault();

            return Ok(new
            {
                success = true,
                data = new
                {
                    contracts_count = contracts.Count,
                    total_installments = totalInstallments,
                    total_paid = totalPaid,
                    total_remaining = totalRemaining,
                    next_due_date = nextDue?.DueDate,
                    next_due_amount = nextDue?.remaining ?? 0
                }
            });
        }

        private string GenerateJwtTokenForCustomer(Customer customer)
        {
            var secretKey = _configuration["JwtSettings:Secret"]
                ?? throw new InvalidOperationException("JwtSettings:Secret غير مُهيأ في ملف الإعدادات.");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, customer.Id.ToString()),
                new Claim(ClaimTypes.Name, customer.FullName ?? customer.Name),
                new Claim(ClaimTypes.Role, "Customer")
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["JwtSettings:Issuer"] ?? "CarShowroomEnterprise",
                audience: _configuration["JwtSettings:Audience"] ?? "CarShowroomEnterpriseUsers",
                claims: claims,
                expires: DateTime.UtcNow.AddHours(24),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class CustomerLoginRequest
    {
        public string Phone { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
