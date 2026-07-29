using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Payments.Commands;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    public class PaymentsController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public PaymentsController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // 1. جلب حسابات الاستلام المتاحة للفرع وطريقة الدفع
        [HttpGet("eligible-accounts")]
        public async Task<IActionResult> GetEligibleAccounts([FromQuery] string? paymentMethod = "Cash")
        {
            var branchId = _currentUserService.BranchId;
            var isCash = string.Equals(paymentMethod, "Cash", StringComparison.OrdinalIgnoreCase);

            var query = _context.Accounts
                .Where(a => a.BranchId == branchId && a.IsActive);

            if (isCash)
            {
                query = query.Where(a => a.AccountCode.StartsWith("111"));
            }
            else
            {
                query = query.Where(a => a.AccountCode.StartsWith("112"));
            }

            var accounts = await query.OrderBy(a => a.AccountCode).Select(a => new
            {
                id = a.Id,
                code = a.AccountCode,
                name = a.Name,
                accountType = isCash ? "Cashbox" : "Bank",
                currency = "IQD",
                isDefault = isCash ? a.AccountCode == "111001" : a.AccountCode == "112001"
            }).ToListAsync();

            return Ok(new { success = true, items = accounts });
        }

        // 2. أرشفة وصل السند المالي
        [HttpPost("{paymentId}/archive")]
        public async Task<IActionResult> ArchiveReceipt(Guid paymentId, [FromBody] ArchiveReceiptCommand command)
        {
            command.PaymentId = paymentId;
            var result = await Mediator.Send(command);
            return Ok(result);
        }

        // 3. استرجاع حالة السند المالي بمفتاح التكرار الصريح
        [HttpGet("recovery/by-idempotency-key/{key}")]
        public async Task<IActionResult> GetPaymentRecoveryByIdempotencyKey(string key)
        {
            var branchId = _currentUserService.BranchId;

            var idempotency = await _context.IdempotencyRecords
                .FirstOrDefaultAsync(r => r.BranchId == branchId && r.IdempotencyKey == key);

            if (idempotency == null)
            {
                return Ok(new { exists = false, status = "NotFound" });
            }

            if (!idempotency.PaymentId.HasValue)
            {
                return Ok(new { exists = true, status = idempotency.Status, paymentId = (Guid?)null });
            }

            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.Id == idempotency.PaymentId.Value && p.BranchId == branchId);

            if (payment == null)
            {
                return NotFound(new { success = false, message = "السند المالي غير موجود." });
            }

            var archive = await _context.ReceiptArchiveRecords
                .FirstOrDefaultAsync(r => r.PaymentId == payment.Id);

            return Ok(new
            {
                exists = true,
                paymentId = payment.Id,
                receiptNumber = payment.ReferenceNumber,
                financialStatus = payment.Status,
                accountingStatus = payment.JournalEntryId.HasValue ? "Posted" : "Pending",
                receiptStatus = "Ready",
                archiveStatus = archive?.ArchiveStatus ?? "Pending",
                archiveMethod = archive?.ArchiveMethod ?? null,
                postedAmount = payment.Amount,
                currency = payment.Currency,
                createdAt = payment.CreatedAt
            });
        }

        // 4. استرجاع حالة السند المالي بالمعرف المباشر
        [HttpGet("{paymentId}/status")]
        public async Task<IActionResult> GetPaymentStatus(Guid paymentId)
        {
            var branchId = _currentUserService.BranchId;

            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.Id == paymentId && p.BranchId == branchId);

            if (payment == null)
            {
                return NotFound(new { success = false, message = "السند المالي غير موجود." });
            }

            var archive = await _context.ReceiptArchiveRecords
                .FirstOrDefaultAsync(r => r.PaymentId == payment.Id);

            return Ok(new
            {
                exists = true,
                paymentId = payment.Id,
                receiptNumber = payment.ReferenceNumber,
                financialStatus = payment.Status,
                accountingStatus = payment.JournalEntryId.HasValue ? "Posted" : "Pending",
                receiptStatus = "Ready",
                archiveStatus = archive?.ArchiveStatus ?? "Pending",
                archiveMethod = archive?.ArchiveMethod ?? null,
                postedAmount = payment.Amount,
                currency = payment.Currency,
                createdAt = payment.CreatedAt
            });
        }

        // 4. إنشاء سند قبض أو صرف مالي (بحسابات بالمعرّف مباشرة)
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePaymentCommand command)
        {
            var paymentId = await Mediator.Send(command);
            return Ok(new { success = true, paymentId = paymentId, message = "تم تسجيل وترحيل السند المالي وتوليد قيد اليومية بنجاح." });
        }

        // 2. قائمة السندات (المدفوعات) بصيغة Voucher للواجهة
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? type = null, [FromQuery] int page = 1, [FromQuery] int per_page = 25)
        {
            if (page < 1) page = 1;
            if (per_page < 1 || per_page > 200) per_page = 25;

            var isReceipt = string.Equals(type, "receipt", StringComparison.OrdinalIgnoreCase);
            var isPayment = string.Equals(type, "payment", StringComparison.OrdinalIgnoreCase);
            var isTransfer = string.Equals(type, "transfer", StringComparison.OrdinalIgnoreCase);

            if (type != null && !isReceipt && !isPayment && !isTransfer)
                return BadRequest(new { success = false, message = "نوع السند غير صالح. القيم المسموحة: receipt, payment, transfer." });

            var query = _context.Payments
                .Include(p => p.Account)
                .Include(p => p.ContraAccount)
                .AsQueryable();

            if (isReceipt)
            {
                query = query.Where(p => p.Type == PaymentType.Receipt &&
                    !(
                        (p.Account != null && (p.Account.AccountCode.StartsWith("111") || p.Account.AccountCode.StartsWith("112"))) &&
                        (p.ContraAccount != null && (p.ContraAccount.AccountCode.StartsWith("111") || p.ContraAccount.AccountCode.StartsWith("112")))
                    ));
            }
            else if (isPayment)
            {
                query = query.Where(p => p.Type == PaymentType.Payment &&
                    !(
                        (p.Account != null && (p.Account.AccountCode.StartsWith("111") || p.Account.AccountCode.StartsWith("112"))) &&
                        (p.ContraAccount != null && (p.ContraAccount.AccountCode.StartsWith("111") || p.ContraAccount.AccountCode.StartsWith("112")))
                    ));
            }
            else if (isTransfer)
            {
                query = query.Where(p =>
                    p.Account != null && (p.Account.AccountCode.StartsWith("111") || p.Account.AccountCode.StartsWith("112")) &&
                    p.ContraAccount != null && (p.ContraAccount.AccountCode.StartsWith("111") || p.ContraAccount.AccountCode.StartsWith("112"))
                );
            }

            var rows = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
            var items = rows.Select(MapVoucher).ToList();
            var total = items.Count;
            var paged = items.Skip((page - 1) * per_page).Take(per_page).ToList();
            return Ok(new { success = true, data = new { total, page, per_page, items = paged } });
        }

        // 3. إنشاء سند من أكواد الحسابات (واجهة السندات)
        [HttpPost("voucher")]
        public async Task<IActionResult> CreateVoucher([FromBody] VoucherDto dto)
        {
            var debit = await _context.Accounts.IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == dto.DebitAccountCode && a.IsActive);
            var credit = await _context.Accounts.IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == dto.CreditAccountCode && a.IsActive);
            if (debit == null) return BadRequest(new { success = false, message = "الحساب المدين غير موجود أو غير نشط." });
            if (credit == null) return BadRequest(new { success = false, message = "الحساب الدائن غير موجود أو غير نشط." });

            var isReceipt = (dto.VoucherType ?? "receipt").Equals("receipt", StringComparison.OrdinalIgnoreCase);
            var count = await _context.Payments.IgnoreQueryFilters().CountAsync();
            var refNo = $"{(isReceipt ? "REC" : "PAY")}-{DateTime.UtcNow:yyyyMMdd}-{count + 1:D5}";

            // ربط الحسابات بحيث يدين القيد debit_code ويُدين credit_code بصرف النظر عن النوع
            var command = new CreatePaymentCommand
            {
                Type = isReceipt ? PaymentType.Receipt : PaymentType.Payment,
                Method = PaymentMethod.Cash,
                Amount = dto.Amount,
                ReferenceNumber = refNo,
                Description = dto.Description ?? refNo,
                AccountId = isReceipt ? debit.Id : credit.Id,
                ContraAccountId = isReceipt ? credit.Id : debit.Id,
                ExchangeRate = dto.ExchangeRate ?? 1.0m,
                Currency = dto.Currency ?? "IQD",
            };
            var id = await Mediator.Send(command);
            return Ok(new { success = true, voucherId = id, voucher_number = refNo, message = "تم إنشاء السند وترحيله بنجاح." });
        }

        // 4. إلغاء سند: عكس قيده المحاسبي وتعليم السند ملغى
        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> Cancel(Guid id)
        {
            var payment = await _context.Payments.FirstOrDefaultAsync(p => p.Id == id);
            if (payment == null) return NotFound(new { success = false, message = "السند غير موجود." });
            if (payment.Status == "cancelled") return BadRequest(new { success = false, message = "السند ملغى بالفعل." });

            var origLines = await _context.JournalLines.Where(l => l.JournalEntryId == payment.JournalEntryId).ToListAsync();

            var count = await _context.JournalEntries.IgnoreQueryFilters().CountAsync();
            var reversalEntry = new JournalEntry
            {
                Id = Guid.NewGuid(),
                EntryNumber = $"REV-{DateTime.UtcNow:yyyyMMdd}-{count + 1:D5}",
                EntryDate = DateTime.UtcNow,
                Description = $"عكس/إلغاء السند رقم {payment.ReferenceNumber}",
                IsPosted = true,
                BranchId = _currentUserService.BranchId,
                ReferenceType = "PaymentReversal",
                ReferenceId = payment.Id,
                CreatedBy = _currentUserService.UserId,
            };
            foreach (var l in origLines)
            {
                reversalEntry.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = reversalEntry.Id,
                    AccountId = l.AccountId,
                    Debit = l.Credit,   // عكس
                    Credit = l.Debit,
                    Description = $"عكس: {l.Description}"
                });
            }
            _context.JournalEntries.Add(reversalEntry);

            payment.Status = "cancelled";
            _context.Payments.Update(payment);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "تم إلغاء السند وعكس قيده المحاسبي بنجاح." });
        }

        private object MapVoucher(Payment p)
        {
            var isReceipt = p.Type == PaymentType.Receipt;
            // في القبض: مدين = الصندوق (Account)، دائن = المقابل. في الصرف: العكس.
            var debitAcc = isReceipt ? p.Account : p.ContraAccount;
            var creditAcc = isReceipt ? p.ContraAccount : p.Account;

            var isTransfer = debitAcc != null && creditAcc != null &&
                (debitAcc.AccountCode.StartsWith("111") || debitAcc.AccountCode.StartsWith("112")) &&
                (creditAcc.AccountCode.StartsWith("111") || creditAcc.AccountCode.StartsWith("112"));

            return new
            {
                id = p.Id,
                voucher_type = isTransfer ? "transfer" : (isReceipt ? "receipt" : "payment"),
                voucher_number = p.ReferenceNumber,
                voucher_date = p.CreatedAt,
                debit_account_code = debitAcc?.AccountCode,
                debit_account_name = debitAcc?.Name,
                credit_account_code = creditAcc?.AccountCode,
                credit_account_name = creditAcc?.Name,
                amount = p.Amount,
                currency = p.Currency ?? "IQD",
                description = p.Description,
                status = p.Status,
                journal_entry_id = p.JournalEntryId,
                reversal_of_id = p.ReversalOfId,
                created_by = p.CreatedBy,
                created_at = p.CreatedAt,
            };
        }

        public class VoucherDto
        {
            public string? VoucherType { get; set; }
            public string DebitAccountCode { get; set; } = string.Empty;
            public string CreditAccountCode { get; set; } = string.Empty;
            public decimal Amount { get; set; }
            public string? Currency { get; set; }
            public string? Description { get; set; }
            public decimal? ExchangeRate { get; set; }
        }
    }
}
