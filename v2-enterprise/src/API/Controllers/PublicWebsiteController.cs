using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.API.Controllers
{
    [AllowAnonymous]
    [Route("api/public/website")]
    public sealed class PublicWebsiteController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;

        public PublicWebsiteController(IApplicationDbContext context)
        {
            _context = context;
        }

        // GET: /api/public/website/settings
        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var settings = await _context.WebsiteSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                // Return default/seed settings
                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        companyNameEn = "Al-Asdiqaa Car Trading",
                        companyNameAr = "شركة الأصدقاء لتجارة السيارات",
                        logoPath = (string?)null,
                        contactPhone = "0770 123 4567",
                        whatsAppNumber = "9647719681434",
                        email = "info@alasdiqaacars.com",
                        addressEn = "Baghdad, Iraq",
                        addressAr = "بغداد، العراق",
                        workingHoursEn = "Sat - Thu: 9:00 AM - 9:00 PM",
                        workingHoursAr = "السبت - الخميس: 9:00 ص - 9:00 م",
                        facebookUrl = "https://facebook.com",
                        instagramUrl = "https://instagram.com",
                        twitterUrl = "https://twitter.com",
                        youtubeUrl = "https://youtube.com",
                        defaultMetaTitleEn = "Al-Asdiqaa Car Trading | Premium & Luxury Cars in Baghdad",
                        defaultMetaTitleAr = "شركة الأصدقاء لتجارة السيارات | سيارات فاخرة ومميزة في بغداد",
                        defaultMetaDescriptionEn = "Browse Al-Asdiqaa's full inventory of premium and luxury vehicles.",
                        defaultMetaDescriptionAr = "تصفح مجموعة الأصدقاء الكاملة من السيارات الفاخرة والمميزة في معرضنا في بغداد."
                    }
                });
            }

            return Ok(new { success = true, data = settings });
        }

        // GET: /api/public/website/news
        [HttpGet("news")]
        public async Task<IActionResult> GetNews([FromQuery] int page = 1, [FromQuery] int perPage = 10)
        {
            if (page < 1) page = 1;
            if (perPage < 1 || perPage > 50) perPage = 10;

            var query = _context.WebsiteArticles
                .Where(a => a.Status == "Published" && !a.IsDeleted)
                .OrderByDescending(a => a.PublishedAt ?? a.CreatedAt);

            var total = await query.CountAsync();
            var items = await query
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

        // GET: /api/public/website/news/{slug}
        [HttpGet("news/{slug}")]
        public async Task<IActionResult> GetArticleBySlug(string slug)
        {
            var article = await _context.WebsiteArticles
                .FirstOrDefaultAsync(a => a.Slug == slug && a.Status == "Published" && !a.IsDeleted);

            if (article == null)
            {
                return NotFound(new { success = false, message = "المقال غير موجود أو غير منشور." });
            }

            return Ok(new { success = true, data = article });
        }

        // GET: /api/public/website/services
        [HttpGet("services")]
        public async Task<IActionResult> GetServices()
        {
            var services = await _context.WebsiteServices
                .Where(s => s.IsActive)
                .OrderBy(s => s.DisplayOrder)
                .ToListAsync();

            return Ok(new { success = true, data = services });
        }

        // GET: /api/public/website/testimonials
        [HttpGet("testimonials")]
        public async Task<IActionResult> GetTestimonials()
        {
            var testimonials = await _context.WebsiteTestimonials
                .Where(t => t.IsActive)
                .OrderBy(t => t.DisplayOrder)
                .ToListAsync();

            return Ok(new { success = true, data = testimonials });
        }

        // GET: /api/public/website/pages/{key}
        [HttpGet("pages/{key}")]
        public async Task<IActionResult> GetPageByKey(string key)
        {
            var page = await _context.WebsitePages
                .FirstOrDefaultAsync(p => p.PageKey.ToLower() == key.ToLower() && p.IsActive);

            if (page == null)
            {
                return NotFound(new { success = false, message = "الصفحة غير متوفرة حالياً." });
            }

            return Ok(new { success = true, data = page });
        }
    }
}
