using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using CarShowroomManagementV2.Application.Inventory.Commands;
using CarShowroomManagementV2.Application.Inventory.Queries;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    public class InventoryController : ApiControllerBase
    {
        private static readonly string[] AllowedImageExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
        private const long MaxImageBytes = 10 * 1024 * 1024; // 10 MB

        // 1. تسجيل شراء سيارة جديدة
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateVehicleCommand command)
        {
            var id = await Mediator.Send(command);
            return Ok(new { success = true, vehicleId = id, message = "تم تسجيل شراء السيارة وإنشاء قيد المخزون بنجاح." });
        }

        // 2. قائمة السيارات في المعرض
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 25)
        {
            if (page < 1) page = 1;
            if (per_page < 1 || per_page > 100) per_page = 25;

            var query = new GetVehiclesListQuery { Status = status };
            var all = await Mediator.Send(query);

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

            var command = new UploadVehicleImageCommand
            {
                VehicleId = id,
                OriginalFileName = file.FileName,
                FileBytes = memoryStream.ToArray()
            };

            var imageId = await Mediator.Send(command);
            return Ok(new { success = true, vehicleImageId = imageId, message = "تم رفع وحفظ صورة السيارة بنجاح." });
        }
    }
}
