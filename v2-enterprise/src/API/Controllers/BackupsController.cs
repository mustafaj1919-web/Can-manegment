using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize(Roles = "Owner,Admin")]
    public class BackupsController : ApiControllerBase
    {
        private readonly string _backupFolder;
        private readonly string _archiveFolder;
        private readonly ICurrentUserService _currentUserService;

        // اعتمادات قاعدة البيانات — تُقرأ من متغيرات البيئة التي يُمررها docker-compose
        private readonly string _pgHost;
        private readonly string _pgUser;
        private readonly string _pgPassword;
        private readonly string _pgDatabase;

        private static readonly string[] AllowedExtensions = { ".dump", ".sql", ".bak", ".gz", ".zip" };
        private const long MaxUploadBytes = 500 * 1024 * 1024; // 500 MB
        private const int BackupTimeoutMs = 10 * 60 * 1000;    // 10 دقائق

        public BackupsController(ICurrentUserService currentUserService, IConfiguration config)
        {
            _currentUserService = currentUserService;
            _backupFolder  = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "backups"));
            _archiveFolder = Path.Combine(_backupFolder, "archive");
            Directory.CreateDirectory(_backupFolder);
            Directory.CreateDirectory(_archiveFolder);

            _pgHost     = config["Backup:PgHost"]     ?? "v2-postgres-db";
            _pgUser     = config["Backup:PgUser"]     ?? "postgres";
            _pgPassword = config["Backup:PgPassword"] ?? string.Empty;
            _pgDatabase = config["Backup:PgDatabase"] ?? "CarShowroomV2";
        }

        // ─── Path traversal guard ──────────────────────────────────────────────────
        private bool IsSafeFilename(string filename, out string safePath)
        {
            safePath = string.Empty;
            var safeFilename = Path.GetFileName(filename);
            if (string.IsNullOrWhiteSpace(safeFilename) || safeFilename != filename)
                return false;
            safePath = Path.GetFullPath(Path.Combine(_backupFolder, safeFilename));
            return safePath.StartsWith(_backupFolder, StringComparison.OrdinalIgnoreCase);
        }

        // ─── Run pg_dump or pg_restore via process ─────────────────────────────────
        private async Task<(int exitCode, string stderr)> RunProcessAsync(
            string exe, string args, CancellationToken ct = default)
        {
            var psi = new ProcessStartInfo
            {
                FileName               = exe,
                Arguments              = args,
                UseShellExecute        = false,
                RedirectStandardOutput = true,
                RedirectStandardError  = true,
                CreateNoWindow         = true,
            };
            psi.Environment["PGPASSWORD"] = _pgPassword;

            using var cts     = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(BackupTimeoutMs);

            using var process = new Process { StartInfo = psi };
            process.Start();

            var stderr = await process.StandardError.ReadToEndAsync(cts.Token);
            await process.WaitForExitAsync(cts.Token);
            return (process.ExitCode, stderr);
        }

        // 1. قائمة النسخ الاحتياطية
        [HttpGet]
        public IActionResult GetBackups()
        {
            var files = Directory.GetFiles(_backupFolder, "*.dump")
                .Concat(Directory.GetFiles(_backupFolder, "*.sql"))
                .Select(f => new FileInfo(f))
                .OrderByDescending(f => f.CreationTime)
                .Select(f => new
                {
                    filename   = f.Name,
                    created_at = f.CreationTime,
                    created_by = ExtractCreatedBy(f.Name),
                    reason     = ExtractReason(f.Name),
                    size       = f.Length,
                })
                .ToList();

            return Ok(new { backups = files });
        }

        // 2. إنشاء نسخة احتياطية حقيقية بـ pg_dump
        [HttpPost]
        public async Task<IActionResult> CreateBackup([FromBody] BackupRequest? request, CancellationToken ct)
        {
            var reason    = string.IsNullOrWhiteSpace(request?.Reason) ? "manual" : request.Reason;
            var userId    = _currentUserService.UserId ?? "system";
            var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
            var filename  = $"backup_{timestamp}_{reason}_{userId}.dump";
            var fullPath  = Path.Combine(_backupFolder, filename);

            var args = $"-h {_pgHost} -U {_pgUser} -d {_pgDatabase} -F c --no-password -f \"{fullPath}\"";
            var (exitCode, stderr) = await RunProcessAsync("pg_dump", args, ct);

            if (exitCode != 0)
            {
                // احذف ملف جزئي إن وُجد
                if (System.IO.File.Exists(fullPath))
                    System.IO.File.Delete(fullPath);

                return StatusCode(500, new
                {
                    success = false,
                    message = "فشل إنشاء النسخة الاحتياطية.",
                    detail  = stderr,
                });
            }

            // احذف النسخ التي تجاوزت 30 يوماً تلقائياً
            PruneOldBackups(days: 30);

            var fileInfo = new FileInfo(fullPath);
            return Ok(new
            {
                filename   = fileInfo.Name,
                created_at = fileInfo.CreationTime,
                created_by = userId,
                reason,
                size       = fileInfo.Length,
            });
        }

        // 3. استعادة نسخة احتياطية حقيقية بـ pg_restore
        [HttpPost("{filename}/restore")]
        public async Task<IActionResult> RestoreBackup(string filename, CancellationToken ct)
        {
            if (!IsSafeFilename(filename, out var fullPath))
                return BadRequest(new { success = false, message = "اسم الملف غير صالح." });

            if (!System.IO.File.Exists(fullPath))
                return NotFound(new { success = false, message = "ملف النسخ الاحتياطي غير موجود." });

            // نسخة أمان تلقائية قبل الاستعادة
            var safetyTs   = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
            var safetyFile = Path.Combine(_archiveFolder, $"pre_restore_{safetyTs}.dump");
            var safetyArgs = $"-h {_pgHost} -U {_pgUser} -d {_pgDatabase} -F c --no-password -f \"{safetyFile}\"";
            await RunProcessAsync("pg_dump", safetyArgs, ct); // غير قاتل — نكمل حتى لو فشلت

            var restoreArgs = $"-h {_pgHost} -U {_pgUser} -d {_pgDatabase} --no-password --clean --if-exists \"{fullPath}\"";
            var (exitCode, stderr) = await RunProcessAsync("pg_restore", restoreArgs, ct);

            if (exitCode != 0 && exitCode != 1) // exitCode 1 = تحذيرات غير قاتلة
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "فشلت الاستعادة.",
                    detail  = stderr,
                });
            }

            return Ok(new
            {
                success = true,
                message = "تمت استعادة قاعدة البيانات بنجاح.",
                safety_backup = Path.GetFileName(safetyFile),
            });
        }

        // 4. رفع ملف نسخة احتياطية خارجية
        [HttpPost("upload")]
        public async Task<IActionResult> UploadBackup(IFormFile file, CancellationToken ct)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "الملف غير صالح." });

            if (file.Length > MaxUploadBytes)
                return BadRequest(new { success = false, message = "حجم الملف يتجاوز 500 MB." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return BadRequest(new { success = false, message = $"امتداد غير مسموح. المقبول: {string.Join(", ", AllowedExtensions)}" });

            var safeFilename = $"upload_{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Path.GetFileName(file.FileName)}";
            if (!IsSafeFilename(safeFilename, out var fullPath))
                return BadRequest(new { success = false, message = "اسم الملف غير صالح." });

            using (var stream = new FileStream(fullPath, FileMode.Create))
                await file.CopyToAsync(stream, ct);

            var fileInfo = new FileInfo(fullPath);
            return Ok(new
            {
                filename   = fileInfo.Name,
                created_at = fileInfo.CreationTime,
                created_by = _currentUserService.UserId ?? "system",
                reason     = "upload",
                size       = fileInfo.Length,
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

            var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            return File(stream, "application/octet-stream", filename);
        }

        // ─── Helpers ────────────────────────────────────────────────────────────────
        private static string ExtractReason(string filename)
        {
            if (filename.Contains("pre_restore")) return "pre_restore_safety";
            if (filename.Contains("auto"))        return "daily_auto";
            if (filename.Contains("upload"))      return "upload";
            return "manual";
        }

        private static string ExtractCreatedBy(string filename)
        {
            // filename: backup_TIMESTAMP_REASON_USERID.dump
            var parts = Path.GetFileNameWithoutExtension(filename).Split('_');
            return parts.Length >= 4 ? parts[^1] : "system";
        }

        private void PruneOldBackups(int days)
        {
            try
            {
                var cutoff = DateTime.UtcNow.AddDays(-days);
                foreach (var f in Directory.GetFiles(_backupFolder, "backup_*.dump"))
                    if (System.IO.File.GetCreationTimeUtc(f) < cutoff)
                        System.IO.File.Delete(f);
            }
            catch { /* non-fatal */ }
        }
    }

    public class BackupRequest
    {
        public string? Reason { get; set; }
    }
}
