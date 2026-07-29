using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.RateLimiting;

namespace CarShowroomManagementV2.API.Controllers
{
    [AllowAnonymous]
    [Route("api/public/vehicles")]
    public sealed class PublicVehiclesController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;

        public PublicVehiclesController(IApplicationDbContext context)
        {
            _context = context;
        }

        // GET /api/public/vehicles
        [HttpGet]
        public async Task<IActionResult> GetVehicles(
            [FromQuery] string? brand = null,
            [FromQuery] decimal? minPrice = null,
            [FromQuery] decimal? maxPrice = null,
            [FromQuery] int? year = null,
            [FromQuery] string? fuelType = null,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int perPage = 25)
        {
            if (page < 1) page = 1;
            if (perPage < 1 || perPage > 100) perPage = 25;

            var query = _context.Vehicles
                .Include(v => v.Images)
                .Where(v => v.Status == "Available");

            if (!string.IsNullOrEmpty(brand))
                query = query.Where(v => v.Brand == brand);

            if (minPrice.HasValue)
                query = query.Where(v => v.TargetSellingPrice >= minPrice.Value);

            if (maxPrice.HasValue)
                query = query.Where(v => v.TargetSellingPrice <= maxPrice.Value);

            if (year.HasValue)
                query = query.Where(v => v.Year == year.Value);

            if (!string.IsNullOrEmpty(fuelType))
                query = query.Where(v => v.FuelType == fuelType);

            if (!string.IsNullOrEmpty(search))
            {
                var s = search.ToLower();
                query = query.Where(v => (v.Brand != null && v.Brand.ToLower().Contains(s)) || v.Model.ToLower().Contains(s) || (v.Color != null && v.Color.ToLower().Contains(s)));
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(v => v.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .Select(v => new
                {
                    id = v.Id,
                    brand = v.Brand,
                    model = v.Model,
                    year = v.Year,
                    color = v.Color,
                    mileage = v.Mileage,
                    engine = v.EngineSize,
                    transmission = v.Transmission,
                    fuel_type = v.FuelType,
                    price = v.TargetSellingPrice,
                    status = v.Status,
                    notes = (string?)null,
                    condition = v.Condition,
                    images = v.Images.Select(i => new { id = i.Id, filename = i.FileName })
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                message = "تم جلب السيارات المتوفرة بنجاح",
                data = new
                {
                    total,
                    page,
                    per_page = perPage,
                    items
                }
            });
        }

        // GET /api/public/vehicles/{id}
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetVehicleDetails(Guid id)
        {
            var v = await _context.Vehicles
                .Include(v => v.Images)
                .FirstOrDefaultAsync(v => v.Id == id && v.Status == "Available");

            if (v == null)
            {
                return NotFound(new { success = false, message = "السيارة غير متوفرة أو تم بيعها." });
            }

            return Ok(new
            {
                success = true,
                message = "تم جلب تفاصيل السيارة بنجاح",
                data = new
                {
                    id = v.Id,
                    brand = v.Brand,
                    model = v.Model,
                    year = v.Year,
                    color = v.Color,
                    mileage = v.Mileage,
                    engine = v.EngineSize,
                    transmission = v.Transmission,
                    fuel_type = v.FuelType,
                    price = v.TargetSellingPrice,
                    status = v.Status,
                    notes = (string?)null,
                    images = v.Images.Select(i => new { id = i.Id, filename = i.FileName })
                }
            });
        }

        // GET /api/public/vehicles/filters
        [HttpGet("filters")]
        public async Task<IActionResult> GetFilters()
        {
            var availableVehicles = await _context.Vehicles
                .Where(v => v.Status == "Available")
                .Select(v => new { v.Brand, v.Year, v.FuelType })
                .ToListAsync();

            var brands = availableVehicles.Where(v => !string.IsNullOrEmpty(v.Brand)).Select(v => v.Brand!).Distinct().OrderBy(b => b).ToList();
            var years = availableVehicles.Select(v => v.Year).Distinct().OrderByDescending(y => y).ToList();
            var fuelTypes = availableVehicles.Where(v => !string.IsNullOrEmpty(v.FuelType)).Select(v => v.FuelType!).Distinct().OrderBy(f => f).ToList();

            return Ok(new
            {
                success = true,
                message = "تم جلب الفلاتر المتاحة بنجاح",
                data = new
                {
                    brands,
                    years,
                    fuel_types = fuelTypes
                }
            });
        }

        // POST /api/public/leads
        [HttpPost("leads")]
        [EnableRateLimiting("LeadPolicy")]
        public async Task<IActionResult> CreateLead([FromBody] CreateLeadRequest request)
        {
            if (string.IsNullOrEmpty(request.Name) || string.IsNullOrEmpty(request.Phone))
            {
                return BadRequest(new { success = false, message = "الاسم ورقم الهاتف مطلوبين." });
            }

            // Find or create customer
            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Phone == request.Phone);

            if (customer == null)
            {
                customer = new Customer
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name,
                    FullName = request.Name,
                    Phone = request.Phone,
                    IdNumber = "LEAD-" + Guid.NewGuid().ToString().Substring(0, 8),
                };

                var defaultAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.AccountCode.StartsWith("113"));
                if (defaultAccount != null)
                {
                    customer.AccountId = defaultAccount.Id;
                }

                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();
            }

            var interaction = new CrmInteraction
            {
                Id = Guid.NewGuid(),
                CustomerId = customer.Id,
                InteractionType = "whatsapp",
                Notes = $"طلب استفسار واتساب عن السيارة معرف: {request.VehicleId}. ملاحظة: {request.Message}",
                Outcome = "follow_up",
                InteractionDate = DateTime.UtcNow
            };

            _context.CrmInteractions.Add(interaction);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "تم تقديم طلبك بنجاح، وسيتواصل معك موظف المبيعات." });
        }

        // POST /api/public/visit-requests
        [HttpPost("visit-requests")]
        [EnableRateLimiting("LeadPolicy")]
        public async Task<IActionResult> CreateVisitRequest([FromBody] CreateVisitRequest request)
        {
            if (string.IsNullOrEmpty(request.Name) || string.IsNullOrEmpty(request.Phone))
            {
                return BadRequest(new { success = false, message = "الاسم ورقم الهاتف مطلوبين." });
            }

            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Phone == request.Phone);

            if (customer == null)
            {
                customer = new Customer
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name,
                    FullName = request.Name,
                    Phone = request.Phone,
                    IdNumber = "VISIT-" + Guid.NewGuid().ToString().Substring(0, 8)
                };

                var defaultAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.AccountCode.StartsWith("113"));
                if (defaultAccount != null)
                {
                    customer.AccountId = defaultAccount.Id;
                }

                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();
            }

            var interaction = new CrmInteraction
            {
                Id = Guid.NewGuid(),
                CustomerId = customer.Id,
                InteractionType = "visit",
                Notes = $"طلب حجز موعد زيارة/فحص للسيارة معرف: {request.VehicleId} بتاريخ {request.VisitDate:yyyy-MM-dd}. ملاحظة: {request.Message}",
                Outcome = "follow_up",
                InteractionDate = DateTime.UtcNow
            };

            _context.CrmInteractions.Add(interaction);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "تم تقديم طلب حجز الموعد بنجاح." });
        }
    }

    public class CreateLeadRequest
    {
        [Required, StringLength(120, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;

        [Required, StringLength(30, MinimumLength = 7)]
        [RegularExpression(@"^[+\d][\d\s()\-]+$")]
        public string Phone { get; set; } = string.Empty;

        public Guid? VehicleId { get; set; }

        [StringLength(2000)]
        public string? Message { get; set; }
    }

    public class CreateVisitRequest
    {
        [Required, StringLength(120, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;

        [Required, StringLength(30, MinimumLength = 7)]
        [RegularExpression(@"^[+\d][\d\s()\-]+$")]
        public string Phone { get; set; } = string.Empty;

        public Guid? VehicleId { get; set; }
        public DateTime VisitDate { get; set; }

        [StringLength(2000)]
        public string? Message { get; set; }
    }
}
