using System;
using System.Linq;
using System.Threading.Tasks;
using System.Threading;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    [Route("api/ai")]
    public class AiController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        private readonly ILogger<AiController> _logger;

        public AiController(
            IApplicationDbContext context, 
            ICurrentUserService currentUserService,
            ILogger<AiController> logger)
        {
            _context = context;
            _currentUserService = currentUserService;
            _logger = logger;
        }

        /// <summary>
        /// GET /api/ai/dashboard
        /// Returns general business aggregations for the user's branch context.
        /// </summary>
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard(CancellationToken cancellationToken)
        {
            _logger.LogInformation("AI Assistant: Fetching dashboard stats for User={UserId}, Branch={BranchId}", 
                _currentUserService.UserId, _currentUserService.BranchId);

            try
            {
                var vehiclesStats = await _context.Vehicles
                    .GroupBy(v => 1)
                    .Select(g => new
                    {
                        Available = g.Count(v => v.Status == "Available"),
                        Sold = g.Count(v => v.Status == "Sold"),
                        Reserved = g.Count(v => v.Status == "Reserved")
                    })
                    .FirstOrDefaultAsync(cancellationToken);

                var totalRevenue = await _context.SalesContracts.SumAsync(sc => (decimal?)sc.SalePrice, cancellationToken) ?? 0m;
                
                var now = DateTime.UtcNow;
                var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                var monthlySales = await _context.SalesContracts
                    .Where(sc => sc.SaleDate >= monthStart)
                    .SumAsync(sc => (decimal?)sc.SalePrice, cancellationToken) ?? 0m;

                var overdueStats = await _context.Installments
                    .Where(i => i.Status != "Paid" && (i.Status == "Overdue" || i.DueDate < now.Date))
                    .GroupBy(i => 1)
                    .Select(g => new
                    {
                        Count = g.Count(),
                        Amount = g.Sum(i => (decimal?)(i.Amount - i.PaidAmount)) ?? 0m
                    })
                    .FirstOrDefaultAsync(cancellationToken);

                return Ok(new
                {
                    available_cars = vehiclesStats?.Available ?? 0,
                    sold_cars = vehiclesStats?.Sold ?? 0,
                    reserved_cars = vehiclesStats?.Reserved ?? 0,
                    total_revenue = totalRevenue,
                    monthly_sales = monthlySales,
                    overdue_installments_count = overdueStats?.Count ?? 0,
                    overdue_installments_amount = overdueStats?.Amount ?? 0m
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI Assistant error: Failed to retrieve dashboard metrics");
                return StatusCode(500, "Internal server error retrieving metrics");
            }
        }

        /// <summary>
        /// GET /api/ai/inventory/search?query=...
        /// Secure available inventory search returning safe vehicle details (Max 50 rows).
        /// </summary>
        [HttpGet("inventory/search")]
        public async Task<IActionResult> SearchInventory([FromQuery] string? query, CancellationToken cancellationToken)
        {
            _logger.LogInformation("AI Assistant: Searching inventory with query='{Query}' for User={UserId}", 
                query, _currentUserService.UserId);

            try
            {
                var dbQuery = _context.Vehicles.Where(v => v.Status == "Available");

                if (!string.IsNullOrWhiteSpace(query))
                {
                    var s = query.Trim().ToLower();
                    if (s.Length > 100) s = s[..100]; // Input validation: sanitize query length

                    dbQuery = dbQuery.Where(v =>
                        v.Brand!.ToLower().Contains(s) ||
                        v.Model!.ToLower().Contains(s) ||
                        (v.Trim != null && v.Trim.ToLower().Contains(s)) ||
                        v.Color!.ToLower().Contains(s));
                }

                var results = await dbQuery
                    .OrderByDescending(v => v.CreatedAt)
                    .Take(50)
                    .Select(v => new
                    {
                        id = v.Id,
                        brand = v.Brand,
                        model = v.Model,
                        year = v.Year,
                        trim = v.Trim,
                        color = v.Color,
                        selling_price = v.TargetSellingPrice,
                        currency = v.Currency,
                        status = v.Status,
                        mileage = v.Mileage,
                        transmission = v.Transmission,
                        fuel_type = v.FuelType
                    })
                    .ToListAsync(cancellationToken);

                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI Assistant error: Inventory search failed");
                return StatusCode(500, "Error performing search query");
            }
        }

        /// <summary>
        /// GET /api/ai/inventory/summary
        /// Returns aggregate counts of all inventory status.
        /// </summary>
        [HttpGet("inventory/summary")]
        public async Task<IActionResult> GetInventorySummary(CancellationToken cancellationToken)
        {
            _logger.LogInformation("AI Assistant: Fetching inventory summary for User={UserId}", _currentUserService.UserId);

            try
            {
                var summary = await _context.Vehicles
                    .GroupBy(v => v.Status)
                    .Select(g => new { Status = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.Status, x => x.Count, cancellationToken);

                return Ok(new
                {
                    available = summary.GetValueOrDefault("Available", 0),
                    sold = summary.GetValueOrDefault("Sold", 0),
                    reserved = summary.GetValueOrDefault("Reserved", 0),
                    total = summary.Values.Sum()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI Assistant error: Failed to get inventory summary");
                return StatusCode(500, "Error generating inventory summary");
            }
        }

        /// <summary>
        /// GET /api/ai/sales/summary
        /// Aggregate statistics of sales operations.
        /// </summary>
        [HttpGet("sales/summary")]
        public async Task<IActionResult> GetSalesSummary(CancellationToken cancellationToken)
        {
            _logger.LogInformation("AI Assistant: Fetching sales summary for User={UserId}", _currentUserService.UserId);

            try
            {
                var sales = await _context.SalesContracts
                    .GroupBy(sc => 1)
                    .Select(g => new
                    {
                        Count = g.Count(),
                        Revenue = g.Sum(sc => (decimal?)sc.SalePrice) ?? 0m,
                        Active = g.Count(sc => sc.Status == "Active"),
                        Cancelled = g.Count(sc => sc.Status == "Cancelled")
                    })
                    .FirstOrDefaultAsync(cancellationToken);

                var topBrands = await _context.SalesContracts
                    .Where(sc => sc.Vehicle != null)
                    .GroupBy(sc => sc.Vehicle!.Brand)
                    .OrderByDescending(g => g.Count())
                    .Take(5)
                    .Select(g => new { Brand = g.Key, Count = g.Count() })
                    .ToListAsync(cancellationToken);

                return Ok(new
                {
                    total_sales_count = sales?.Count ?? 0,
                    total_revenue = sales?.Revenue ?? 0m,
                    active_sales = sales?.Active ?? 0,
                    cancelled_sales = sales?.Cancelled ?? 0,
                    top_selling_brands = topBrands
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI Assistant error: Failed to get sales summary");
                return StatusCode(500, "Error generating sales summary");
            }
        }

        /// <summary>
        /// GET /api/ai/profitability
        /// Returns aggregate-only net profit data for the branch. 
        /// RESTRICTED TO: Owner, Admin, and Accountant roles.
        /// </summary>
        [Authorize(Roles = "Owner,Admin,Accountant")]
        [HttpGet("profitability")]
        public async Task<IActionResult> GetProfitability(CancellationToken cancellationToken)
        {
            _logger.LogInformation("AI Assistant: Accessing profitability report. User={UserId}, Roles=Owner/Admin/Accountant", 
                _currentUserService.UserId);

            try
            {
                var report = await _context.SalesContracts
                    .Where(sc => sc.Status == "Active" && sc.Vehicle != null)
                    .Select(sc => new
                    {
                        SalePrice = sc.SalePrice,
                        BookValue = sc.Vehicle!.BookValue
                    })
                    .GroupBy(_ => 1)
                    .Select(g => new
                    {
                        TotalRevenue = g.Sum(x => x.SalePrice),
                        TotalCost = g.Sum(x => x.BookValue),
                        Count = g.Count()
                    })
                    .FirstOrDefaultAsync(cancellationToken);

                decimal totalRevenue = report?.TotalRevenue ?? 0m;
                decimal totalCost = report?.TotalCost ?? 0m;
                decimal netProfit = totalRevenue - totalCost;
                decimal marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100m : 0m;

                return Ok(new
                {
                    sold_vehicles_count = report?.Count ?? 0,
                    total_revenue = totalRevenue,
                    total_cost = totalCost,
                    net_profit = netProfit,
                    margin_percentage = marginPercent
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI Assistant error: Profitability calculation failed");
                return StatusCode(500, "Error calculating profitability stats");
            }
        }

        /// <summary>
        /// GET /api/ai/installments/overdue
        /// Returns aggregate stats of overdue installments.
        /// </summary>
        [HttpGet("installments/overdue")]
        public async Task<IActionResult> GetOverdueInstallments(CancellationToken cancellationToken)
        {
            _logger.LogInformation("AI Assistant: Fetching overdue installments for User={UserId}", _currentUserService.UserId);

            try
            {
                var now = DateTime.UtcNow.Date;

                var overdue = await _context.Installments
                    .Where(i => i.Status != "Paid" && (i.Status == "Overdue" || i.DueDate < now))
                    .GroupBy(_ => 1)
                    .Select(g => new
                    {
                        Count = g.Count(),
                        Amount = g.Sum(i => (decimal?)(i.Amount - i.PaidAmount)) ?? 0m,
                        UniqueCustomers = g.Select(i => i.InstallmentPlan!.SalesContract!.CustomerId).Distinct().Count()
                    })
                    .FirstOrDefaultAsync(cancellationToken);

                return Ok(new
                {
                    overdue_count = overdue?.Count ?? 0,
                    total_overdue_amount = overdue?.Amount ?? 0m,
                    defaulting_customers_count = overdue?.UniqueCustomers ?? 0
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI Assistant error: Failed to get overdue stats");
                return StatusCode(500, "Error retrieving overdue installment stats");
            }
        }

        /// <summary>
        /// GET /api/ai/customer/search?query=...
        /// Secure search for customers returning minimal non-sensitive data.
        /// </summary>
        [HttpGet("customer/search")]
        public async Task<IActionResult> SearchCustomer([FromQuery] string? query, CancellationToken cancellationToken)
        {
            _logger.LogInformation("AI Assistant: Searching customer records with query='{Query}' for User={UserId}", 
                query, _currentUserService.UserId);

            if (string.IsNullOrWhiteSpace(query))
            {
                return Ok(Array.Empty<object>());
            }

            try
            {
                var s = query.Trim().ToLower();
                if (s.Length > 100) s = s[..100]; // Input validation: sanitize query length

                var results = await _context.Customers
                    .Where(c => c.Name.ToLower().Contains(s) || c.Phone.Contains(s))
                    .Take(50)
                    .Select(c => new
                    {
                        id = c.Id,
                        name = c.Name,
                        phone = c.Phone,
                        customer_type = c.CustomerType
                    })
                    .ToListAsync(cancellationToken);

                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI Assistant error: Customer lookup failed");
                return StatusCode(500, "Error performing customer search");
            }
        }

        public class LogAiRequest
        {
            public string Prompt { get; set; } = string.Empty;
            public string? ToolName { get; set; }
            public long ExecutionTimeMs { get; set; }
            public string Status { get; set; } = string.Empty;
        }

        /// <summary>
        /// POST /api/ai/log
        /// Records AI system operations to the central audit log table.
        /// </summary>
        [HttpPost("log")]
        public async Task<IActionResult> LogAiCall([FromBody] LogAiRequest request, CancellationToken cancellationToken)
        {
            if (request == null) return BadRequest("Missing payload");

            try
            {
                var logInfo = new
                {
                    prompt = request.Prompt.Length > 200 ? request.Prompt[..200] + "..." : request.Prompt,
                    tool_name = request.ToolName,
                    execution_time_ms = request.ExecutionTimeMs,
                    status = request.Status
                };

                var auditLog = new AuditLog
                {
                    UserId = _currentUserService.UserId ?? "System_AI",
                    BranchId = _currentUserService.BranchId,
                    Action = "AI_Query",
                    TableName = "AI_Assistant",
                    PrimaryKey = request.ToolName ?? "DirectChat",
                    NewValues = JsonSerializer.Serialize(logInfo),
                    Timestamp = DateTime.UtcNow
                };

                _context.AuditLogs.Add(auditLog);
                await _context.SaveChangesAsync(cancellationToken);

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI Assistant error: Failed to record audit log");
                return StatusCode(500, "Logging error occurred");
            }
        }
    }
}
