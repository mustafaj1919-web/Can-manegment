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
        private const long MaxImageBytes = 5 * 1024 * 1024; // 5 MB
        private const int MaxImageDimension = 4000; // max width or height in pixels

        private static bool TryGetImageDimensions(byte[] bytes, string ext, out int width, out int height)
        {
            width = height = 0;
            try
            {
                if (ext is ".jpg" or ".jpeg")
                {
                    // JPEG: scan for SOF marker (0xFF 0xC0 / 0xC2)
                    for (int i = 2; i < bytes.Length - 8; i++)
                    {
                        if (bytes[i] == 0xFF && (bytes[i + 1] == 0xC0 || bytes[i + 1] == 0xC2))
                        {
                            height = (bytes[i + 5] << 8) | bytes[i + 6];
                            width  = (bytes[i + 7] << 8) | bytes[i + 8];
                            return true;
                        }
                    }
                    return false;
                }
                if (ext == ".png" && bytes.Length >= 24)
                {
                    width  = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
                    height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
                    return true;
                }
                if (ext == ".webp" && bytes.Length >= 30)
                {
                    // WebP VP8 chunk
                    width  = ((bytes[26] | (bytes[27] << 8)) & 0x3FFF) + 1;
                    height = ((bytes[28] | (bytes[29] << 8)) & 0x3FFF) + 1;
                    return true;
                }
                return false;
            }
            catch { return false; }
        }

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
            var contractMap = await _context.SalesContracts
                .GroupBy(sc => sc.VehicleId)
                .Select(g => new { VehicleId = g.Key, SalePrice = g.Select(sc => sc.SalePrice).FirstOrDefault() })
                .ToDictionaryAsync(x => x.VehicleId, x => x.SalePrice);

            var vehicleQuery = _context.Vehicles
                .Select(v => new
                {
                    v.Id, v.Model, v.Brand, v.Year, v.ChassisNumber, v.Status, v.PurchaseCost,
                    ExtraCosts = v.DetailedCosts
                        .Where(c => c.CostType != "purchase")
                        .Sum(c => c.Amount),
                    CostBreakdown = v.DetailedCosts
                        .Where(c => c.CostType != "purchase")
                        .GroupBy(c => c.CostType)
                        .Select(g => new { Type = g.Key, Total = g.Sum(x => x.Amount) }),
                    CostItems = v.DetailedCosts
                        .Where(c => c.CostType != "purchase")
                        .Select(c => new { id = c.Id, cost_type = c.CostType, amount = c.Amount, currency = c.Currency, description = c.Description, created_at = c.CreatedAt }),
                });

            if (onlySold)
                vehicleQuery = vehicleQuery.Where(v => contractMap.Keys.Contains(v.Id));

            var rows = await vehicleQuery.ToListAsync();

            var cars = rows.Select(v =>
            {
                var totalCost = v.PurchaseCost + v.ExtraCosts;
                decimal? sellingPrice = contractMap.TryGetValue(v.Id, out var sp) ? sp : null;
                decimal? netProfit = sellingPrice.HasValue ? sellingPrice.Value - totalCost : null;
                decimal? profitPct = (netProfit.HasValue && totalCost > 0)
                    ? Math.Round(netProfit.Value / totalCost * 100, 1) : null;
                return new
                {
                    car_id = v.Id, brand = v.Brand ?? "", model = v.Model, year = v.Year,
                    vin = v.ChassisNumber, status = v.Status,
                    purchase_price_iqd = v.PurchaseCost, costs_total_iqd = v.ExtraCosts,
                    total_cost_iqd = totalCost, selling_price_iqd = sellingPrice,
                    net_profit_iqd = netProfit, profit_pct = profitPct,
                    cost_breakdown = v.CostBreakdown.ToDictionary(g => g.Type, g => g.Total),
                    costs = v.CostItems.ToList()
                };
            }).ToList();

            var sold = cars.Where(c => c.selling_price_iqd.HasValue).ToList();
            var profits = sold.Where(c => c.net_profit_iqd.HasValue).Select(c => c.net_profit_iqd!.Value).ToList();
            var ordered = sold.OrderByDescending(c => c.net_profit_iqd ?? 0).ToList();

            return Ok(new { success = true, data = new {
                cars,
                summary = new {
                    most_profitable = ordered.Take(5),
                    least_profitable = ordered.AsEnumerable().Reverse().Take(5),
                    losing = sold.Where(c => c.net_profit_iqd < 0),
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

            // رفض الصور التي تتجاوز الحجم الآمن (5 MB يكفي لصور السيارات بدقة عالية)
            // التحقق من الأبعاد يتم عبر magic bytes لأن System.Drawing غير متوفر على Linux
            if (!TryGetImageDimensions(fileBytes, ext, out var width, out var height))
                return BadRequest(new { success = false, message = "تعذّر قراءة أبعاد الصورة. تأكد من أنها ملف صورة صالح." });
            if (width > MaxImageDimension || height > MaxImageDimension)
                return BadRequest(new { success = false, message = $"أبعاد الصورة كبيرة جداً. الحد الأقصى {MaxImageDimension}×{MaxImageDimension} بكسل." });

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

        // 8. تعيين السيارة لفرع محدد
        [HttpPut("{id}/assign-branch")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> AssignBranch(Guid id, [FromBody] AssignBranchRequest request)
        {
            var db = HttpContext.RequestServices.GetRequiredService<IApplicationDbContext>();
            var vehicle = await db.Vehicles.IgnoreQueryFilters()
                .FirstOrDefaultAsync(v => v.Id == id);
            if (vehicle == null)
                return NotFound(new { success = false, message = "السيارة غير موجودة." });

            var branch = await db.Branches.FirstOrDefaultAsync(b => b.Id == request.BranchId && b.IsActive);
            if (branch == null)
                return BadRequest(new { success = false, message = "الفرع المحدد غير موجود أو غير نشط." });

            vehicle.BranchId = request.BranchId;
            await db.SaveChangesAsync(default);

            return Ok(new { success = true, message = $"تم تعيين السيارة إلى فرع {branch.Name} بنجاح." });
        }

        public record AssignBranchRequest(Guid BranchId);
    }
}
