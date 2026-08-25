using System;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Accounting.Commands;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    public class ExpensesController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;

        public ExpensesController(IApplicationDbContext context)
        {
            _context = context;
        }

        // 1. تسجيل مصروف جديد
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateExpenseCommand command)
        {
            var id = await Mediator.Send(command);
            return Ok(new { success = true, expenseId = id, message = "تم تسجيل المصروف بنجاح." });
        }

        // 2. قائمة المصروفات مع تصفية بالتاريخ
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? start_date = null,
            [FromQuery] string? end_date = null)
        {
            var query = _context.Expenses.AsQueryable();

            if (TryParseDate(start_date, out var from))
                query = query.Where(e => e.ExpenseDate >= from);
            if (TryParseDate(end_date, out var to))
                query = query.Where(e => e.ExpenseDate <= to.AddDays(1).AddTicks(-1));

            var list = await query
                .OrderByDescending(e => e.ExpenseDate)
                .Select(e => new
                {
                    id = e.Id,
                    title = e.Title,
                    amount = e.Amount,
                    amount_iqd = e.Amount,
                    currency = e.Currency,
                    category = e.Category,
                    notes = e.Notes,
                    expense_date = e.ExpenseDate,
                    created_at = e.CreatedAt,
                    branch_id = e.BranchId,
                })
                .ToListAsync();

            var total = list.Sum(x => x.amount);

            return Ok(new
            {
                success = true,
                data = new
                {
                    filters = new { start_date = start_date ?? "", end_date = end_date ?? "", branch_id = (string?)null },
                    branches = Array.Empty<object>(),
                    total,
                    total_iqd = total,
                    items = list,
                }
            });
        }

        private static bool TryParseDate(string? value, out DateTime result)
        {
            result = default;
            if (string.IsNullOrWhiteSpace(value)) return false;
            if (DateTime.TryParse(value, CultureInfo.InvariantCulture,
                    DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var parsed))
            {
                result = parsed;
                return true;
            }
            return false;
        }
    }
}
