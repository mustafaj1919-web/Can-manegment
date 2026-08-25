using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Employees.Commands;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    public class EmployeesController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public EmployeesController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // 1. قائمة الموظفين
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1, [FromQuery] int per_page = 50,
            [FromQuery] string? search = null, [FromQuery] bool active_only = false)
        {
            if (page < 1) page = 1;
            if (per_page < 1 || per_page > 200) per_page = 50;

            var query = _context.Employees.AsQueryable();
            if (active_only) query = query.Where(e => e.IsActive);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(e => e.FullName.Contains(s) || e.Phone.Contains(s));
            }

            var all = await query.OrderByDescending(e => e.CreatedAt).ToListAsync();
            var total = all.Count;
            var items = all.Skip((page - 1) * per_page).Take(per_page).Select(MapEmployee).ToList();
            return Ok(new { success = true, data = new { total, page, per_page, items } });
        }

        // 2. موظف واحد
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var e = await _context.Employees.FirstOrDefaultAsync(x => x.Id == id);
            if (e == null) return NotFound(new { success = false, message = "الموظف غير موجود." });
            return Ok(new { success = true, data = MapEmployee(e) });
        }

        // 3. إنشاء موظف
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateEmployeeCommand command)
        {
            var id = await Mediator.Send(command);
            return Ok(new { success = true, employeeId = id, message = "تم إضافة الموظف بنجاح." });
        }

        // 4. تعديل موظف
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateEmployeeCommand command)
        {
            command.Id = id;
            var employeeId = await Mediator.Send(command);
            return Ok(new { success = true, employeeId, message = "تم تحديث بيانات الموظف بنجاح." });
        }

        // 5. حذف (تعطيل) موظف
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var e = await _context.Employees.FirstOrDefaultAsync(x => x.Id == id);
            if (e == null) return NotFound(new { success = false, message = "الموظف غير موجود." });
            e.IsActive = false; // تعطيل بدل الحذف للحفاظ على المراجع التاريخية
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "تم تعطيل الموظف بنجاح." });
        }

        // 6. تعيين/إزالة مندوب المبيعات لعقد بيع
        [HttpPut("sales-rep/{saleId}")]
        public async Task<IActionResult> AssignSalesRep(Guid saleId, [FromBody] AssignRepDto body)
        {
            var contract = await _context.SalesContracts.FirstOrDefaultAsync(c => c.Id == saleId);
            if (contract == null) return NotFound(new { success = false, message = "عقد البيع غير موجود." });

            CarShowroomManagementV2.Domain.Entities.Employee? rep = null;
            if (body.EmployeeId.HasValue)
            {
                rep = await _context.Employees.FirstOrDefaultAsync(e => e.Id == body.EmployeeId.Value);
                if (rep == null) return BadRequest(new { success = false, message = "الموظف المحدد غير موجود." });
            }
            contract.SalesRepId = body.EmployeeId;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                sales_rep_id = rep?.Id,
                sales_rep_name = rep?.FullName,
                sales_rep_phone = rep?.Phone,
                sales_rep_id_number = rep?.IdNumber,
                sales_rep_title = rep?.Title,
                sales_rep_address = rep?.Address,
            });
        }

        private static object MapEmployee(CarShowroomManagementV2.Domain.Entities.Employee e) => new
        {
            id = e.Id,
            branch_id = e.BranchId,
            full_name = e.FullName,
            phone = e.Phone,
            id_number = e.IdNumber,
            address = e.Address,
            title = e.Title,
            is_active = e.IsActive,
            signature_filename = e.SignatureFilename,
            created_at = e.CreatedAt,
        };

        public class AssignRepDto
        {
            public Guid? EmployeeId { get; set; }
        }
    }
}
