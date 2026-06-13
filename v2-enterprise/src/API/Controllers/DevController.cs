using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using CarShowroomManagementV2.Infrastructure.Persistence;

namespace CarShowroomManagementV2.API.Controllers
{
    /// <summary>
    /// Development/demo utilities. Blocked in Production via environment check.
    /// All endpoints require authentication so they cannot be hit by anonymous callers.
    /// </summary>
    [Authorize]
    [Route("api/dev")]
    public class DevController : ApiControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;

        public DevController(ApplicationDbContext context, IConfiguration config)
        {
            _context = context;
            _config  = config;
        }

        /// <summary>
        /// POST /api/dev/reset-demo
        /// Clears all seeded demo business records and re-inserts them fresh.
        /// Blocked in Production. Requires ASPNETCORE_ENVIRONMENT=Development or DEMO_SEED=true.
        /// </summary>
        [HttpPost("reset-demo")]
        public async Task<IActionResult> ResetDemo()
        {
            if (!DemoDataSeeder.ShouldSeed(_config))
                return StatusCode(403, new
                {
                    error = "This endpoint is only available in Development or when DEMO_SEED=true.",
                    hint  = "Set ASPNETCORE_ENVIRONMENT=Development or DEMO_SEED=true to enable."
                });

            await DemoDataSeeder.ResetAsync(_context);

            return Ok(new
            {
                success = true,
                message = "Demo data reset complete.",
                seeded = new
                {
                    vehicles         = 5,
                    customers        = 2,
                    suppliers        = 1,
                    purchases        = 3,
                    sales_contracts  = 2,
                    installment_plan = 1,
                    installments     = 12,
                    journal_entries  = 2,
                }
            });
        }

        /// <summary>
        /// GET /api/dev/demo-status
        /// Returns whether demo data is present and seeding is enabled.
        /// </summary>
        [HttpGet("demo-status")]
        public async Task<IActionResult> DemoStatus()
        {
            if (!DemoDataSeeder.ShouldSeed(_config))
                return Ok(new { seeding_enabled = false, demo_data_present = false });

            var present = await _context.Vehicles.IgnoreQueryFilters()
                .AnyAsync(v => v.Id == System.Guid.Parse(DemoDataSeeder.V1));

            return Ok(new
            {
                seeding_enabled  = true,
                demo_data_present = present,
                hint = present
                    ? "POST /api/dev/reset-demo to clear and re-seed."
                    : "Demo data not seeded yet. Restart the API to auto-seed in Development."
            });
        }
    }
}
