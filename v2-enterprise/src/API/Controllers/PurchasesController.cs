using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Purchases.Commands;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Common.Helpers;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize(Roles = "Owner,Admin,Accountant")]
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
                .Include(p => p.Customer)
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
                                          (p.Customer != null && p.Customer.Name.Contains(search)) ||
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
                    source_type = p.SourceType.ToString(),
                    branch_id = p.BranchId,
                    car_id = p.VehicleId,
                    seller_id = p.SourceType == CarShowroomManagementV2.Domain.Enums.PurchaseSourceType.Customer ? p.CustomerId : p.SupplierId,
                    car_name = p.Vehicle != null ? $"{p.Vehicle.Model} {p.Vehicle.Year}" : null,
                    seller_name = p.SourceType == CarShowroomManagementV2.Domain.Enums.PurchaseSourceType.Customer ? (p.Customer != null ? $"الزبون: {p.Customer.Name}" : null) : (p.Supplier != null ? p.Supplier.Name : null),
                    counterparty_name = p.SourceType == CarShowroomManagementV2.Domain.Enums.PurchaseSourceType.Customer ? (p.Customer != null ? p.Customer.Name : null) : (p.Supplier != null ? p.Supplier.Name : null),
                    counterparty_code = p.SourceType == CarShowroomManagementV2.Domain.Enums.PurchaseSourceType.Customer ? (p.Customer != null ? p.Customer.IdNumber : null) : (p.Supplier != null ? p.Supplier.Code : null),
                    purchase_price = p.PurchaseCost,
                    paid_amount = p.AmountPaid,
                    remaining_amount = p.PurchaseCost - p.AmountPaid,
                    currency = p.Currency ?? (p.Vehicle != null ? p.Vehicle.Currency : "IQD"),
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
                .Include(x => x.Customer)
                .Include(x => x.Vehicle)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (p == null)
            {
                return NotFound(new { success = false, message = "فاتورة الشراء غير موجودة." });
            }

            var counterpartyAccountId = p.SourceType == CarShowroomManagementV2.Domain.Enums.PurchaseSourceType.Customer
                ? (p.Customer != null ? p.Customer.AccountId : Guid.Empty)
                : (p.Supplier != null ? p.Supplier.AccountId : Guid.Empty);

            // جلب الدفعات المقبوضة/المصروفة المرتبطة بحساب الجهة
            var payments = await _context.Payments
                .Where(x => x.ContraAccountId == counterpartyAccountId)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    id = x.Id,
                    amount = x.Amount,
                    currency = x.Currency ?? p.Currency ?? (p.Vehicle != null ? p.Vehicle.Currency : "IQD"),
                    payment_method = x.Method.ToString(),
                    payment_date = x.CreatedAt,
                    notes = x.Description
                })
                .ToListAsync();

            var detail = new
            {
                id = p.Id,
                invoice_number = p.PurchaseNumber,
                source_type = p.SourceType.ToString(),
                branch_id = p.BranchId,
                car_id = p.VehicleId,
                seller_id = p.SourceType == CarShowroomManagementV2.Domain.Enums.PurchaseSourceType.Customer ? p.CustomerId : p.SupplierId,
                car_name = p.Vehicle != null ? $"{p.Vehicle.Model} {p.Vehicle.Year}" : null,
                seller_name = p.SourceType == CarShowroomManagementV2.Domain.Enums.PurchaseSourceType.Customer ? (p.Customer != null ? $"الزبون: {p.Customer.Name}" : null) : (p.Supplier != null ? p.Supplier.Name : null),
                counterparty_name = p.SourceType == CarShowroomManagementV2.Domain.Enums.PurchaseSourceType.Customer ? (p.Customer != null ? p.Customer.Name : null) : (p.Supplier != null ? p.Supplier.Name : null),
                counterparty_code = p.SourceType == CarShowroomManagementV2.Domain.Enums.PurchaseSourceType.Customer ? (p.Customer != null ? p.Customer.IdNumber : null) : (p.Supplier != null ? p.Supplier.Code : null),
                purchase_price = p.PurchaseCost,
                paid_amount = p.AmountPaid,
                remaining_amount = p.PurchaseCost - p.AmountPaid,
                currency = p.Currency ?? (p.Vehicle != null ? p.Vehicle.Currency : "IQD"),
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

        // 4. تسجيل دفعة جديدة لفاتورة شراء (دفع جزء من المبلغ المتبقي للمورد أو الزبون)
        [HttpPost("{id}/payment")]
        public async Task<IActionResult> AddPayment(Guid id, [FromBody] AddPurchasePaymentRequest request)
        {
            var branchId = _currentUserService.BranchId;

            var purchase = await _context.Purchases
                .FirstOrDefaultAsync(p => p.Id == id);

            if (purchase == null)
                return NotFound(new { success = false, message = "فاتورة الشراء غير موجودة." });

            var remaining = purchase.PurchaseCost - purchase.AmountPaid;

            if (remaining <= 0)
                return BadRequest(new { success = false, message = "تم سداد هذه الفاتورة بالكامل." });

            if (request.Amount <= 0)
                return BadRequest(new { success = false, message = "قيمة الدفعة يجب أن تكون أكبر من صفر." });

            if (request.Amount > remaining)
                return BadRequest(new { success = false, message = $"الدفعة ({request.Amount}) تتجاوز المبلغ المتبقي ({remaining})." });

            var counterparty = await CounterpartyResolver.ResolveAsync(
                _context,
                purchase.SourceType,
                purchase.SupplierId,
                purchase.CustomerId,
                branchId,
                HttpContext.RequestAborted);

            // حساب الصندوق أو البنك
            var accountCode = request.PaymentMethod?.ToLower() == "bank" ? "112001" : "111001";
            var cashAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == accountCode && a.BranchId == branchId);

            if (cashAccount == null)
                return BadRequest(new { success = false, message = $"حساب الصرف ({accountCode}) غير موجود في هذا الفرع." });

            // التحقق من كفاية رصيد الحساب
            var accountBalance = await _context.JournalLines
                .Where(l => l.AccountId == cashAccount.Id)
                .SumAsync(l => l.Debit - l.Credit);

            if (accountBalance < request.Amount)
                return BadRequest(new { success = false, message = $"رصيد الحساب ({cashAccount.AccountCode} - {cashAccount.Name}) غير كافٍ. المتاح: {accountBalance:N0}، المطلوب: {request.Amount:N0}." });

            var dbContext = _context as Microsoft.EntityFrameworkCore.DbContext;
            if (dbContext == null) return StatusCode(500);

            using var transaction = await dbContext.Database.BeginTransactionAsync();
            try
            {
                var paymentAmount = Math.Round(request.Amount, 4);
                var method = request.PaymentMethod?.ToLower() == "bank"
                    ? CarShowroomManagementV2.Domain.Enums.PaymentMethod.Bank
                    : CarShowroomManagementV2.Domain.Enums.PaymentMethod.Cash;

                // سند الصرف
                var totalPaymentsCount = await _context.Payments.IgnoreQueryFilters().CountAsync();
                var refNumber = $"PAY-{DateTime.UtcNow:yyyyMMdd}-{totalPaymentsCount + 1:D5}";

                var payment = new CarShowroomManagementV2.Domain.Entities.Payment
                {
                    Id = Guid.NewGuid(),
                    Type = CarShowroomManagementV2.Domain.Enums.PaymentType.Payment,
                    Method = method,
                    Amount = paymentAmount,
                    ReferenceNumber = refNumber,
                    Description = request.Notes ?? $"دفعة لفاتورة شراء {purchase.PurchaseNumber} - الجهة: {counterparty.Name}",
                    AccountId = cashAccount.Id,
                    ContraAccountId = counterparty.AccountId,
                    BranchId = branchId
                };
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();

                // القيد المحاسبي
                var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync();
                var entryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

                var journal = new CarShowroomManagementV2.Domain.Entities.JournalEntry
                {
                    Id = Guid.NewGuid(),
                    EntryNumber = entryNumber,
                    EntryDate = DateTime.UtcNow,
                    Description = $"دفعة لـ {(purchase.SourceType == CarShowroomManagementV2.Domain.Enums.PurchaseSourceType.Customer ? "الزبون" : "المورد")} {counterparty.Name} - فاتورة: {purchase.PurchaseNumber} - سند: {refNumber}",
                    IsPosted = true,
                    BranchId = branchId,
                    ReferenceType = "Payment",
                    ReferenceId = payment.Id,
                    CreatedBy = _currentUserService.UserId
                };
                journal.Lines.Add(new CarShowroomManagementV2.Domain.Entities.JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journal.Id,
                    AccountId = counterparty.AccountId,
                    Debit = paymentAmount,
                    Credit = 0,
                    Description = $"تخفيض مستحقات {(purchase.SourceType == CarShowroomManagementV2.Domain.Enums.PurchaseSourceType.Customer ? "الزبون" : "المورد")} {counterparty.Name}"
                });
                journal.Lines.Add(new CarShowroomManagementV2.Domain.Entities.JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journal.Id,
                    AccountId = cashAccount.Id,
                    Debit = 0,
                    Credit = paymentAmount,
                    Description = $"خروج النقدية لصالح {(purchase.SourceType == CarShowroomManagementV2.Domain.Enums.PurchaseSourceType.Customer ? "الزبون" : "المورد")} {counterparty.Name}"
                });

                _context.JournalEntries.Add(journal);
                payment.JournalEntryId = journal.Id;
                await _context.SaveChangesAsync();

                // تحديث المبلغ المدفوع في الفاتورة
                purchase.AmountPaid += paymentAmount;
                _context.Purchases.Update(purchase);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return Ok(new
                {
                    success = true,
                    payment_id = payment.Id,
                    paid_amount = purchase.AmountPaid,
                    remaining_amount = purchase.PurchaseCost - purchase.AmountPaid,
                    message = "تم تسجيل الدفعة وتوليد القيد المحاسبي بنجاح."
                });
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        // 5. شراء جماعي — نفس المورد والموديل بأرقام شاصي مختلفة
        [HttpPost("bulk")]
        public async Task<IActionResult> BulkCreate([FromBody] BulkCreatePurchaseCommand command)
        {
            var result = await Mediator.Send(command);
            return Ok(new
            {
                success = true,
                created_count = result.CreatedCount,
                purchase_ids = result.PurchaseIds,
                errors = result.Errors,
                message = $"تم تسجيل {result.CreatedCount} سيارة بنجاح." + (result.Errors.Any() ? $" ({result.Errors.Count} خطأ)" : "")
            });
        }

        // 6. إلغاء/حذف فاتورة شراء وعكس قيودها المحاسبية
        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelPurchaseRequest? request)
        {
            var command = new CancelPurchaseCommand
            {
                PurchaseId = id,
                Reason = request?.Reason
            };
            var success = await Mediator.Send(command);
            return Ok(new
            {
                success = true,
                message = "تم إلغاء فاتورة الشراء وعكس القيود المحاسبية بنجاح."
            });
        }
    }

    public record AddPurchasePaymentRequest(decimal Amount, string? PaymentMethod, string? Notes);
    public record CancelPurchaseRequest(string? Reason);
}
