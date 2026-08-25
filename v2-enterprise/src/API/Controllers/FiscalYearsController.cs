using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Accounting.Commands;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize(Roles = "Owner,Admin,Accountant")]
    public class FiscalYearsController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public FiscalYearsController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var branchId = _currentUserService.BranchId;
            var list = await _context.FiscalYears
                .IgnoreQueryFilters()
                .Where(f => f.BranchId == branchId)
                .OrderByDescending(f => f.Year)
                .Select(f => new
                {
                    id = f.Id,
                    year = f.Year,
                    start_date = f.StartDate,
                    end_date = f.EndDate,
                    status = f.Status,
                    closing_journal_entry_id = f.ClosingJournalEntryId,
                    notes = f.Notes,
                    created_at = f.CreatedAt
                })
                .ToListAsync();
            return Ok(new { success = true, data = list });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateFiscalYearCommand command)
        {
            var id = await Mediator.Send(command);
            return Ok(new { success = true, id, message = $"تم إنشاء السنة المالية {command.Year} بنجاح." });
        }

        [HttpPost("{id}/close")]
        public async Task<IActionResult> Close(Guid id)
        {
            try
            {
                var closingEntryId = await Mediator.Send(new CloseFiscalYearCommand { FiscalYearId = id });
                return Ok(new { success = true, closing_entry_id = closingEntryId, message = "تم إقفال السنة المالية وتوليد قيد الإقفال بنجاح." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
    }
}
