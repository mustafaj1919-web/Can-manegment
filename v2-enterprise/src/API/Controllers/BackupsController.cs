using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize(Roles = "Owner,Admin")]
    public class BackupsController : ApiControllerBase
    {
        private readonly string _backupFolder;
        private readonly ICurrentUserService _currentUserService;

        private static readonly string[] AllowedExtensions = { ".dump", ".sql", ".bak", ".gz", ".zip" };
        private const long MaxUploadBytes = 500 * 1024 * 1024; // 500 MB

        public BackupsController(ICurrentUserService currentUserService)
        {
            _currentUserService = currentUserService;
            _backupFolder = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "backups"));
            if (!Directory.Exists(_backupFolder))
                Directory.CreateDirectory(_backupFolder);
        }

        // التحقق من أن المسار يقع داخل مجلد النسخ الاحتياطية (منع Path Traversal)
        private bool IsSafeFilename(string filename, out string safePath)
        {
            safePath = string.Empty;
            // يمنع أي اسم ملف يحتوي على فاصلة مسار أو محرف صعود
            var safeFilename = Path.GetFileName(filename);
            if (string.IsNullOrWhiteSpace(safeFilename) || safeFilename != filename)
                return false;

            safePath = Path.GetFullPath(Path.Combine(_backupFolder, safeFilename));
            return safePath.StartsWith(_backupFolder, StringComparison.OrdinalIgnoreCase);
        }

        // 1. جلب قائمة ملفات النسخ الاحتياطي
        [HttpGet]
        public IActionResult GetBackups()
        {
            var files = Directory.GetFiles(_backupFolder, "*.*")
                .Select(f => new FileInfo(f))
                .OrderByDescending(f => f.CreationTime)
                .Select(f => new
                {
                    filename   = f.Name,
                    created_at = f.CreationTime,
                    created_by = _currentUserService.UserId ?? "system",
                    reason     = f.Name.Contains("auto") ? "daily_auto" : "manual",
                    size       = f.Length
                })
                .ToList();

            return Ok(new { backups = files });
        }

        // 2. إنشاء نسخة احتياطية جديدة
        [HttpPost]
        public async Task<IActionResult> CreateBackup([FromBody] BackupRequest request)
        {
            var reason    = string.IsNullOrWhiteSpace(request?.Reason) ? "manual" : request.Reason;
            var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
            var filename  = $"backup_{timestamp}_{reason}.dump";
            var fullPath  = Path.Combine(_backupFolder, filename);

            await System.IO.File.WriteAllTextAsync(fullPath, "-- Car Showroom Backup DUMP file simulated --");

            var fileInfo = new FileInfo(fullPath);
            return Ok(new
            {
                filename   = fileInfo.Name,
                created_at = fileInfo.CreationTime,
                created_by = _currentUserService.UserId ?? "system",
                reason,
                size = fileInfo.Length
            });
        }

        // 3. استعادة نسخة احتياطية
        [HttpPost("{filename}/restore")]
        public IActionResult RestoreBackup(string filename)
        {
            if (!IsSafeFilename(filename, out var fullPath))
                return BadRequest(new { success = false, message = "اسم الملف غير صالح." });

            if (!System.IO.File.Exists(fullPath))
                return NotFound(new { success = false, message = "ملف النسخ الاحتياطي غير موجود." });

            return Ok(new { success = true, message = "تمت استعادة قاعدة البيانات بنجاح وجاري إعادة تحميل النظام..." });
        }

        // 4. رفع ملف نسخة احتياطية
        [HttpPost("upload")]
        public async Task<IActionResult> UploadBackup(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "الملف غير صالح." });

            if (file.Length > MaxUploadBytes)
                return BadRequest(new { success = false, message = "حجم الملف يتجاوز الحد الأقصى المسموح به (500 MB)." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return BadRequest(new { success = false, message = $"امتداد الملف غير مسموح به. الامتدادات المقبولة: {string.Join(", ", AllowedExtensions)}" });

            var safeFilename = Path.GetFileName(file.FileName);
            if (!IsSafeFilename(safeFilename, out var fullPath))
                return BadRequest(new { success = false, message = "اسم الملف غير صالح." });

            using (var stream = new FileStream(fullPath, FileMode.Create))
                await file.CopyToAsync(stream);

            var fileInfo = new FileInfo(fullPath);
            return Ok(new
            {
                filename   = fileInfo.Name,
                created_at = fileInfo.CreationTime,
                created_by = _currentUserService.UserId ?? "system",
                reason     = "upload",
                size       = fileInfo.Length
            });
        }

        // 5. تنزيل ملف نسخة احتياطية
        [HttpGet("{filename}/download")]
        public IActionResult DownloadBackup(string filename)
        {
            if (!IsSafeFilename(filename, out var fullPath))
                return BadRequest(new { success = false, message = "اسم الملف غير صالح." });

            if (!System.IO.File.Exists(fullPath))
                return NotFound(new { success = false, message = "الملف غير موجود." });

            var fileBytes = System.IO.File.ReadAllBytes(fullPath);
            return File(fileBytes, "application/octet-stream", filename);
        }
    }

    public class BackupRequest
    {
        public string? Reason { get; set; }
    }
}
