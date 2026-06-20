using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize(Roles = "Owner,Admin,Accountant")]
    [Route("api/cashbox-closes")]
    public class CashboxClosesController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CashboxClosesController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // GET /api/cashbox-closes/current-balance?account_code=111001
        [HttpGet("current-balance")]
        public async Task<IActionResult> GetCurrentBalance([FromQuery] string account_code = "111001")
        {
            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.AccountCode == account_code);

            if (account == null)
                return NotFound(new { error = "الحساب غير موجود" });

            // حساب الرصيد الحالي من حركات القيود المحاسبية
            var debits = await _context.JournalLines
                .Where(jl => jl.AccountId == account.Id)
                .SumAsync(jl => jl.Debit);

            var credits = await _context.JournalLines
                .Where(jl => jl.AccountId == account.Id)
                .SumAsync(jl => jl.Credit);

            var balance = debits - credits;

            return Ok(new
            {
                account_code = account.AccountCode,
                account_name = account.Name,
                balance
            });
        }

        // GET /api/cashbox-closes?account_code=111001
        [HttpGet]
        public async Task<IActionResult> GetCashboxCloses([FromQuery] string? account_code = null)
        {
            var query = _context.CashboxCloses
                .OrderByDescending(c => c.CloseDate)
                .ThenByDescending(c => c.CreatedAt)
                .AsQueryable();

            if (!string.IsNullOrEmpty(account_code))
                query = query.Where(c => c.AccountCode == account_code);

            var closes = await query
                .Select(c => new
                {
                    id = c.Id,
                    close_date = c.CloseDate,
                    account_code = c.AccountCode,
                    account_name = c.AccountName,
                    system_balance = c.SystemBalance,
                    actual_balance = c.ActualBalance,
                    difference = c.Difference,
                    note = c.Note,
                    closed_by = c.ClosedBy,
                    created_at = c.CreatedAt
                })
                .ToListAsync();

            return Ok(closes);
        }

        // POST /api/cashbox-closes
        [HttpPost]
        public async Task<IActionResult> CreateCashboxClose([FromBody] CreateCashboxCloseDto dto)
        {
            if (dto == null)
                return BadRequest(new { success = false, message = "البيانات غير صالحة" });

            var accountCode = string.IsNullOrWhiteSpace(dto.account_code) ? "111001" : dto.account_code.Trim();

            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.AccountCode == accountCode);

            if (account == null)
                return NotFound(new { error = "الحساب غير موجود" });

            // حساب الرصيد الدفتري الحالي
            var debits = await _context.JournalLines
                .Where(jl => jl.AccountId == account.Id)
                .SumAsync(jl => jl.Debit);

            var credits = await _context.JournalLines
                .Where(jl => jl.AccountId == account.Id)
                .SumAsync(jl => jl.Credit);

            var systemBalance = debits - credits;
            var actualBalance = dto.actual_balance;
            var difference = actualBalance - systemBalance;

            var close = new CashboxClose
            {
                CloseDate = DateTime.UtcNow.Date,
                BranchId = _currentUserService.BranchId,
                AccountCode = account.AccountCode,
                AccountName = account.Name,
                SystemBalance = systemBalance,
                ActualBalance = actualBalance,
                Difference = difference,
                Note = dto.note,
                ClosedBy = _currentUserService.UserId,
                CreatedAt = DateTime.UtcNow
            };

            _context.CashboxCloses.Add(close);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = close.Id,
                close_date = close.CloseDate,
                account_code = close.AccountCode,
                account_name = close.AccountName,
                system_balance = close.SystemBalance,
                actual_balance = close.ActualBalance,
                difference = close.Difference,
                note = close.Note,
                closed_by = close.ClosedBy,
                created_at = close.CreatedAt
            });
        }
    }

    public class CreateCashboxCloseDto
    {
        public string? account_code { get; set; }
        public decimal actual_balance { get; set; }
        public string? note { get; set; }
    }
}
