using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Customers.Commands;
using CarShowroomManagementV2.Application.Accounting.Queries;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    public class SalesController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public SalesController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // 1. جلب قائمة المبيعات مع التصفية والترقيم والبحث
        [HttpGet]
        public async Task<IActionResult> GetSales(
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 25,
            [FromQuery] string? status = null,
            [FromQuery] string? search = null,
            [FromQuery] DateTime? date_from = null,
            [FromQuery] DateTime? date_to = null,
            [FromQuery] string? method = null)
        {
            if (page < 1) page = 1;
            if (per_page < 1 || per_page > 100) per_page = 25;

            var query = _context.SalesContracts
                .Include(sc => sc.Customer)
                .Include(sc => sc.Vehicle)
                .Include(sc => sc.InstallmentPlan)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(sc => sc.Status == status);
            }

            if (date_from.HasValue)
            {
                query = query.Where(sc => sc.SaleDate >= date_from.Value);
            }

            if (date_to.HasValue)
            {
                query = query.Where(sc => sc.SaleDate <= date_to.Value);
            }

            if (!string.IsNullOrEmpty(method))
            {
                // "Installment" → filter sales that have an installment plan
                if (method.Equals("Installment", StringComparison.OrdinalIgnoreCase))
                    query = query.Where(sc => sc.InstallmentPlan != null);
                else if (Enum.TryParse<CarShowroomManagementV2.Domain.Enums.PaymentMethod>(method, ignoreCase: true, out var methodEnum))
                    query = query.Where(sc => sc.PaymentMethod == methodEnum);
                else
                    return Ok(new { total = 0, page, per_page, items = Array.Empty<object>() });
            }

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(sc => sc.ContractNumber.Contains(search) || 
                                          (sc.Customer != null && sc.Customer.Name.Contains(search)) ||
                                          (sc.Vehicle != null && (sc.Vehicle.Model.Contains(search) || sc.Vehicle.ChassisNumber.Contains(search))));
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(sc => sc.SaleDate)
                .Skip((page - 1) * per_page)
                .Take(per_page)
                .Select(sc => new
                {
                    id = sc.Id,
                    invoice_number = sc.ContractNumber,
                    branch_id = sc.BranchId,
                    car_id = sc.VehicleId,
                    buyer_id = sc.CustomerId,
                    car_name = sc.Vehicle != null ? $"{sc.Vehicle.Model} {sc.Vehicle.Year}" : null,
                    car_vin = sc.Vehicle != null ? sc.Vehicle.ChassisNumber : null,
                    buyer_name = sc.Customer != null ? (sc.Customer.FullName ?? sc.Customer.Name) : null,
                    buyer_phone = sc.Customer != null ? sc.Customer.Phone : null,
                    selling_price = sc.SalePrice,
                    discount = sc.Discount,
                    paid_amount = sc.Status == "Cancelled" ? 0 : sc.DownPayment,
                    remaining_amount = sc.Status == "Cancelled" ? 0 : sc.RemainingBalance,
                    currency = sc.Currency ?? (sc.Vehicle != null ? sc.Vehicle.Currency : "IQD"),
                    payment_method = sc.PaymentMethod.ToString(),
                    status = sc.Status,
                    has_installment = sc.InstallmentPlan != null,
                    sale_date = sc.SaleDate,
                    created_at = sc.CreatedAt
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

        // 2. تفاصيل عقد بيع محدد بالمعرّف الفريد أو برقم العقد
        [HttpGet("{id}")]
        public async Task<IActionResult> GetSaleById(string id)
        {
            SalesContract? sc = null;

            if (Guid.TryParse(id, out var guidId))
            {
                sc = await _context.SalesContracts
                    .Include(s => s.Customer)
                    .Include(s => s.Vehicle)
                    .Include(s => s.InstallmentPlan)
                        .ThenInclude(ip => ip!.Installments)
                    .FirstOrDefaultAsync(s => s.Id == guidId);
            }

            if (sc == null)
            {
                sc = await _context.SalesContracts
                    .Include(s => s.Customer)
                    .Include(s => s.Vehicle)
                    .Include(s => s.InstallmentPlan)
                        .ThenInclude(ip => ip!.Installments)
                    .FirstOrDefaultAsync(s => s.ContractNumber == id || s.DocumentNumber == id);
            }

            if (sc == null)
            {
                return NotFound(new { success = false, message = "عقد البيع غير موجود." });
            }

            // جلب الدفعات المقبوضة المرتبطة بحساب العميل الفرعي (باستثناء السندات الملغاة)
            var payments = await _context.Payments
                .Where(p => p.ContraAccountId == sc.Customer!.AccountId && p.Status != "cancelled")
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    id = p.Id,
                    amount = p.Amount,
                    currency = p.Currency ?? sc.Currency ?? (sc.Vehicle != null ? sc.Vehicle.Currency : "IQD"),
                    payment_method = p.Method.ToString(),
                    payment_date = p.CreatedAt,
                    notes = p.Description
                })
                .ToListAsync();

            var installmentPlan = sc.InstallmentPlan != null ? new
            {
                id = sc.InstallmentPlan.Id,
                total_amount = sc.InstallmentPlan.TotalAmount,
                paid_amount = sc.InstallmentPlan.Installments.Where(i => i.Status == "Paid").Sum(i => i.PaidAmount),
                remaining_amount = sc.InstallmentPlan.TotalPlanAmount - sc.InstallmentPlan.Installments.Sum(i => i.PaidAmount),
                currency = sc.Currency ?? (sc.Vehicle != null ? sc.Vehicle.Currency : "IQD"),
                number_of_months = sc.InstallmentPlan.InstallmentPeriodMonths,
                installment_amount = sc.InstallmentPlan.MonthlyInstallmentAmount,
                installment_start_date = sc.InstallmentPlan.CreatedAt,
                installment_due_day = 1,
                status = sc.InstallmentPlan.Status == "Completed" ? "Paid" : "Active",
                schedules = sc.InstallmentPlan.Installments.OrderBy(i => i.InstallmentNumber).Select(i => new
                {
                    id = i.Id,
                    installment_number = i.InstallmentNumber,
                    due_date = i.DueDate,
                    amount = i.Amount,
                    paid_amount = i.PaidAmount,
                    remaining_amount = i.Amount - i.PaidAmount,
                    currency = sc.Currency ?? (sc.Vehicle != null ? sc.Vehicle.Currency : "IQD"),
                    status = i.Status, // Pending, PartiallyPaid, Paid, Overdue
                    payment_date = i.PaymentDate
                }).ToList()
            } : null;

            var branch = await _context.Branches
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(b => b.Id == sc.BranchId);

            // جلب بيانات مندوب المبيعات إن وُجد
            Employee? salesRep = null;
            if (sc.SalesRepId.HasValue)
            {
                salesRep = await _context.Employees
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(e => e.Id == sc.SalesRepId.Value);
            }

            var detail = new
            {
                id = sc.Id,
                invoice_number = sc.ContractNumber,
                branch_id = sc.BranchId,
                branch = branch != null ? new
                {
                    id = branch.Id,
                    name = branch.Name,
                    code = branch.Code,
                    vat_number = branch.VatNumber,
                    tax_name = branch.TaxName
                } : null,
                car_id = sc.VehicleId,
                buyer_id = sc.CustomerId,
                car_name = sc.Vehicle != null ? $"{sc.Vehicle.Model} {sc.Vehicle.Year}" : null,
                car_vin = sc.Vehicle != null ? sc.Vehicle.ChassisNumber : null,
                buyer_name = sc.Customer != null ? (sc.Customer.FullName ?? sc.Customer.Name) : null,
                buyer_phone = sc.Customer != null ? sc.Customer.Phone : null,
                selling_price = sc.SalePrice,
                discount = sc.Discount,
                paid_amount = sc.DownPayment,
                remaining_amount = sc.RemainingBalance,
                currency = sc.Currency ?? (sc.Vehicle != null ? sc.Vehicle.Currency : "IQD"),
                payment_method = sc.PaymentMethod.ToString(),
                status = sc.Status,
                has_installment = sc.InstallmentPlan != null,
                sale_date = sc.SaleDate,
                created_at = sc.CreatedAt,
                cancel_reason = (string?)null,
                cancelled_at = sc.Status == "Cancelled" ? sc.LastModifiedAt : null,
                sales_rep_id        = salesRep?.Id.ToString(),
                sales_rep_name      = salesRep?.FullName,
                sales_rep_phone     = salesRep?.Phone,
                sales_rep_id_number = salesRep?.IdNumber,
                sales_rep_title     = salesRep?.Title ?? (salesRep != null ? "موظف مبيعات" : null),
                sales_rep_address   = salesRep?.Address,
                einvoice_status = sc.EInvoiceStatus,
                einvoice_qr_code = sc.EInvoiceQrCode,
                einvoice_uuid = sc.EInvoiceUuid,
                einvoice_error = sc.EInvoiceError,
                einvoice_xml_hash = sc.EInvoiceXmlHash,
                car = sc.Vehicle != null ? new
                {
                    id = sc.Vehicle.Id,
                    brand = sc.Vehicle.Brand,
                    model = sc.Vehicle.Model,
                    manufacturing_year = sc.Vehicle.Year,
                    trim = sc.Vehicle.Trim,
                    color = sc.Vehicle.Color,
                    vin = sc.Vehicle.ChassisNumber,
                    plate_number = sc.Vehicle.PlateNumber,
                    status = sc.Vehicle.Status
                } : null,
                buyer = sc.Customer != null ? new
                {
                    id = sc.Customer.Id,
                    name = sc.Customer.Name,
                    phone = sc.Customer.Phone,
                    address = sc.Customer.Address,
                    id_type = sc.Customer.IdType,
                    id_number = sc.Customer.IdNumber,
                    vat_number = sc.Customer.VatNumber
                } : null,
                payments = payments,
                installment_plan = installmentPlan
            };

            return Ok(detail);
        }

        // 3. تسجيل عقد بيع جديد (نقدي أو تقسيط)
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSaleContractCommand command)
        {
            var id = await Mediator.Send(command);
            return Ok(new { success = true, contractId = id, message = "تم تسجيل عقد البيع وتحديث حالة السيارة وتوليد القيد بنجاح." });
        }

        // 4. إلغاء وعكس عقد بيع قائم محاسبياً
        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> Cancel(Guid id)
        {
            var success = await Mediator.Send(new CancelSaleContractCommand { ContractId = id });
            return Ok(new { success = success, message = "تم إلغاء العقد بنجاح وتوليد قيد التسوية العكسي بنجاح." });
        }

        // 5. جلب تقرير ملخص المبيعات والمشتريات الأساسي
        [HttpGet("report")]
        public async Task<IActionResult> GetReport()
        {
            var report = await Mediator.Send(new GetSalesAndPurchasesReportQuery());
            return Ok(new { success = true, data = report });
        }
    }
}
