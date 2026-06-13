using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Purchases.Commands;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    public class PurchasesController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public PurchasesController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // 1. جلب قائمة المشتريات مع التصفية والترقيم والبحث
        [HttpGet]
        public async Task<IActionResult> GetPurchases(
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 25,
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] DateTime? date_from = null,
            [FromQuery] DateTime? date_to = null,
            [FromQuery] string? method = null)
        {
            if (page < 1) page = 1;
            if (per_page < 1 || per_page > 100) per_page = 25;

            var query = _context.Purchases
                .Include(p => p.Supplier)
                .Include(p => p.Vehicle)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(p => p.Status == status);
            }

            if (date_from.HasValue)
            {
                query = query.Where(p => p.PurchaseDate >= date_from.Value);
            }

            if (date_to.HasValue)
            {
                query = query.Where(p => p.PurchaseDate <= date_to.Value);
            }

            if (!string.IsNullOrEmpty(method))
            {
                // "Installment" is not a valid purchase payment method — purchases are always Cash/Bank/Cheque
                if (method.Equals("Installment", StringComparison.OrdinalIgnoreCase))
                    return Ok(new { total = 0, page, per_page, items = Array.Empty<object>() });

                if (!Enum.TryParse<CarShowroomManagementV2.Domain.Enums.PaymentMethod>(method, ignoreCase: true, out var methodEnum))
                    return Ok(new { total = 0, page, per_page, items = Array.Empty<object>() });

                query = query.Where(p => p.PaymentMethod == methodEnum);
            }

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(p => p.PurchaseNumber.Contains(search) ||
                                          (p.Supplier != null && p.Supplier.Name.Contains(search)) ||
                                          (p.Vehicle != null && (p.Vehicle.Model.Contains(search) || p.Vehicle.ChassisNumber.Contains(search))));
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(p => p.PurchaseDate)
                .Skip((page - 1) * per_page)
                .Take(per_page)
                .Select(p => new
                {
                    id = p.Id,
                    invoice_number = p.PurchaseNumber,
                    branch_id = p.BranchId,
                    car_id = p.VehicleId,
                    seller_id = p.SupplierId,
                    car_name = p.Vehicle != null ? $"{p.Vehicle.Model} {p.Vehicle.Year}" : null,
                    seller_name = p.Supplier != null ? p.Supplier.Name : null,
                    purchase_price = p.PurchaseCost,
                    paid_amount = p.PurchaseCost,
                    remaining_amount = 0.0m,
                    currency = "IQD",
                    payment_method = p.PaymentMethod.ToString(),
                    status = p.Status,
                    purchase_date = p.PurchaseDate
                })
                .ToListAsync();

            return Ok(new
            {
                total,
                page,
                per_page,
                items
            });
        }

        // 2. تفاصيل فاتورة شراء محددة بالمعرّف الفريد
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPurchaseById(Guid id)
        {
            var p = await _context.Purchases
                .Include(x => x.Supplier)
                .Include(x => x.Vehicle)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (p == null)
            {
                return NotFound(new { success = false, message = "فاتورة الشراء غير موجودة." });
            }

            // جلب الدفعات المقبوضة/المصروفة المرتبطة بحساب المورد
            var payments = await _context.Payments
                .Where(x => x.ContraAccountId == p.Supplier!.AccountId)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    id = x.Id,
                    amount = x.Amount,
                    currency = "IQD",
                    payment_method = x.Method.ToString(),
                    payment_date = x.CreatedAt,
                    notes = x.Description
                })
                .ToListAsync();

            var detail = new
            {
                id = p.Id,
                invoice_number = p.PurchaseNumber,
                branch_id = p.BranchId,
                car_id = p.VehicleId,
                seller_id = p.SupplierId,
                car_name = p.Vehicle != null ? $"{p.Vehicle.Model} {p.Vehicle.Year}" : null,
                seller_name = p.Supplier != null ? p.Supplier.Name : null,
                purchase_price = p.PurchaseCost,
                paid_amount = p.PurchaseCost,
                remaining_amount = 0.0m,
                currency = "IQD",
                payment_method = p.PaymentMethod.ToString(),
                status = p.Status,
                purchase_date = p.PurchaseDate,
                cancel_reason = (string?)null,
                cancelled_at = p.Status == "Cancelled" ? p.LastModifiedAt : null,
                created_at = p.CreatedAt,
                car = p.Vehicle != null ? new
                {
                    id = p.Vehicle.Id,
                    brand = "Car",
                    model = p.Vehicle.Model,
                    manufacturing_year = p.Vehicle.Year,
                    trim = (string?)null,
                    color = p.Vehicle.Color,
                    vin = p.Vehicle.ChassisNumber,
                    plate_number = "بدون لوحة",
                    mileage = 0,
                    status = p.Vehicle.Status
                } : null,
                seller = p.Supplier != null ? new
                {
                    id = p.Supplier.Id,
                    name = p.Supplier.Name,
                    full_name = p.Supplier.Name,
                    phone = p.Supplier.Phone,
                    address = p.Supplier.Address,
                    id_type = "National ID",
                    id_number = p.Supplier.Code
                } : null,
                payments = payments
            };

            return Ok(detail);
        }

        // 3. تسجيل فاتورة شراء جديدة
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePurchaseCommand command)
        {
            var id = await Mediator.Send(command);
            return Ok(new { success = true, purchaseId = id, message = "تم تسجيل فاتورة الشراء وتوليد القيد المحاسبي الموزون بنجاح." });
        }
    }
}
