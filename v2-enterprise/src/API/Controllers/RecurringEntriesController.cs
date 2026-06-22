using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Common.Helpers;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize(Roles = "Owner,Admin,Accountant")]
    public class RecurringEntriesController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public RecurringEntriesController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var branchId = _currentUserService.BranchId;
            var list = await _context.RecurringJournalTemplates
                .Include(t => t.Lines)
                .IgnoreQueryFilters()
                .Where(t => t.BranchId == branchId)
                .OrderBy(t => t.Name)
                .Select(t => new
                {
                    id = t.Id,
                    name = t.Name,
                    description = t.Description,
                    frequency = t.Frequency,
                    day_of_month = t.DayOfMonth,
                    is_active = t.IsActive,
                    last_run_at = t.LastRunAt,
                    created_at = t.CreatedAt,
                    lines = t.Lines.OrderBy(l => l.SortOrder).Select(l => new
                    {
                        id = l.Id,
                        account_code = l.AccountCode,
                        account_name = l.AccountName,
                        is_debit = l.IsDebit,
                        amount = l.Amount,
                        description = l.Description
                    })
                })
                .ToListAsync();
            return Ok(new { success = true, data = list });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateRecurringEntryRequest request)
        {
            var branchId = _currentUserService.BranchId;
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { success = false, message = "اسم القالب مطلوب." });
            if (request.Lines == null || request.Lines.Length < 2)
                return BadRequest(new { success = false, message = "يجب أن يحتوي القالب على سطرين على الأقل." });

            var debitSum = request.Lines.Where(l => l.IsDebit).Sum(l => l.Amount);
            var creditSum = request.Lines.Where(l => !l.IsDebit).Sum(l => l.Amount);
            if (Math.Round(Math.Abs(debitSum - creditSum), 4) > 0.0001m)
                return BadRequest(new { success = false, message = $"السطور غير متوازنة. المدين: {debitSum:N2}، الدائن: {creditSum:N2}." });

            var template = new RecurringJournalTemplate
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                Description = request.Description ?? string.Empty,
                Frequency = request.Frequency ?? "Monthly",
                DayOfMonth = request.DayOfMonth ?? 1,
                IsActive = true,
                BranchId = branchId
            };

            int order = 0;
            foreach (var line in request.Lines)
            {
                template.Lines.Add(new RecurringTemplateLine
                {
                    Id = Guid.NewGuid(),
                    TemplateId = template.Id,
                    AccountCode = line.AccountCode ?? string.Empty,
                    AccountName = line.AccountName ?? string.Empty,
                    IsDebit = line.IsDebit,
                    Amount = AccountingAmount.RoundMoney(line.Amount),
                    Description = line.Description,
                    SortOrder = order++
                });
            }

            _context.RecurringJournalTemplates.Add(template);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, id = template.Id, message = "تم إنشاء القالب بنجاح." });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] CreateRecurringEntryRequest request)
        {
            var branchId = _currentUserService.BranchId;
            var template = await _context.RecurringJournalTemplates
                .Include(t => t.Lines)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == id && t.BranchId == branchId);
            if (template == null) return NotFound(new { success = false, message = "القالب غير موجود." });

            template.Name = request.Name?.Trim() ?? template.Name;
            template.Description = request.Description ?? template.Description;
            template.Frequency = request.Frequency ?? template.Frequency;
            template.DayOfMonth = request.DayOfMonth ?? template.DayOfMonth;
            template.IsActive = request.IsActive ?? template.IsActive;
            template.LastModifiedAt = DateTime.UtcNow;

            if (request.Lines != null && request.Lines.Length >= 2)
            {
                _context.RecurringTemplateLines.RemoveRange(template.Lines);
                template.Lines.Clear();
                int order = 0;
                foreach (var line in request.Lines)
                {
                    template.Lines.Add(new RecurringTemplateLine
                    {
                        Id = Guid.NewGuid(),
                        TemplateId = template.Id,
                        AccountCode = line.AccountCode ?? string.Empty,
                        AccountName = line.AccountName ?? string.Empty,
                        IsDebit = line.IsDebit,
                        Amount = AccountingAmount.RoundMoney(line.Amount),
                        Description = line.Description,
                        SortOrder = order++
                    });
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "تم تحديث القالب." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var branchId = _currentUserService.BranchId;
            var template = await _context.RecurringJournalTemplates
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == id && t.BranchId == branchId);
            if (template == null) return NotFound();
            _context.RecurringJournalTemplates.Remove(template);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "تم حذف القالب." });
        }

        [HttpPost("{id}/execute")]
        public async Task<IActionResult> Execute(Guid id)
        {
            var branchId = _currentUserService.BranchId;
            var template = await _context.RecurringJournalTemplates
                .Include(t => t.Lines)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == id && t.BranchId == branchId);

            if (template == null) return NotFound(new { success = false, message = "القالب غير موجود." });
            if (!template.IsActive) return BadRequest(new { success = false, message = "القالب غير نشط." });
            if (!template.Lines.Any()) return BadRequest(new { success = false, message = "القالب لا يحتوي سطوراً." });

            // التحقق من وجود الحسابات
            var accountCodes = template.Lines.Select(l => l.AccountCode).Distinct().ToList();
            var accounts = await _context.Accounts
                .IgnoreQueryFilters()
                .Where(a => a.BranchId == branchId && accountCodes.Contains(a.AccountCode))
                .ToListAsync();

            var missingCodes = accountCodes.Where(c => accounts.All(a => a.AccountCode != c)).ToList();
            if (missingCodes.Any())
                return BadRequest(new { success = false, message = $"الحسابات التالية غير موجودة: {string.Join(", ", missingCodes)}" });

            var totalCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync();
            var entryNumber = $"REC-{DateTime.UtcNow:yyyyMMdd}-{totalCount + 1:D5}";

            var journalEntry = new JournalEntry
            {
                Id = Guid.NewGuid(),
                EntryNumber = entryNumber,
                EntryDate = DateTime.UtcNow,
                Description = $"قيد دوري: {template.Name} - {template.Description}",
                IsPosted = true,
                BranchId = branchId,
                ReferenceType = "Recurring",
                ReferenceId = template.Id,
                CreatedBy = _currentUserService.UserId
            };

            foreach (var line in template.Lines.OrderBy(l => l.SortOrder))
            {
                var account = accounts.First(a => a.AccountCode == line.AccountCode);
                journalEntry.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = account.Id,
                    Debit = line.IsDebit ? line.Amount : 0,
                    Credit = line.IsDebit ? 0 : line.Amount,
                    Description = line.Description ?? template.Description
                });
            }

            if (!journalEntry.IsBalanced)
                return BadRequest(new { success = false, message = "القيد غير متوازن." });

            _context.JournalEntries.Add(journalEntry);
            template.LastRunAt = DateTime.UtcNow;
            template.LastModifiedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                journal_entry_id = journalEntry.Id,
                entry_number = entryNumber,
                message = $"تم تنفيذ القيد الدوري بنجاح. رقم القيد: {entryNumber}"
            });
        }
    }

    public record RecurringLineRequest(
        string? AccountCode,
        string? AccountName,
        bool IsDebit,
        decimal Amount,
        string? Description
    );

    public record CreateRecurringEntryRequest(
        string? Name,
        string? Description,
        string? Frequency,
        int? DayOfMonth,
        bool? IsActive,
        RecurringLineRequest[]? Lines
    );
}
