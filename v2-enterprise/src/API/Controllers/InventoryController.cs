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
using CarShowroomManagementV2.Domain.Entities;

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

        // 1.ج تغيير حالة السيارة يدوياً (Available / Reserved / UnderMaintenance)
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> ChangeStatus(Guid id, [FromBody] ChangeVehicleStatusRequest body)
        {
            await Mediator.Send(new ChangeVehicleStatusCommand
            {
                VehicleId = id,
                NewStatus = body.NewStatus,
                Notes     = body.Notes,
            });
            return Ok(new { success = true, message = "تم تغيير حالة السيارة بنجاح." });
        }

        // 2. قائمة السيارات في المعرض
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] Guid? supplier_id,
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 25)
        {
            if (page < 1) page = 1;
            if (per_page < 1) per_page = 25;
            if (per_page > 1000) per_page = 1000;

            var query = new GetVehiclesListQuery { Status = status, SupplierId = supplier_id };
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

        // 5.1 عرض ربط أنواع مصاريف السيارات بالحسابات المحاسبية
        [HttpGet("vehicle-cost-accounts")]
        public async Task<IActionResult> GetVehicleCostAccountMappings()
        {
            var data = await Mediator.Send(new GetVehicleCostAccountMappingsQuery());
            return Ok(new { success = true, data });
        }

        // 5.2 تحديد/تعديل الحساب المحاسبي لنوع مصروف سيارة معين
        [Authorize(Roles = "Owner,Admin,Accountant")]
        [HttpPut("vehicle-cost-accounts")]
        public async Task<IActionResult> SetVehicleCostAccountMapping([FromBody] SetVehicleCostAccountMappingCommand command)
        {
            if (command == null)
                return BadRequest(new { success = false, message = "بيانات الربط غير صالحة." });

            await Mediator.Send(command);
            return Ok(new { success = true, message = "تم حفظ ربط الحساب بنجاح." });
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

        // 9أ. عدد السيارات المطابقة لموديل/سنة/فئة معينة (لمعاينة الأثر قبل التحديث الجماعي)
        [HttpGet("bulk-images/affected-count")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> GetBulkImagesAffectedCount(
            [FromQuery] string brand, [FromQuery] string model, [FromQuery] int year, [FromQuery] string? trim)
        {
            if (string.IsNullOrWhiteSpace(model))
                return BadRequest(new { success = false, message = "الموديل مطلوب." });

            var query = _context.Vehicles.IgnoreQueryFilters()
                .Where(v => v.Model == model && v.Year == year && (string.IsNullOrEmpty(brand) || v.Brand == brand));
            if (!string.IsNullOrWhiteSpace(trim))
                query = query.Where(v => v.Trim == trim);

            var count = await query.CountAsync();
            return Ok(new { success = true, count });
        }

        // 9ب. تحديث الصور الجماعي — يطبّق مجموعة صور على كل السيارات المطابقة لنفس
        // الماركة/الموديل/السنة/الفئة، بشكل تحاملي (transactional) بالكامل مع تراجع تام عند أي خطأ.
        [HttpPost("bulk-images")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> BulkUploadImages(
            [FromForm] string brand,
            [FromForm] string model,
            [FromForm] int year,
            [FromForm] string? trim,
            [FromForm] bool replaceExisting,
            [FromForm] List<IFormFile> files)
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            if (string.IsNullOrWhiteSpace(model))
                return BadRequest(new { success = false, message = "الموديل مطلوب." });
            if (files == null || files.Count == 0)
                return BadRequest(new { success = false, message = "لم يتم رفع أي صورة." });

            // 1) التحقق من كل الملفات قبل لمس القرص أو قاعدة البيانات — فشل أي ملف يوقف العملية بالكامل
            var validatedFiles = new List<(string ext, byte[] bytes)>();
            foreach (var file in files)
            {
                if (file.Length == 0)
                    return BadRequest(new { success = false, message = $"الملف {file.FileName} فارغ." });
                if (file.Length > MaxImageBytes)
                    return BadRequest(new { success = false, message = $"حجم الصورة {file.FileName} يتجاوز الحد الأقصى المسموح به (5 MB)." });

                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!AllowedImageExtensions.Contains(ext))
                    return BadRequest(new { success = false, message = $"نوع الملف {file.FileName} غير مسموح به. الأنواع المقبولة: {string.Join(", ", AllowedImageExtensions)}" });

                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);
                var fileBytes = memoryStream.ToArray();

                if (!IsValidImageMagicBytes(fileBytes, ext))
                    return BadRequest(new { success = false, message = $"محتوى الملف {file.FileName} لا يطابق نوع الصورة المتوقع." });
                if (!TryGetImageDimensions(fileBytes, ext, out var width, out var height))
                    return BadRequest(new { success = false, message = $"تعذّر قراءة أبعاد الصورة {file.FileName}." });
                if (width > MaxImageDimension || height > MaxImageDimension)
                    return BadRequest(new { success = false, message = $"أبعاد الصورة {file.FileName} كبيرة جداً. الحد الأقصى {MaxImageDimension}×{MaxImageDimension} بكسل." });

                validatedFiles.Add((ext, fileBytes));
            }

            // 2) تحديد السيارات المطابقة تمامًا (ماركة + موديل + سنة، والفئة إن حُدّدت)
            var vehiclesQuery = _context.Vehicles.IgnoreQueryFilters()
                .Where(v => v.Model == model && v.Year == year && (string.IsNullOrEmpty(brand) || v.Brand == brand));
            if (!string.IsNullOrWhiteSpace(trim))
                vehiclesQuery = vehiclesQuery.Where(v => v.Trim == trim);

            var vehicles = await vehiclesQuery.ToListAsync();
            if (vehicles.Count == 0)
                return BadRequest(new { success = false, message = "لا توجد سيارات تطابق هذا الموديل/السنة/الفئة." });

            var dbContext = _context as DbContext;
            if (dbContext == null)
                return StatusCode(500, new { success = false, message = "خطأ داخلي في السياق." });

            var storagePath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "vehicles");
            Directory.CreateDirectory(storagePath);

            var writtenFilePaths = new List<string>(); // لتنظيفها إن فشلت العملية وتراجعنا
            using var transaction = await dbContext.Database.BeginTransactionAsync();
            try
            {
                // 3) وضع الاستبدال: إزالة مراجع الصور القديمة لكل سيارة متأثرة
                var removedFileCandidates = new HashSet<string>();
                if (replaceExisting)
                {
                    var vehicleIds = vehicles.Select(v => v.Id).ToList();
                    var oldImages = await _context.VehicleImages
                        .Where(vi => vehicleIds.Contains(vi.VehicleId))
                        .ToListAsync();
                    foreach (var img in oldImages) removedFileCandidates.Add(img.FileName);
                    _context.VehicleImages.RemoveRange(oldImages);
                    await _context.SaveChangesAsync();
                }

                // 4) حفظ كل صورة جديدة مرة واحدة فقط على القرص (كتابة مؤقتة ثم إعادة تسمية ذرّية)
                var savedFileNames = new List<string>();
                foreach (var (ext, bytes) in validatedFiles)
                {
                    var secureFileName = $"{Guid.NewGuid():N}{ext}";
                    var tempPath = Path.Combine(storagePath, $".{secureFileName}.partial");
                    var finalPath = Path.Combine(storagePath, secureFileName);
                    await System.IO.File.WriteAllBytesAsync(tempPath, bytes);
                    System.IO.File.Move(tempPath, finalPath);
                    writtenFilePaths.Add(finalPath);
                    savedFileNames.Add(secureFileName);
                }

                // 5) إنشاء سجلات VehicleImages: صف لكل (سيارة × صورة مرفوعة)، بترتيب يضمن أن
                // أول صورة (savedFileNames[0]) هي الغلاف لكل سيارة (أقدم UploadedAt ضمن صور تلك السيارة تحديدًا)
                var baseTime = DateTime.UtcNow;
                long tickOffset = 0;
                foreach (var vehicle in vehicles)
                {
                    foreach (var fileName in savedFileNames)
                    {
                        _context.VehicleImages.Add(new VehicleImage
                        {
                            Id = Guid.NewGuid(),
                            VehicleId = vehicle.Id,
                            FileName = fileName,
                            UploadedAt = baseTime.AddTicks(tickOffset++)
                        });
                    }
                }
                await _context.SaveChangesAsync();

                // 6) وضع الاستبدال: حذف الملفات الفعلية اليتيمة فقط (غير مُشار لها من أي سيارة بعد الآن)
                if (replaceExisting && removedFileCandidates.Count > 0)
                {
                    foreach (var fileName in removedFileCandidates)
                    {
                        var stillReferenced = await _context.VehicleImages.AnyAsync(vi => vi.FileName == fileName);
                        if (!stillReferenced)
                        {
                            var oldPath = Path.Combine(storagePath, fileName);
                            if (System.IO.File.Exists(oldPath))
                                System.IO.File.Delete(oldPath);
                        }
                    }
                }

                // 7) فحص سلامة قبل الـ commit: كل صورة مُشار لها لأي سيارة متأثرة يجب أن يكون لها ملف فعلي
                var affectedVehicleIds = vehicles.Select(v => v.Id).ToList();
                var finalReferencedFiles = await _context.VehicleImages
                    .Where(vi => affectedVehicleIds.Contains(vi.VehicleId))
                    .Select(vi => vi.FileName)
                    .Distinct()
                    .ToListAsync();
                foreach (var fileName in finalReferencedFiles)
                {
                    if (!System.IO.File.Exists(Path.Combine(storagePath, fileName)))
                        throw new InvalidOperationException($"فشل التحقق من السلامة: الملف {fileName} غير موجود على القرص بعد الحفظ.");
                }

                await transaction.CommitAsync();
                stopwatch.Stop();

                return Ok(new
                {
                    success = true,
                    vehiclesUpdated = vehicles.Count,
                    imagesUploaded = savedFileNames.Count,
                    imagesReused = (vehicles.Count * savedFileNames.Count) - savedFileNames.Count,
                    executionTimeMs = stopwatch.ElapsedMilliseconds,
                    message = $"تم تحديث الصور لـ {vehicles.Count} سيارة."
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                foreach (var path in writtenFilePaths)
                {
                    try { if (System.IO.File.Exists(path)) System.IO.File.Delete(path); } catch { /* best-effort cleanup only */ }
                }
                return StatusCode(500, new { success = false, message = $"فشلت العملية وتم التراجع الكامل عن كل التغييرات: {ex.Message}" });
            }
        }

        // 10. تحديث مواصفات جماعي حسب الموديل
        [HttpPut("bulk-specs")]
        public async Task<IActionResult> BulkUpdateSpecs([FromBody] BulkSpecsRequest request)
        {
            if (string.IsNullOrEmpty(request.Model))
                return BadRequest(new { success = false, message = "الموديل مطلوب." });

            var vehicles = await _context.Vehicles
                .IgnoreQueryFilters()
                .Where(v => v.Model == request.Model && (string.IsNullOrEmpty(request.Brand) || v.Brand == request.Brand))
                .ToListAsync();

            if (vehicles.Count == 0)
                return BadRequest(new { success = false, message = "لا توجد سيارات تطابق هذا الموديل." });

            foreach (var vehicle in vehicles)
            {
                if (!string.IsNullOrEmpty(request.Condition)) vehicle.Condition = request.Condition;
                if (!string.IsNullOrEmpty(request.FuelType)) vehicle.FuelType = request.FuelType;
                if (!string.IsNullOrEmpty(request.Transmission)) vehicle.Transmission = request.Transmission;
                if (!string.IsNullOrEmpty(request.EngineSize)) vehicle.EngineSize = request.EngineSize;
                if (request.Cylinders.HasValue) vehicle.Cylinders = request.Cylinders;
                if (request.SeatCount.HasValue) vehicle.SeatCount = request.SeatCount;
                if (!string.IsNullOrEmpty(request.ImportCountry)) vehicle.ImportCountry = request.ImportCountry;
            }

            await _context.SaveChangesAsync(default);
            return Ok(new { success = true, updated_count = vehicles.Count, message = $"تم تحديث مواصفات {vehicles.Count} سيارة." });
        }

        public class BulkSpecsRequest
        {
            public string Brand { get; set; } = string.Empty;
            public string Model { get; set; } = string.Empty;
            public string? Condition { get; set; }
            public string? FuelType { get; set; }
            public string? Transmission { get; set; }
            public string? EngineSize { get; set; }
            public int? Cylinders { get; set; }
            public int? SeatCount { get; set; }
            public string? ImportCountry { get; set; }
        }

        public class ChangeVehicleStatusRequest
        {
            public string NewStatus { get; set; } = string.Empty;
            public string? Notes { get; set; }
        }
    }
}
