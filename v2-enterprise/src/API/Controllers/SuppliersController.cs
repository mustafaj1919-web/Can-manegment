using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Suppliers.Commands;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize(Roles = "Owner,Admin,Accountant")]
    public class SuppliersController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public SuppliersController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // 1. قائمة الموردين مع البحث والترقيم
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 25,
            [FromQuery] string? search = null)
        {
            if (page < 1) page = 1;
            if (per_page < 1 || per_page > 100) per_page = 25;

            var query = _context.Suppliers
                .Include(s => s.Account)
                .Where(s => s.IsActive)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(sup =>
                    sup.Name.Contains(s) ||
                    sup.Code.Contains(s) ||
                    sup.Phone.Contains(s));
            }

            var total = await query.CountAsync();
            var data = await query
                .OrderBy(s => s.Name)
                .Skip((page - 1) * per_page)
                .Take(per_page)
                .Select(s => new
                {
                    id = s.Id,
                    name = s.Name,
                    code = s.Code,
                    phone = s.Phone,
                    address = s.Address,
                    notes = s.Notes,
                    account_id = s.AccountId,
                    account_code = s.Account != null ? s.Account.AccountCode : string.Empty,
                    branch_id = s.BranchId,
                    is_active = s.IsActive
                })
                .ToListAsync();

            return Ok(new { success = true, total, page, per_page, data });
        }

        // 2. تسجيل مورد جديد
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSupplierCommand command)
        {
            var id = await Mediator.Send(command);
            return Ok(new { success = true, supplierId = id, message = "تم تسجيل المورد وإنشاء حسابه المالي بنجاح." });
        }

        // 3. تفاصيل مورد واحد
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (id == Guid.Empty)
                return BadRequest(new { success = false, message = "معرف المورد غير صالح." });

            var branchId = _currentUserService.BranchId;
            var s = await _context.Suppliers
                .Include(x => x.Account)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => x.Id == id && x.BranchId == branchId);

            if (s == null)
                return NotFound(new { success = false, message = "المورد غير موجود." });

            var purchasesCount = await _context.Purchases
                .CountAsync(p => p.SupplierId == id);

            var totalPurchased = await _context.Purchases
                .Where(p => p.SupplierId == id)
                .SumAsync(p => (decimal?)p.PurchaseCost) ?? 0;

            return Ok(new
            {
                success = true,
                data = new
                {
                    id = s.Id,
                    name = s.Name,
                    code = s.Code,
                    phone = s.Phone,
                    address = s.Address,
                    notes = s.Notes,
                    account_id = s.AccountId,
                    account_code = s.Account != null ? s.Account.AccountCode : string.Empty,
                    branch_id = s.BranchId,
                    is_active = s.IsActive,
                    purchases_count = purchasesCount,
                    total_purchased = totalPurchased
                }
            });
        }

        // 4. تعديل بيانات مورد
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSupplierRequest request)
        {
            if (id == Guid.Empty)
                return BadRequest(new { success = false, message = "معرف المورد غير صالح." });

            var branchId = _currentUserService.BranchId;
            var supplier = await _context.Suppliers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);

            if (supplier == null)
                return NotFound(new { success = false, message = "المورد غير موجود." });

            supplier.Name = request.Name ?? supplier.Name;
            supplier.Phone = request.Phone ?? supplier.Phone;
            supplier.Address = request.Address;
            supplier.Notes = request.Notes;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "تم تحديث بيانات المورد بنجاح." });
        }

        // 5. تعطيل مورد (حذف ناعم)
        [HttpDelete("{id}")]
        public async Task<IActionResult> Deactivate(Guid id)
        {
            if (id == Guid.Empty)
                return BadRequest(new { success = false, message = "معرف المورد غير صالح." });

            var branchId = _currentUserService.BranchId;
            var supplier = await _context.Suppliers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);

            if (supplier == null)
                return NotFound(new { success = false, message = "المورد غير موجود." });

            var hasPurchases = await _context.Purchases.AnyAsync(p => p.SupplierId == id);
            if (hasPurchases)
                return BadRequest(new { success = false, message = "لا يمكن حذف مورد مرتبط بفواتير شراء." });

            supplier.IsActive = false;
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "تم تعطيل المورد بنجاح." });
        }

        // 6. صرف دفعة مالية للمورد
        [HttpPost("{id}/pay")]
        public async Task<IActionResult> Pay(Guid id, [FromBody] PaySupplierCommand command)
        {
            if (id != command.SupplierId)
                return BadRequest(new { success = false, message = "معرف المورد غير متطابق." });

            var paymentId = await Mediator.Send(command);
            return Ok(new { success = true, paymentId = paymentId, message = "تم صرف المبلغ للمورد وتوليد سند الصرف والقيد المحاسبي بنجاح." });
        }

        // GET /api/Suppliers/{id}/ledger?from=&to=
        [HttpGet("{id}/ledger")]
        public async Task<IActionResult> GetSupplierLedger(Guid id, [FromQuery] string? from = null, [FromQuery] string? to = null)
        {
            var branchId = _currentUserService.BranchId;

            var supplier = await _context.Suppliers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);
            if (supplier == null) return NotFound(new { success = false, message = "المورد غير موجود" });

            var fromDate = from != null ? DateTime.TryParse(from, out var fd) ? fd.ToUniversalTime() : DateTime.MinValue : DateTime.MinValue;
            var toDate   = to != null ? DateTime.TryParse(to, out var td) ? td.ToUniversalTime() : DateTime.UtcNow : DateTime.UtcNow;

            // جلب حركات الحساب
            var lines = await _context.JournalLines
                .Include(l => l.JournalEntry)
                .Where(l => l.AccountId == supplier.AccountId
                    && l.JournalEntry != null && l.JournalEntry.IsPosted
                    && l.JournalEntry.EntryDate >= fromDate && l.JournalEntry.EntryDate <= toDate)
                .OrderBy(l => l.JournalEntry!.EntryDate)
                .Select(l => new {
                    date = l.JournalEntry!.EntryDate,
                    entry_number = l.JournalEntry.EntryNumber,
                    description = l.Description ?? l.JournalEntry.Description,
                    debit = l.Debit,
                    credit = l.Credit,
                    reference_type = l.JournalEntry.ReferenceType
                })
                .ToListAsync();

            // رصيد متراكم
            decimal running = 0;
            var rows = lines.Select(l => {
                running += l.credit - l.debit; // حساب مورد طبيعته دائن
                return new {
                    l.date,
                    l.entry_number,
                    l.description,
                    l.debit,
                    l.credit,
                    running_balance = running,
                    l.reference_type
                };
            }).ToList();

            var totalDebit  = lines.Sum(l => l.debit);
            var totalCredit = lines.Sum(l => l.credit);
            var balance     = totalCredit - totalDebit;

            // إجمالي المشتريات غير المسددة
            var unpaidAmount = await _context.Purchases.IgnoreQueryFilters()
                .Where(p => p.SupplierId == id && p.Status == "Active" && p.AmountPaid < p.PurchaseCost)
                .SumAsync(p => p.PurchaseCost - p.AmountPaid);

            return Ok(new {
                success = true,
                supplier = new { id = supplier.Id, name = supplier.Name, phone = supplier.Phone, account_id = supplier.AccountId },
                period = new { from = fromDate, to = toDate },
                summary = new { total_debit = totalDebit, total_credit = totalCredit, balance, unpaid_purchases = unpaidAmount },
                entries = rows
            });
        }
    }

    public record UpdateSupplierRequest(string? Name, string? Phone, string? Address, string? Notes);
}
