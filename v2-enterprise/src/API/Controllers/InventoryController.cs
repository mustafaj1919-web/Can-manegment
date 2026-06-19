using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Inventory.Commands;
using CarShowroomManagementV2.Application.Inventory.Queries;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    public class InventoryController : ApiControllerBase
    {
        private static readonly string[] AllowedImageExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
        private const long MaxImageBytes = 10 * 1024 * 1024; // 10 MB

        private static bool IsValidImageMagicBytes(byte[] bytes, string ext)
        {
            if (bytes.Length < 4) return false;
            return ext switch
            {
                ".jpg" or ".jpeg" => bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF,
                ".png"            => bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47,
                ".webp"           => bytes.Length >= 12
                                     && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
                                     && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50,
                _ => false
            };
        }

        private readonly IApplicationDbContext _context;
        public InventoryController(IApplicationDbContext context) { _context = context; }

        // تقرير ربحية السيارات
        [HttpGet("profitability-report")]
        public async Task<IActionResult> GetProfitabilityReport([FromQuery] bool onlySold = false)
        {
            var vehicles = await _context.Vehicles.ToListAsync();
            var costs = await _context.VehicleCosts.ToListAsync();
            var contracts = await _context.SalesContracts.ToListAsync();

            var cars = new List<dynamic>();
            foreach (var v in vehicles)
            {
                var vCosts = costs.Where(c => c.VehicleId == v.Id).ToList();
                var costsTotal = vCosts.Where(c => c.CostType != "purchase").Sum(c => c.Amount);
                var totalCost = v.PurchaseCost + costsTotal;
                var contract = contracts.FirstOrDefault(c => c.VehicleId == v.Id);
                decimal? sellingPrice = contract?.SalePrice;
                decimal? netProfit = sellingPrice.HasValue ? sellingPrice.Value - totalCost : (decimal?)null;
                decimal? profitPct = (netProfit.HasValue && totalCost > 0) ? Math.Round(netProfit.Value / totalCost * 100, 1) : (decimal?)null;
                if (onlySold && contract == null) continue;
                cars.Add(new {
                    car_id = v.Id, brand = "", model = v.Model, year = v.Year, vin = v.ChassisNumber, status = v.Status,
                    purchase_price_iqd = v.PurchaseCost, costs_total_iqd = costsTotal, total_cost_iqd = totalCost,
                    selling_price_iqd = sellingPrice, net_profit_iqd = netProfit, profit_pct = profitPct,
                    cost_breakdown = vCosts.GroupBy(c => c.CostType).ToDictionary(g => g.Key, g => g.Sum(x => x.Amount)),
                    costs = vCosts.Select(c => new { id = c.Id, cost_type = c.CostType, amount = c.Amount, currency = c.Currency, description = c.Description, created_at = c.CreatedAt }).ToList()
                });
            }
            var sold = cars.Where(c => c.selling_price_iqd != null).ToList();
            var profits = sold.Where(c => c.net_profit_iqd != null).Select(c => (decimal)c.net_profit_iqd).ToList();
            var ordered = sold.OrderByDescending(c => (decimal?)c.net_profit_iqd ?? 0).ToList();
            return Ok(new { success = true, data = new {
                cars,
                summary = new {
                    most_profitable = ordered.Take(5),
                    least_profitable = ordered.AsEnumerable().Reverse().Take(5),
                    losing = sold.Where(c => c.net_profit_iqd != null && (decimal)c.net_profit_iqd < 0),
                    avg_profit_iqd = profits.Count > 0 ? Math.Round(profits.Average(), 2) : 0,
                    avg_profit_pct = 0,
                    total_cars = cars.Count,
                    sold_cars = sold.Count
                }
            }});
        }

        // 1. تسجيل شراء سيارة جديدة
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateVehicleCommand command)
        {
            var id = await Mediator.Send(command);
            return Ok(new { success = true, vehicleId = id, message = "تم تسجيل شراء السيارة وإنشاء قيد المخزون بنجاح." });
        }

        // 1.ب تعديل البيانات الوصفية لسيارة موجودة
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateVehicleCommand command)
        {
            command.Id = id;
            var vehicleId = await Mediator.Send(command);
            return Ok(new { success = true, vehicleId, message = "تم تحديث بيانات السيارة بنجاح." });
        }

        // 2. قائمة السيارات في المعرض
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 25)
        {
            if (page < 1) page = 1;
            if (per_page < 1 || per_page > 100) per_page = 25;

            var query = new GetVehiclesListQuery { Status = status };
            var all = await Mediator.Send(query);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                all = all.Where(v =>
                    v.Model.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                    v.ChassisNumber.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                    (v.Color != null && v.Color.Contains(s, StringComparison.OrdinalIgnoreCase))
                ).ToList();
            }

            var total = all.Count;
            var data = all.Skip((page - 1) * per_page).Take(per_page).ToList();

            return Ok(new { success = true, total, page, per_page, data });
        }

        // 3. تقارير وحالة المخزون
        [HttpGet("report")]
        public async Task<IActionResult> GetReport()
        {
            var report = await Mediator.Send(new GetInventoryReportQuery());
            return Ok(new { success = true, data = report });
        }

        // 4. تفاصيل سيارة محددة
        [HttpGet("{id}")]
        public async Task<IActionResult> GetDetails(Guid id)
        {
            var details = await Mediator.Send(new GetVehicleDetailsQuery { VehicleId = id });
            return Ok(new { success = true, data = details });
        }

        // 5. إضافة تكلفة إضافية للسيارة (صيانة/جمارك)
        [HttpPost("{id}/costs")]
        public async Task<IActionResult> AddCost(Guid id, [FromBody] AddVehicleCostCommand command)
        {
            if (command == null)
                return BadRequest(new { success = false, message = "بيانات التكلفة غير صالحة." });

            command.VehicleId = id;
            var costId = await Mediator.Send(command);
            return Ok(new { success = true, vehicleCostId = costId, message = "تمت إضافة التكلفة وتحديث القيمة الدفترية وتوليد قيد المخزون." });
        }

        // 6. رفع صورة للسيارة
        [HttpPost("{id}/images")]
        public async Task<IActionResult> UploadImage(Guid id, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "لم يتم رفع أي ملف." });

            if (file.Length > MaxImageBytes)
                return BadRequest(new { success = false, message = "حجم الصورة يتجاوز الحد الأقصى المسموح به (10 MB)." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedImageExtensions.Contains(ext))
                return BadRequest(new { success = false, message = $"نوع الملف غير مسموح به. الأنواع المقبولة: {string.Join(", ", AllowedImageExtensions)}" });

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);

            var fileBytes = memoryStream.ToArray();
            if (!IsValidImageMagicBytes(fileBytes, ext))
                return BadRequest(new { success = false, message = "محتوى الملف لا يطابق نوع الصورة المتوقع. يرجى رفع ملف صورة حقيقي." });

            var command = new UploadVehicleImageCommand
            {
                VehicleId = id,
                OriginalFileName = file.FileName,
                FileBytes = fileBytes
            };

            var result = await Mediator.Send(command);
            return Ok(new { success = true, vehicleImageId = result.Id, filename = result.FileName, message = "تم رفع وحفظ صورة السيارة بنجاح." });
        }

        // 7. حذف صورة من السيارة
        [HttpDelete("{id}/images/{imageId}")]
        public async Task<IActionResult> DeleteImage(Guid id, Guid imageId)
        {
            try
            {
                await Mediator.Send(new DeleteVehicleImageCommand { VehicleId = id, ImageId = imageId });
                return Ok(new { success = true, message = "تم حذف الصورة بنجاح." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
        }
    }
}
