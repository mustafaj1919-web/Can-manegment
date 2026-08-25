using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    [Route("api/admin/website")]
    public sealed class AdminWebsiteController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public AdminWebsiteController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        private async Task<bool> CheckPermission(string permissionName)
        {
            if (User.IsInRole("Owner") || User.IsInRole("Admin")) return true;

            if (string.IsNullOrEmpty(_currentUserService.UserId)) return false;
            var userId = Guid.Parse(_currentUserService.UserId);

            // Admins & Owners can do everything
            var isSystemAdmin = await _context.UserRoles
                .Include(ur => ur.Role)
                .AnyAsync(ur => ur.UserId == userId && (ur.Role.Name == "Owner" || ur.Role.Name == "Admin"));

            if (isSystemAdmin) return true;

            var hasPermission = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.Role)
                .SelectMany(r => r.RolePermissions)
                .Include(rp => rp.Permission)
                .AnyAsync(rp => rp.Permission != null && rp.Permission.Name == permissionName);

            return hasPermission;
        }

        #region 1. Website Settings
        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            if (!await CheckPermission("view_website_content")) return Forbid();

            var settings = await _context.WebsiteSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new WebsiteSetting
                {
                    CompanyNameEn = "Al-Asdiqaa Car Trading",
                    CompanyNameAr = "شركة الأصدقاء لتجارة السيارات",
                    LogoPath = null,
                    ContactPhone = "0770 123 4567",
                    WhatsAppNumber = "9647719681434",
                    Email = "info@alasdiqaacars.com",
                    AddressEn = "Baghdad, Iraq",
                    AddressAr = "بغداد، العراق",
                    WorkingHoursEn = "Sat - Thu: 9:00 AM - 9:00 PM",
                    WorkingHoursAr = "السبت - الخميس: 9:00 ص - 9:00 م",
                    DefaultMetaTitleEn = "Al-Asdiqaa Car Trading | Premium & Luxury Cars",
                    DefaultMetaTitleAr = "شركة الأصدقاء لتجارة السيارات | سيارات فاخرة ومميزة",
                    DefaultMetaDescriptionEn = "Browse Al-Asdiqaa's inventory.",
                    DefaultMetaDescriptionAr = "تصفح مجموعة الأصدقاء للسيارات المميزة."
                };
                _context.WebsiteSettings.Add(settings);
                await _context.SaveChangesAsync();
            }

            return Ok(new { success = true, data = settings });
        }

        [HttpPut("settings")]
        public async Task<IActionResult> UpdateSettings([FromBody] WebsiteSetting request)
        {
            if (!await CheckPermission("manage_website_settings")) return Forbid();

            var settings = await _context.WebsiteSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new WebsiteSetting();
                _context.WebsiteSettings.Add(settings);
            }

            settings.CompanyNameEn = request.CompanyNameEn;
            settings.CompanyNameAr = request.CompanyNameAr;
            settings.LogoPath = request.LogoPath;
            settings.ContactPhone = request.ContactPhone;
            settings.WhatsAppNumber = request.WhatsAppNumber;
            settings.Email = request.Email;
            settings.AddressEn = request.AddressEn;
            settings.AddressAr = request.AddressAr;
            settings.WorkingHoursEn = request.WorkingHoursEn;
            settings.WorkingHoursAr = request.WorkingHoursAr;
            settings.FacebookUrl = request.FacebookUrl;
            settings.InstagramUrl = request.InstagramUrl;
            settings.TwitterUrl = request.TwitterUrl;
            settings.YoutubeUrl = request.YoutubeUrl;
            settings.DefaultMetaTitleEn = request.DefaultMetaTitleEn;
            settings.DefaultMetaTitleAr = request.DefaultMetaTitleAr;
            settings.DefaultMetaDescriptionEn = request.DefaultMetaDescriptionEn;
            settings.DefaultMetaDescriptionAr = request.DefaultMetaDescriptionAr;
            
            settings.LastModifiedAt = DateTime.UtcNow;
            settings.LastModifiedBy = _currentUserService.UserId;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, data = settings, message = "تم حفظ الإعدادات بنجاح." });
        }
        #endregion

        #region 2. Services Management
        [HttpGet("services")]
        public async Task<IActionResult> GetServices()
        {
            if (!await CheckPermission("view_website_content")) return Forbid();

            var services = await _context.WebsiteServices
                .OrderBy(s => s.DisplayOrder)
                .ToListAsync();

            return Ok(new { success = true, data = services });
        }

        [HttpPost("services")]
        public async Task<IActionResult> CreateService([FromBody] WebsiteService request)
        {
            if (!await CheckPermission("manage_website_content")) return Forbid();

            request.CreatedAt = DateTime.UtcNow;
            request.CreatedBy = _currentUserService.UserId;
            _context.WebsiteServices.Add(request);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = request, message = "تم إضافة الخدمة بنجاح." });
        }

        [HttpPut("services/{id:guid}")]
        public async Task<IActionResult> UpdateService(Guid id, [FromBody] WebsiteService request)
        {
            if (!await CheckPermission("manage_website_content")) return Forbid();

            var s = await _context.WebsiteServices.FindAsync(id);
            if (s == null) return NotFound(new { success = false, message = "الخدمة غير موجودة." });

            s.TitleEn = request.TitleEn;
            s.TitleAr = request.TitleAr;
            s.DescriptionEn = request.DescriptionEn;
            s.DescriptionAr = request.DescriptionAr;
            s.Icon = request.Icon;
            s.DisplayOrder = request.DisplayOrder;
            s.IsActive = request.IsActive;

            s.LastModifiedAt = DateTime.UtcNow;
            s.LastModifiedBy = _currentUserService.UserId;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, data = s, message = "تم تحديث الخدمة بنجاح." });
        }

        [HttpDelete("services/{id:guid}")]
        public async Task<IActionResult> DeleteService(Guid id)
        {
            if (!await CheckPermission("manage_website_content")) return Forbid();

            var s = await _context.WebsiteServices.FindAsync(id);
            if (s == null) return NotFound(new { success = false, message = "الخدمة غير موجودة." });

            _context.WebsiteServices.Remove(s);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "تم حذف الخدمة بنجاح." });
        }
        #endregion

        #region 3. Testimonials Management
        [HttpGet("testimonials")]
        public async Task<IActionResult> GetTestimonials()
        {
            if (!await CheckPermission("view_website_content")) return Forbid();

            var list = await _context.WebsiteTestimonials
                .OrderBy(t => t.DisplayOrder)
                .ToListAsync();

            return Ok(new { success = true, data = list });
        }

        [HttpPost("testimonials")]
        public async Task<IActionResult> CreateTestimonial([FromBody] WebsiteTestimonial request)
        {
            if (!await CheckPermission("manage_website_content")) return Forbid();

            request.CreatedAt = DateTime.UtcNow;
            request.CreatedBy = _currentUserService.UserId;
            _context.WebsiteTestimonials.Add(request);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = request, message = "تم إضافة رأي العميل بنجاح." });
        }

        [HttpPut("testimonials/{id:guid}")]
        public async Task<IActionResult> UpdateTestimonial(Guid id, [FromBody] WebsiteTestimonial request)
        {
            if (!await CheckPermission("manage_website_content")) return Forbid();

            var t = await _context.WebsiteTestimonials.FindAsync(id);
            if (t == null) return NotFound(new { success = false, message = "الرأي غير موجود." });

            t.CustomerName = request.CustomerName;
            t.CustomerRoleEn = request.CustomerRoleEn;
            t.CustomerRoleAr = request.CustomerRoleAr;
            t.ReviewEn = request.ReviewEn;
            t.ReviewAr = request.ReviewAr;
            t.Rating = request.Rating;
            t.CustomerImage = request.CustomerImage;
            t.DisplayOrder = request.DisplayOrder;
            t.IsActive = request.IsActive;

            t.LastModifiedAt = DateTime.UtcNow;
            t.LastModifiedBy = _currentUserService.UserId;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, data = t, message = "تم تحديث رأي العميل بنجاح." });
        }

        [HttpDelete("testimonials/{id:guid}")]
        public async Task<IActionResult> DeleteTestimonial(Guid id)
        {
            if (!await CheckPermission("manage_website_content")) return Forbid();

            var t = await _context.WebsiteTestimonials.FindAsync(id);
            if (t == null) return NotFound(new { success = false, message = "الرأي غير موجود." });

            _context.WebsiteTestimonials.Remove(t);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "تم حذف الرأي بنجاح." });
        }
        #endregion

        #region 4. Pages Management
        [HttpGet("pages")]
        public async Task<IActionResult> GetPages()
        {
            if (!await CheckPermission("view_website_content")) return Forbid();

            var pages = await _context.WebsitePages.ToListAsync();
            return Ok(new { success = true, data = pages });
        }

        [HttpGet("pages/{key}")]
        public async Task<IActionResult> GetPageByKey(string key)
        {
            if (!await CheckPermission("view_website_content")) return Forbid();

            var page = await _context.WebsitePages.FirstOrDefaultAsync(p => p.PageKey.ToLower() == key.ToLower());
            if (page == null)
            {
                page = new WebsitePage
                {
                    PageKey = key.ToLower(),
                    TitleEn = $"{key} Page",
                    TitleAr = $"صفحة {key}",
                    ContentEn = "Content goes here...",
                    ContentAr = "المحتوى هنا...",
                    IsActive = true
                };
                _context.WebsitePages.Add(page);
                await _context.SaveChangesAsync();
            }

            return Ok(new { success = true, data = page });
        }

        [HttpPut("pages/{key}")]
        public async Task<IActionResult> UpdatePageByKey(string key, [FromBody] WebsitePage request)
        {
            if (!await CheckPermission("manage_website_content")) return Forbid();

            var page = await _context.WebsitePages.FirstOrDefaultAsync(p => p.PageKey.ToLower() == key.ToLower());
            if (page == null)
            {
                page = new WebsitePage { PageKey = key.ToLower() };
                _context.WebsitePages.Add(page);
            }

            page.TitleEn = request.TitleEn;
            page.TitleAr = request.TitleAr;
            page.ContentEn = request.ContentEn;
            page.ContentAr = request.ContentAr;
            page.CoverImage = request.CoverImage;
            page.IsActive = request.IsActive;
            page.MetaTitleEn = request.MetaTitleEn;
            page.MetaTitleAr = request.MetaTitleAr;
            page.MetaDescriptionEn = request.MetaDescriptionEn;
            page.MetaDescriptionAr = request.MetaDescriptionAr;

            page.LastModifiedAt = DateTime.UtcNow;
            page.LastModifiedBy = _currentUserService.UserId;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, data = page, message = "تم تحديث الصفحة بنجاح." });
        }
        #endregion

        #region 5. News & Articles Management
        [HttpGet("news")]
        public async Task<IActionResult> GetNews([FromQuery] string? search, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int perPage = 15)
        {
            if (!await CheckPermission("view_website_content")) return Forbid();

            var query = _context.WebsiteArticles.Where(a => !a.IsDeleted);

            if (!string.IsNullOrEmpty(search))
            {
                var s = search.ToLower();
                query = query.Where(a => a.TitleEn.ToLower().Contains(s) || a.TitleAr.Contains(s));
            }

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(a => a.Status == status);
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = new
                {
                    total,
                    page,
                    per_page = perPage,
                    items
                }
            });
        }

        [HttpGet("news/{id:guid}")]
        public async Task<IActionResult> GetArticle(Guid id)
        {
            if (!await CheckPermission("view_website_content")) return Forbid();

            var article = await _context.WebsiteArticles.FindAsync(id);
            if (article == null || article.IsDeleted) return NotFound(new { success = false, message = "المقال غير موجود." });

            return Ok(new { success = true, data = article });
        }

        [HttpPost("news")]
        public async Task<IActionResult> CreateArticle([FromBody] WebsiteArticle request)
        {
            if (!await CheckPermission("manage_website_news")) return Forbid();

            if (string.IsNullOrEmpty(request.Slug))
            {
                request.Slug = Guid.NewGuid().ToString("N").Substring(0, 10);
            }

            request.Slug = request.Slug.ToLowerInvariant().Replace(" ", "-");
            if (await _context.WebsiteArticles.AnyAsync(a => a.Slug == request.Slug && !a.IsDeleted))
            {
                return BadRequest(new { success = false, message = "الرابط الفريد (Slug) مستخدم بالفعل." });
            }

            request.CreatedAt = DateTime.UtcNow;
            request.CreatedBy = _currentUserService.UserId;
            
            if (request.Status == "Published")
            {
                request.PublishedAt = DateTime.UtcNow;
                request.PublishedBy = _currentUserService.UserId;
            }

            _context.WebsiteArticles.Add(request);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = request, message = "تم إنشاء المقال بنجاح." });
        }

        [HttpPut("news/{id:guid}")]
        public async Task<IActionResult> UpdateArticle(Guid id, [FromBody] WebsiteArticle request)
        {
            if (!await CheckPermission("manage_website_news")) return Forbid();

            var article = await _context.WebsiteArticles.FindAsync(id);
            if (article == null || article.IsDeleted) return NotFound(new { success = false, message = "المقال غير موجود." });

            request.Slug = request.Slug.ToLowerInvariant().Replace(" ", "-");
            if (await _context.WebsiteArticles.AnyAsync(a => a.Slug == request.Slug && a.Id != id && !a.IsDeleted))
            {
                return BadRequest(new { success = false, message = "الرابط الفريد (Slug) مستخدم بالفعل في مقال آخر." });
            }

            article.TitleEn = request.TitleEn;
            article.TitleAr = request.TitleAr;
            article.SummaryEn = request.SummaryEn;
            article.SummaryAr = request.SummaryAr;
            article.ContentEn = request.ContentEn;
            article.ContentAr = request.ContentAr;
            article.CoverImage = request.CoverImage;
            article.Category = request.Category;
            article.Slug = request.Slug;
            article.IsFeatured = request.IsFeatured;
            
            if (article.Status != "Published" && request.Status == "Published")
            {
                article.PublishedAt = DateTime.UtcNow;
                article.PublishedBy = _currentUserService.UserId;
            }
            article.Status = request.Status;

            article.MetaTitleEn = request.MetaTitleEn;
            article.MetaTitleAr = request.MetaTitleAr;
            article.MetaDescriptionEn = request.MetaDescriptionEn;
            article.MetaDescriptionAr = request.MetaDescriptionAr;

            article.LastModifiedAt = DateTime.UtcNow;
            article.LastModifiedBy = _currentUserService.UserId;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, data = article, message = "تم تحديث المقال بنجاح." });
        }

        [HttpPatch("news/{id:guid}/publish")]
        public async Task<IActionResult> ChangeArticlePublishStatus(Guid id, [FromQuery] string status)
        {
            if (!await CheckPermission("publish_website_content")) return Forbid();

            var article = await _context.WebsiteArticles.FindAsync(id);
            if (article == null || article.IsDeleted) return NotFound(new { success = false, message = "المقال غير موجود." });

            if (status != "Draft" && status != "Published" && status != "Archived")
            {
                return BadRequest(new { success = false, message = "الحالة المدخلة غير صالحة." });
            }

            if (status == "Published" && article.Status != "Published")
            {
                article.PublishedAt = DateTime.UtcNow;
                article.PublishedBy = _currentUserService.UserId;
            }

            article.Status = status;
            article.LastModifiedAt = DateTime.UtcNow;
            article.LastModifiedBy = _currentUserService.UserId;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, data = article, message = $"تم تغيير حالة المقال إلى {status}." });
        }

        [HttpDelete("news/{id:guid}")]
        public async Task<IActionResult> DeleteArticle(Guid id)
        {
            if (!await CheckPermission("manage_website_news")) return Forbid();

            var article = await _context.WebsiteArticles.FindAsync(id);
            if (article == null || article.IsDeleted) return NotFound(new { success = false, message = "المقال غير موجود." });

            article.IsDeleted = true;
            article.DeletedAt = DateTime.UtcNow;
            article.DeletedBy = _currentUserService.UserId;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "تم حذف المقال بنجاح." });
        }
        #endregion

        #region 6. Media Library Management
        [HttpGet("media")]
        public async Task<IActionResult> GetMediaList([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int perPage = 24)
        {
            if (!await CheckPermission("view_website_content")) return Forbid();

            var query = _context.WebsiteMedias.AsQueryable();
            if (!string.IsNullOrEmpty(search))
            {
                var s = search.ToLower();
                query = query.Where(m => m.FileName.ToLower().Contains(s) || (m.AltTextEn != null && m.AltTextEn.ToLower().Contains(s)) || (m.AltTextAr != null && m.AltTextAr.Contains(s)));
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(m => m.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = new
                {
                    total,
                    page,
                    per_page = perPage,
                    items
                }
            });
        }

        [HttpPost("media/upload")]
        public async Task<IActionResult> UploadMediaFile(IFormFile file, [FromForm] string? altEn, [FromForm] string? altAr)
        {
            if (!await CheckPermission("manage_website_media")) return Forbid();

            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "لا يوجد ملف مرفق." });

            const long MaxFileBytes = 5 * 1024 * 1024; // 5 MB
            if (file.Length > MaxFileBytes)
                return BadRequest(new { success = false, message = "حجم الملف يتجاوز الحد الأقصى (5 ميجابايت)." });

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(ext))
                return BadRequest(new { success = false, message = "امتداد الملف غير مسموح به. الامتدادات المدعومة: JPG, PNG, WEBP, GIF" });

            var storagePath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "website");
            if (!Directory.Exists(storagePath))
            {
                Directory.CreateDirectory(storagePath);
            }

            var secureFileName = $"{Guid.NewGuid().ToString("N")}{ext}";
            var fullFilePath = Path.Combine(storagePath, secureFileName);

            using (var stream = new FileStream(fullFilePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var media = new WebsiteMedia
            {
                Id = Guid.NewGuid(),
                FileName = file.FileName,
                FilePath = secureFileName,
                AltTextEn = altEn,
                AltTextAr = altAr,
                FileSize = file.Length,
                MimeType = file.ContentType,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = _currentUserService.UserId
            };

            _context.WebsiteMedias.Add(media);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = media, message = "تم رفع وحفظ الملف بنجاح." });
        }

        [HttpDelete("media/{id:guid}")]
        public async Task<IActionResult> DeleteMediaFile(Guid id)
        {
            if (!await CheckPermission("manage_website_media")) return Forbid();

            var media = await _context.WebsiteMedias.FindAsync(id);
            if (media == null) return NotFound(new { success = false, message = "الملف غير موجود." });

            var storagePath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "website");
            var fullFilePath = Path.Combine(storagePath, media.FilePath);

            try
            {
                if (System.IO.File.Exists(fullFilePath))
                {
                    System.IO.File.Delete(fullFilePath);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting physical file: {ex.Message}");
            }

            _context.WebsiteMedias.Remove(media);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "تم حذف الملف بنجاح." });
        }
        #endregion
    }
}
