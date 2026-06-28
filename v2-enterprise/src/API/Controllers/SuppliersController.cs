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

            var fromDate = from != null && DateTime.TryParse(from, out var fd) ? (DateTime?)fd.ToUniversalTime() : null;
            var toDate   = to   != null && DateTime.TryParse(to,   out var td) ? td.ToUniversalTime().AddDays(1).AddSeconds(-1) : DateTime.UtcNow;

            // جلب جميع المشتريات من هذا المورد
            var purchases = await _context.Purchases
                .IgnoreQueryFilters()
                .Include(p => p.Vehicle)
                .Where(p => p.SupplierId == id && p.BranchId == branchId)
                .OrderBy(p => p.CreatedAt)
                .ToListAsync();

            // جلب الدفعات المستقلة (سداد لاحق للأقساط)
            var supplierPayments = await _context.Payments
                .IgnoreQueryFilters()
                .Where(p => p.ContraAccountId == supplier.AccountId && p.BranchId == branchId)
                .OrderBy(p => p.CreatedAt)
                .ToListAsync();

            // بناء الحركات كـ flat list
            var raw = new List<(DateTime Date, string EntryNumber, string Description, decimal Debit, decimal Credit, string RefType)>();

            foreach (var p in purchases)
            {
                var carName = p.Vehicle != null
                    ? $"{p.Vehicle.Brand} {p.Vehicle.Model} {p.Vehicle.Year} - {p.Vehicle.ChassisNumber}"
                    : p.PurchaseNumber;

                // الشراء: دائن (يزيد الدين للمورد)
                raw.Add((p.CreatedAt, p.PurchaseNumber, $"شراء: {carName}", 0m, p.PurchaseCost, "Purchase"));

                // الدفعة الفورية: مدين (يخفض الدين)
                if (p.AmountPaid > 0)
                    raw.Add((p.CreatedAt, p.PurchaseNumber, $"دفع فوري عند الشراء - {carName}", p.AmountPaid, 0m, "Payment"));
            }

            foreach (var pay in supplierPayments)
            {
                raw.Add((pay.CreatedAt,
                    pay.ReferenceNumber ?? pay.Id.ToString()[..8],
                    pay.Description ?? "دفعة للمورد",
                    pay.Amount, 0m, "Payment"));
            }

            // الشراء يسبق الدفع دائماً عند تساوي التاريخ
            raw.Sort((a, b) => {
                var cmp = a.Date.CompareTo(b.Date);
                if (cmp != 0) return cmp;
                if (a.RefType == "Purchase" && b.RefType != "Purchase") return -1;
                if (a.RefType != "Purchase" && b.RefType == "Purchase") return 1;
                return 0;
            });

            // فلترة حسب الفترة
            var filtered = raw.Where(r => (!fromDate.HasValue || r.Date >= fromDate.Value) && r.Date <= toDate).ToList();

            // رصيد متراكم
            decimal running = 0;
            var rows = filtered.Select(r =>
            {
                running += r.Credit - r.Debit;
                return new {
                    date            = r.Date,
                    entry_number    = r.EntryNumber,
                    description     = r.Description,
                    debit           = r.Debit,
                    credit          = r.Credit,
                    running_balance = running,
                    reference_type  = r.RefType
                };
            }).ToList();

            var totalDebit  = rows.Sum(r => r.debit);
            var totalCredit = rows.Sum(r => r.credit);
            var balance     = totalCredit - totalDebit;
            var unpaidAmount = purchases.Where(p => p.PurchaseCost > p.AmountPaid).Sum(p => p.PurchaseCost - p.AmountPaid);

            return Ok(new {
                success  = true,
                supplier = new { id = supplier.Id, name = supplier.Name, phone = supplier.Phone, account_id = supplier.AccountId },
                period   = new { from = fromDate ?? DateTime.MinValue, to = toDate },
                summary  = new { total_debit = totalDebit, total_credit = totalCredit, balance, unpaid_purchases = unpaidAmount },
                entries  = rows
            });
        }
    }

    public record UpdateSupplierRequest(string? Name, string? Phone, string? Address, string? Notes);
}
