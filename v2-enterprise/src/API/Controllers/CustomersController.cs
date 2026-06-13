using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Customers.Commands;
using CarShowroomManagementV2.Application.Customers.Queries;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize] // حماية كامل الواجهة بالصلاحيات والمصادقة
    public class CustomersController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CustomersController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // 1. تسجيل عميل جديد
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCustomerCommand command)
        {
            var id = await Mediator.Send(command);
            return Ok(new { success = true, customerId = id, message = "تم تسجيل العميل وإنشاء حسابه المالي بنجاح." });
        }

        // 2. قائمة العملاء
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 25,
            [FromQuery] string? search = null)
        {
            if (page < 1) page = 1;
            if (per_page < 1 || per_page > 100) per_page = 25;

            var all = await Mediator.Send(new GetCustomersListQuery());

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                all = all.Where(c =>
                    (c.Name != null && c.Name.Contains(s, StringComparison.OrdinalIgnoreCase)) ||
                    (c.FullName != null && c.FullName.Contains(s, StringComparison.OrdinalIgnoreCase)) ||
                    (c.Phone != null && c.Phone.Contains(s)) ||
                    (c.IdNumber != null && c.IdNumber.Contains(s))
                ).ToList();
            }

            var total = all.Count;
            var data = all.Skip((page - 1) * per_page).Take(per_page).ToList();

            return Ok(new { success = true, total, page, per_page, data });
        }

        // 3. كشف حساب أستاذ مساعد للعميل
        [HttpGet("{id}/ledger")]
        public async Task<IActionResult> GetLedger(Guid id, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var query = new GetCustomerLedgerQuery { CustomerId = id, StartDate = startDate, EndDate = endDate };
            var ledger = await Mediator.Send(query);
            return Ok(new { success = true, data = ledger });
        }

        // 4. ملخص كشف الحساب المالي للعميل
        [HttpGet("{id}/statement")]
        public async Task<IActionResult> GetStatement(Guid id, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var query = new GetCustomerStatementQuery { CustomerId = id, StartDate = startDate, EndDate = endDate };
            var statement = await Mediator.Send(query);
            return Ok(new { success = true, data = statement });
        }

        private static readonly string[] AllowedDocExtensions = { ".pdf", ".jpg", ".jpeg", ".png", ".webp" };
        private const long MaxDocBytes = 20 * 1024 * 1024; // 20 MB

        // 5. رفع مستند للعميل
        [HttpPost("{id}/documents")]
        public async Task<IActionResult> UploadDocument(Guid id, [FromForm] string documentType, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "لم يتم رفع أي ملف." });

            if (file.Length > MaxDocBytes)
                return BadRequest(new { success = false, message = "حجم الملف يتجاوز الحد الأقصى المسموح به (20 MB)." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedDocExtensions.Contains(ext))
                return BadRequest(new { success = false, message = $"نوع الملف غير مسموح به. الأنواع المقبولة: {string.Join(", ", AllowedDocExtensions)}" });

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);

            var command = new UploadCustomerDocumentCommand
            {
                CustomerId = id,
                DocumentType = documentType,
                OriginalFileName = file.FileName,
                FileBytes = memoryStream.ToArray()
            };

            var documentId = await Mediator.Send(command);
            return Ok(new { success = true, documentId = documentId, message = "تم رفع وحفظ مستند العميل بنجاح." });
        }

        // 6. تحميل المستند المحمي أمنياً وعزله بالفرع
        [HttpGet("documents/{fileName}")]
        public async Task<IActionResult> DownloadDocument(string fileName)
        {
            // جلب سجل المستند مع التحقق من الفرع للعميل المرتبط به
            var document = await _context.CustomerDocuments
                .Include(d => d.Customer)
                .FirstOrDefaultAsync(d => d.FileName == fileName);

            if (document == null || document.Customer == null)
            {
                return NotFound(new { success = false, message = "المستند غير موجود." });
            }

            // التحقق من تطابق فرع المستخدم مع فرع العميل صاحب المستند
            if (document.Customer.BranchId != _currentUserService.BranchId)
            {
                return Forbid(); // منع الوصول لبيانات فروع أخرى
            }

            var storagePath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "private", "customers");
            var fullFilePath = Path.Combine(storagePath, fileName);

            if (!System.IO.File.Exists(fullFilePath))
            {
                return NotFound(new { success = false, message = "ملف المستند غير موجود على القرص." });
            }

            var contentType = "application/octet-stream";
            var originalFileName = document.OriginalFileName ?? "document";
            var extension = Path.GetExtension(originalFileName).ToLower();
            if (extension == ".pdf") contentType = "application/pdf";
            else if (extension == ".jpg" || extension == ".jpeg") contentType = "image/jpeg";
            else if (extension == ".png") contentType = "image/png";

            return PhysicalFile(fullFilePath, contentType, originalFileName);
        }
    }
}
