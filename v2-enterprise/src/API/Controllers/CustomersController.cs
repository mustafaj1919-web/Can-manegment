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

        // 1.ب تعديل بيانات عميل موجود
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCustomerCommand command)
        {
            command.Id = id;
            var customerId = await Mediator.Send(command);
            return Ok(new { success = true, customerId, message = "تم تحديث بيانات العميل بنجاح." });
        }

        // 2. قائمة العملاء
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 25,
            [FromQuery] string? search = null,
            [FromQuery] string? customer_type = null)
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

            if (!string.IsNullOrWhiteSpace(customer_type))
            {
                all = all.Where(c => c.CustomerType.Equals(customer_type, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            var total = all.Count;
            var data = all.Skip((page - 1) * per_page).Take(per_page).ToList();

            return Ok(new { success = true, total, page, per_page, data });
        }

        // 2.ب جلب عميل واحد بمعرّفه
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var all = await Mediator.Send(new GetCustomersListQuery());
            var customer = all.FirstOrDefault(c => c.Id == id);
            if (customer == null)
                return NotFound(new { success = false, message = "العميل غير موجود." });
            var photoUrl = !string.IsNullOrEmpty(customer.PhotoUrl)
                ? $"/api/Customers/{customer.Id}/photo"
                : null;
            return Ok(new { success = true, data = customer, photo_url = photoUrl });
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

        // 5. قائمة مستندات العميل
        [HttpGet("{id}/documents")]
        public async Task<IActionResult> ListDocuments(Guid id)
        {
            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == id);
            if (customer == null)
                return NotFound(new { success = false, message = "العميل غير موجود." });

            var docs = await _context.CustomerDocuments
                .Where(d => d.CustomerId == id)
                .OrderByDescending(d => d.UploadedAt)
                .Select(d => new
                {
                    id             = d.Id,
                    document_type  = d.DocumentType,
                    filename       = d.FileName,
                    original_filename = d.OriginalFileName,
                    uploaded_at    = d.UploadedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = docs });
        }

        // 5.ب حذف مستند
        [HttpDelete("{id}/documents/{docId}")]
        public async Task<IActionResult> DeleteDocument(Guid id, Guid docId)
        {
            var doc = await _context.CustomerDocuments.FirstOrDefaultAsync(d => d.Id == docId && d.CustomerId == id);
            if (doc == null)
                return NotFound(new { success = false, message = "المستند غير موجود." });

            var storagePath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "private", "customers");
            var fullPath = Path.Combine(storagePath, doc.FileName);
            if (System.IO.File.Exists(fullPath)) System.IO.File.Delete(fullPath);

            _context.CustomerDocuments.Remove(doc);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "تم حذف المستند." });
        }

        private static readonly string[] AllowedDocExtensions = { ".pdf", ".jpg", ".jpeg", ".png", ".webp" };
        private const long MaxDocBytes = 20 * 1024 * 1024; // 20 MB

        // 6. رفع مستند للعميل
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

        // 6. تحميل المستند المحمي أمنياً — مرتبط بمعرّف العميل لمنع تخمين أسماء الملفات
        [HttpGet("{id}/documents/{fileName}")]
        public async Task<IActionResult> DownloadDocument(Guid id, string fileName)
        {
            // رفض أي محاولة directory traversal
            if (fileName.Contains('/') || fileName.Contains('\\') || fileName.Contains(".."))
                return BadRequest(new { success = false, message = "اسم الملف غير صالح." });

            var document = await _context.CustomerDocuments
                .Include(d => d.Customer)
                .FirstOrDefaultAsync(d => d.CustomerId == id && d.FileName == fileName);

            if (document == null || document.Customer == null)
                return NotFound(new { success = false, message = "المستند غير موجود." });

            if (document.Customer.BranchId != _currentUserService.BranchId)
                return Forbid();

            var storagePath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "private", "customers");
            var fullFilePath = Path.GetFullPath(Path.Combine(storagePath, fileName));

            // التحقق إن المسار النهائي لا يخرج من مجلد التخزين
            if (!fullFilePath.StartsWith(Path.GetFullPath(storagePath)))
                return BadRequest(new { success = false, message = "مسار الملف غير صالح." });

            if (!System.IO.File.Exists(fullFilePath))
                return NotFound(new { success = false, message = "ملف المستند غير موجود على القرص." });

            var contentType = "application/octet-stream";
            var originalFileName = document.OriginalFileName ?? "document";
            var extension = Path.GetExtension(originalFileName).ToLower();
            if (extension == ".pdf") contentType = "application/pdf";
            else if (extension == ".jpg" || extension == ".jpeg") contentType = "image/jpeg";
            else if (extension == ".png") contentType = "image/png";

            return PhysicalFile(fullFilePath, contentType, originalFileName);
        }

        // 7. رفع صورة شخصية للعميل
        [HttpPost("{id}/photo")]
        public async Task<IActionResult> UploadPhoto(Guid id, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "لم يتم اختيار ملف." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp")
                return BadRequest(new { success = false, message = "صيغة الملف غير مدعومة. يُسمح بـ JPG, PNG, WEBP فقط." });

            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { success = false, message = "حجم الصورة يتجاوز الحد المسموح (5 ميجابايت)." });

            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == id);
            if (customer == null) return NotFound();

            var storageDir = Path.Combine("/app/storage/customers");
            Directory.CreateDirectory(storageDir);

            // حذف الصورة القديمة إن وجدت
            if (!string.IsNullOrEmpty(customer.PhotoUrl))
            {
                var oldPath = Path.Combine(storageDir, customer.PhotoUrl);
                if (System.IO.File.Exists(oldPath)) System.IO.File.Delete(oldPath);
            }

            var fileName = $"{id}{ext}";
            var filePath = Path.Combine(storageDir, fileName);

            await using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            customer.PhotoUrl = fileName;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, photo_url = $"/api/Customers/{id}/photo", message = "تم رفع الصورة بنجاح." });
        }

        // 7.ب عرض الصورة الشخصية للعميل
        [HttpGet("{id}/photo")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPhoto(Guid id)
        {
            var customer = await _context.Customers.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == id);
            if (customer == null || string.IsNullOrEmpty(customer.PhotoUrl))
                return NotFound();

            var filePath = Path.Combine("/app/storage/customers", customer.PhotoUrl);
            if (!System.IO.File.Exists(filePath)) return NotFound();

            var ext = Path.GetExtension(filePath).ToLowerInvariant();
            var contentType = ext switch {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".webp" => "image/webp",
                _ => "application/octet-stream"
            };

            var bytes = await System.IO.File.ReadAllBytesAsync(filePath);
            Response.Headers["Cache-Control"] = "public, max-age=3600";
            return File(bytes, contentType);
        }
    }
}
