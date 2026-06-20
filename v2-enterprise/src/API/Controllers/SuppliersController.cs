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

        public SuppliersController(IApplicationDbContext context)
        {
            _context = context;
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

        // 3. صرف دفعة مالية للمورد
        [HttpPost("{id}/pay")]
        public async Task<IActionResult> Pay(Guid id, [FromBody] PaySupplierCommand command)
        {
            if (id != command.SupplierId)
                return BadRequest(new { success = false, message = "معرف المورد غير متطابق." });

            var paymentId = await Mediator.Send(command);
            return Ok(new { success = true, paymentId = paymentId, message = "تم صرف المبلغ للمورد وتوليد سند الصرف والقيد المحاسبي بنجاح." });
        }
    }
}
