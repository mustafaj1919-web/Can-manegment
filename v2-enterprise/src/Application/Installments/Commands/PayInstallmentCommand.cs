using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Common.Helpers;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Application.Installments.Commands
{
    public class PaymentResultDto
    {
        public bool Success { get; set; } = true;
        public Guid PaymentId { get; set; }
        public Guid ReceiptId { get; set; }
        public string ReceiptNumber { get; set; } = string.Empty;
        public string IdempotencyKey { get; set; } = string.Empty;
        public string FinancialStatus { get; set; } = "Posted";
        public string AccountingStatus { get; set; } = "Posted";
        public string ReceiptStatus { get; set; } = "Ready";
        public string ArchiveStatus { get; set; } = "Pending";
        public decimal PostedAmount { get; set; }
        public string Currency { get; set; } = "IQD";
        public decimal TotalPaid { get; set; }
        public decimal RemainingBalance { get; set; }
        public int PaidInstallmentCount { get; set; }
        public int RemainingInstallmentCount { get; set; }
        public string? NextInstallmentDate { get; set; }
        public Guid? JournalEntryId { get; set; }
        public string? JournalEntryNumber { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class PayInstallmentCommand : IRequest<PaymentResultDto>
    {
        public Guid InstallmentId { get; set; }
        public decimal Amount { get; set; }
        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
        public Guid? AccountId { get; set; }
        public string DebitAccountCode { get; set; } = "111001";
        public string? IdempotencyKey { get; set; }
        public string? Notes { get; set; }
    }

    public class PayInstallmentCommandValidator : AbstractValidator<PayInstallmentCommand>
    {
        public PayInstallmentCommandValidator()
        {
            RuleFor(x => x.InstallmentId).NotEmpty().WithMessage("القسط مطلوب.");
            RuleFor(x => x.Amount).GreaterThan(0).WithMessage("قيمة السداد يجب أن تكون أكبر من صفر.");
        }
    }

    public class PayInstallmentCommandHandler : IRequestHandler<PayInstallmentCommand, PaymentResultDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public PayInstallmentCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<PaymentResultDto> Handle(PayInstallmentCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;
            var idempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? Guid.NewGuid().ToString() : request.IdempotencyKey.Trim();

            // ── 0. Idempotency Check & Canonical Hash Normalization ──
            var canonicalAmount = request.Amount.ToString("F4", System.Globalization.CultureInfo.InvariantCulture);
            var accountIdStr = request.AccountId.HasValue ? request.AccountId.Value.ToString() : "";
            var rawHashInput = $"ScheduleId={request.InstallmentId}|Amount={canonicalAmount}|Method={request.PaymentMethod}|AccountId={accountIdStr}|BranchId={branchId}";
            
            string requestHash;
            using (var sha = SHA256.Create())
            {
                var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(rawHashInput));
                requestHash = Convert.ToHexString(bytes);
            }

            var existingIdempotency = await _context.IdempotencyRecords
                .FirstOrDefaultAsync(r => r.BranchId == branchId && r.OperationType == "InstallmentPayment" && r.IdempotencyKey == idempotencyKey, cancellationToken);

            if (existingIdempotency != null)
            {
                if (existingIdempotency.Status == "Processing")
                {
                    throw new InvalidOperationException("عملية التسديد هذه قيد المعالجة حالياً. يرجى الانتظار لحين اكتمالها.");
                }
                if (existingIdempotency.RequestHash != requestHash)
                {
                    throw new InvalidOperationException("IDEMPOTENCY_PAYLOAD_CONFLICT: تم استخدام مفتاح التكرار لعملية مختلفة بمبالغ أو حسابات مغايرة.");
                }
                if (existingIdempotency.Status == "Completed" && existingIdempotency.PaymentId.HasValue)
                {
                    var existingPayment = await _context.Payments
                        .FirstOrDefaultAsync(p => p.Id == existingIdempotency.PaymentId.Value, cancellationToken);

                    var existingPlan = await _context.InstallmentPlans
                        .Include(p => p.Installments)
                        .FirstOrDefaultAsync(p => p.Installments.Any(i => i.Id == request.InstallmentId), cancellationToken);

                    return new PaymentResultDto
                    {
                        Success = true,
                        PaymentId = existingPayment?.Id ?? existingIdempotency.PaymentId.Value,
                        ReceiptId = existingPayment?.Id ?? existingIdempotency.PaymentId.Value,
                        ReceiptNumber = existingPayment?.ReferenceNumber ?? $"RCPT-{existingIdempotency.PaymentId.Value}",
                        IdempotencyKey = idempotencyKey,
                        FinancialStatus = existingPayment?.Status ?? "Posted",
                        AccountingStatus = "Posted",
                        ReceiptStatus = "Ready",
                        ArchiveStatus = "Pending",
                        PostedAmount = existingPayment?.Amount ?? request.Amount,
                        Currency = existingPayment?.Currency ?? "IQD",
                        TotalPaid = existingPlan?.Installments.Sum(i => i.PaidAmount) ?? 0,
                        RemainingBalance = Math.Max(0, (existingPlan?.TotalPlanAmount ?? 0) - (existingPlan?.Installments.Sum(i => i.PaidAmount) ?? 0)),
                        PaidInstallmentCount = existingPlan?.Installments.Count(i => i.Status == "Paid") ?? 0,
                        RemainingInstallmentCount = existingPlan?.Installments.Count(i => i.Status != "Paid") ?? 0,
                        JournalEntryId = existingPayment?.JournalEntryId,
                        CreatedAt = existingPayment?.CreatedAt ?? DateTime.UtcNow
                    };
                }
            }

            // Reserve Idempotency Record
            var idempotencyRecord = existingIdempotency ?? new IdempotencyRecord
            {
                Id = Guid.NewGuid(),
                BranchId = branchId,
                OperationType = "InstallmentPayment",
                IdempotencyKey = idempotencyKey,
                RequestHash = requestHash,
                Status = "Processing",
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            };

            if (existingIdempotency == null)
            {
                _context.IdempotencyRecords.Add(idempotencyRecord);
            }
            else
            {
                idempotencyRecord.Status = "Processing";
                _context.IdempotencyRecords.Update(idempotencyRecord);
            }
            await _context.SaveChangesAsync(cancellationToken);

            // 1. Fetch & Verify Installment
            var installment = await _context.Installments
                .IgnoreQueryFilters()
                .Include(i => i.InstallmentPlan)
                .FirstOrDefaultAsync(i => i.Id == request.InstallmentId, cancellationToken);

            if (installment == null)
            {
                idempotencyRecord.Status = "FailedFinal";
                idempotencyRecord.FailureMessage = "القسط المحدد غير موجود.";
                await _context.SaveChangesAsync(cancellationToken);
                throw new InvalidOperationException("القسط المحدد غير موجود.");
            }

            if (branchId == Guid.Empty)
            {
                branchId = installment.BranchId;
            }

            if (installment.Status == "Paid")
            {
                idempotencyRecord.Status = "FailedFinal";
                idempotencyRecord.FailureMessage = "هذا القسط مسدد بالكامل بالفعل.";
                await _context.SaveChangesAsync(cancellationToken);
                throw new InvalidOperationException("هذا القسط مسدد بالكامل بالفعل.");
            }

            var plan = installment.InstallmentPlan;
            if (plan == null)
            {
                throw new InvalidOperationException("خطة التقسيط المرتبطة بالقسط غير موجودة.");
            }

            var isPurchasePlan = plan.PurchaseId.HasValue;
            Domain.Entities.SalesContract? contract = null;
            Domain.Entities.Customer? customer = null;
            Domain.Entities.Purchase? purchase = null;
            Domain.Entities.Supplier? supplier = null;
            Guid counterpartAccountId;
            string counterpartName;

            if (!isPurchasePlan)
            {
                contract = await _context.SalesContracts
                    .IgnoreQueryFilters()
                    .Include(sc => sc.Customer)
                    .FirstOrDefaultAsync(sc => sc.Id == plan.SalesContractId, cancellationToken);
            }

            if (installment.Status == "Cancelled" || plan.Status == "Cancelled" || (contract != null && contract.Status == "Cancelled"))
            {
                idempotencyRecord.Status = "FailedFinal";
                idempotencyRecord.FailureMessage = "لا يمكن تسديد دفعة قسط ملغاة أو مرتبطة بعقد بيع ملغي.";
                await _context.SaveChangesAsync(cancellationToken);
                throw new InvalidOperationException("لا يمكن تسديد دفعة قسط ملغاة أو مرتبطة بعقد بيع ملغي.");
            }

            if (!isPurchasePlan)
            {
                if (contract == null) throw new InvalidOperationException("عقد البيع المرتبط بالأقساط غير موجود.");

                customer = contract.Customer ?? await _context.Customers
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(c => c.Id == contract.CustomerId, cancellationToken);

                if (customer == null) throw new InvalidOperationException("العميل المرتبط بعقد البيع غير موجود.");

                if (customer.AccountId == Guid.Empty)
                {
                    var custAccount = await _context.Accounts
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(a => a.AccountCode == "1101" || a.AccountCode.StartsWith("110"), cancellationToken);
                    counterpartAccountId = custAccount?.Id ?? Guid.NewGuid();
                }
                else
                {
                    counterpartAccountId = customer.AccountId;
                }
                counterpartName = customer.FullName ?? customer.Name;
            }
            else
            {
                purchase = await _context.Purchases
                    .IgnoreQueryFilters()
                    .Include(p => p.Supplier)
                    .FirstOrDefaultAsync(p => p.Id == plan.PurchaseId, cancellationToken);

                if (purchase == null) throw new InvalidOperationException("فاتورة الشراء المرتبطة بالأقساط غير موجودة.");

                supplier = purchase.Supplier;
                if (supplier == null) throw new InvalidOperationException("المورد المرتبط بفاتورة الشراء غير موجود.");

                counterpartAccountId = supplier.AccountId;
                counterpartName = supplier.Name;
            }

            // Resolve receiving cash/bank account
            Account? cashBankAccount = null;
            if (request.AccountId.HasValue)
            {
                cashBankAccount = await _context.Accounts
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(a => a.Id == request.AccountId.Value, cancellationToken);
            }
            if (cashBankAccount == null && !string.IsNullOrWhiteSpace(request.DebitAccountCode))
            {
                cashBankAccount = await _context.Accounts
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(a => a.AccountCode == request.DebitAccountCode, cancellationToken);
            }

            if (cashBankAccount == null)
            {
                cashBankAccount = await _context.Accounts
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(a => a.AccountCode.StartsWith("111") || a.AccountCode.StartsWith("112"), cancellationToken);
            }

            if (cashBankAccount == null)
                throw new InvalidOperationException("حساب الصندوق/البنك المستلم غير موجود في هذا الفرع.");

            var deferredProfitAccount = !isPurchasePlan
                ? await _context.Accounts.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.AccountCode == "2301", cancellationToken)
                : null;

            var recognizedProfitAccount = !isPurchasePlan
                ? await _context.Accounts.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.AccountCode == "4102", cancellationToken)
                : null;

            var dbContext = _context as DbContext;
            if (dbContext == null) throw new InvalidOperationException("DbContext invalid.");

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                var amount = AccountingAmount.RoundMoney(request.Amount);
                var remainingInstallmentAmount = AccountingAmount.RoundMoney(installment.Amount - installment.PaidAmount);

                if (amount > remainingInstallmentAmount)
                {
                    installment.PaidAmount = installment.Amount;
                    installment.Status = "Paid";
                    installment.PaymentDate = DateTime.UtcNow;
                    installment.IsProfitRecognized = true;
                    _context.Installments.Update(installment);

                    var excess = AccountingAmount.RoundMoney(amount - remainingInstallmentAmount);
                    var subsequentInstallments = await _context.Installments
                        .IgnoreQueryFilters()
                        .Where(i => i.InstallmentPlanId == plan.Id && i.Id != installment.Id && i.Status != "Paid" && i.BranchId == branchId)
                        .OrderBy(i => i.InstallmentNumber)
                        .ToListAsync(cancellationToken);

                    decimal currentExcess = excess;
                    foreach (var subInst in subsequentInstallments)
                    {
                        if (currentExcess <= 0) break;
                        var subRemaining = AccountingAmount.RoundMoney(subInst.Amount - subInst.PaidAmount);
                        if (currentExcess >= subRemaining)
                        {
                            subInst.PaidAmount = subInst.Amount;
                            subInst.Status = "Paid";
                            subInst.PaymentDate = DateTime.UtcNow;
                            subInst.IsProfitRecognized = true;
                            currentExcess = AccountingAmount.RoundMoney(currentExcess - subRemaining);
                        }
                        else
                        {
                            subInst.PaidAmount = AccountingAmount.RoundMoney(subInst.PaidAmount + currentExcess);
                            subInst.Status = "PartiallyPaid";
                            currentExcess = 0;
                        }
                        _context.Installments.Update(subInst);
                    }
                }
                else
                {
                    installment.PaidAmount = AccountingAmount.RoundMoney(installment.PaidAmount + amount);
                    installment.Status = installment.PaidAmount >= installment.Amount ? "Paid" : "PartiallyPaid";
                    if (installment.Status == "Paid")
                    {
                        installment.PaymentDate = DateTime.UtcNow;
                        installment.IsProfitRecognized = true;
                    }
                    _context.Installments.Update(installment);
                }
                await _context.SaveChangesAsync(cancellationToken);

                if (contract != null)
                {
                    contract.RemainingBalance = AccountingAmount.RoundMoney(Math.Max(0, contract.RemainingBalance - amount));
                    _context.SalesContracts.Update(contract);
                }

                var allPaid = await _context.Installments
                    .IgnoreQueryFilters()
                    .Where(i => i.InstallmentPlanId == plan.Id && i.BranchId == branchId)
                    .AllAsync(i => i.Status == "Paid", cancellationToken);

                if (allPaid) { plan.Status = "Completed"; _context.InstallmentPlans.Update(plan); }
                await _context.SaveChangesAsync(cancellationToken);

                decimal recognizedProfit = 0;
                if (!isPurchasePlan && plan.TotalPlanAmount > 0 && plan.TotalProfit > 0)
                {
                    recognizedProfit = AccountingAmount.RoundMoney(amount * (plan.TotalProfit / plan.TotalPlanAmount));
                }

                var totalPaymentsCount = await _context.Payments.IgnoreQueryFilters().CountAsync(cancellationToken);
                var referenceNumber = $"REC-{DateTime.UtcNow:yyyyMMdd}-{totalPaymentsCount + 1:D5}";
                var invoiceRef = contract?.ContractNumber ?? purchase?.PurchaseNumber ?? "";

                var planCurrency = isPurchasePlan ? purchase?.Vehicle?.Currency : contract?.Vehicle?.Currency;

                var payment = new Payment
                {
                    Id = Guid.NewGuid(),
                    Type = isPurchasePlan ? PaymentType.Payment : PaymentType.Receipt,
                    Method = request.PaymentMethod,
                    Amount = amount,
                    Currency = planCurrency ?? "USD",
                    ReferenceNumber = referenceNumber,
                    Description = request.Notes ?? (isPurchasePlan
                        ? $"سداد القسط رقم {installment.InstallmentNumber} لفاتورة الشراء {invoiceRef} للمورد {counterpartName}"
                        : $"سداد القسط رقم {installment.InstallmentNumber} لعقد البيع {invoiceRef} للعميل {counterpartName}"),
                    AccountId = cashBankAccount.Id,
                    ContraAccountId = counterpartAccountId,
                    BranchId = branchId
                };
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync(cancellationToken);

                var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                var entryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";
                var vehicleId = isPurchasePlan ? purchase?.VehicleId : contract?.VehicleId;

                var journalEntry = new JournalEntry
                {
                    Id = Guid.NewGuid(),
                    EntryNumber = entryNumber,
                    EntryDate = DateTime.UtcNow,
                    Description = isPurchasePlan
                        ? $"قيد سداد قسط رقم {installment.InstallmentNumber} لفاتورة {invoiceRef} - سند: {referenceNumber}"
                        : $"قيد تحصيل القسط رقم {installment.InstallmentNumber} لعقد {invoiceRef} - سند: {referenceNumber}",
                    IsPosted = true,
                    BranchId = branchId,
                    ReferenceType = "Payment",
                    ReferenceId = payment.Id,
                    CreatedBy = _currentUserService.UserId
                };

                if (isPurchasePlan)
                {
                    journalEntry.Lines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = journalEntry.Id, AccountId = counterpartAccountId, Debit = amount, Credit = 0, Description = $"تخفيض المستحق للمورد {counterpartName}", VehicleId = vehicleId });
                    journalEntry.Lines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = journalEntry.Id, AccountId = cashBankAccount.Id, Debit = 0, Credit = amount, Description = $"صرف دفعة قسط للمورد {counterpartName}", VehicleId = vehicleId });
                }
                else
                {
                    journalEntry.Lines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = journalEntry.Id, AccountId = cashBankAccount.Id, Debit = amount, Credit = 0, Description = $"استلام مبالغ سداد قسط من العميل {counterpartName}", VehicleId = vehicleId });
                    journalEntry.Lines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = journalEntry.Id, AccountId = counterpartAccountId, Debit = 0, Credit = amount, Description = $"تخفيض مديونية العميل {counterpartName}", VehicleId = vehicleId });

                    if (recognizedProfit > 0 && deferredProfitAccount != null && recognizedProfitAccount != null)
                    {
                        journalEntry.Lines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = journalEntry.Id, AccountId = deferredProfitAccount.Id, Debit = recognizedProfit, Credit = 0, Description = $"تخفيض أرباح التقسيط المؤجلة", VehicleId = vehicleId });
                        journalEntry.Lines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = journalEntry.Id, AccountId = recognizedProfitAccount.Id, Debit = 0, Credit = recognizedProfit, Description = $"الاعتراف بأرباح التقسيط المحققة", VehicleId = vehicleId });
                    }
                }

                _context.JournalEntries.Add(journalEntry);
                await _context.SaveChangesAsync(cancellationToken);

                payment.JournalEntryId = journalEntry.Id;
                _context.Payments.Update(payment);

                // Update Idempotency Record to Completed
                idempotencyRecord.Status = "Completed";
                idempotencyRecord.PaymentId = payment.Id;
                idempotencyRecord.ReceiptId = payment.Id;
                idempotencyRecord.CompletedAt = DateTime.UtcNow;
                _context.IdempotencyRecords.Update(idempotencyRecord);

                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                var totalPaid = plan.Installments.Sum(i => i.PaidAmount);
                var remainingBalance = Math.Max(0, plan.TotalPlanAmount - totalPaid);
                var nextUnpaid = plan.Installments.Where(i => i.Status != "Paid").OrderBy(i => i.InstallmentNumber).FirstOrDefault();

                return new PaymentResultDto
                {
                    Success = true,
                    PaymentId = payment.Id,
                    ReceiptId = payment.Id,
                    ReceiptNumber = referenceNumber,
                    IdempotencyKey = idempotencyKey,
                    FinancialStatus = "Posted",
                    AccountingStatus = "Posted",
                    ReceiptStatus = "Ready",
                    ArchiveStatus = "Pending",
                    PostedAmount = amount,
                    Currency = payment.Currency,
                    TotalPaid = totalPaid,
                    RemainingBalance = remainingBalance,
                    PaidInstallmentCount = plan.Installments.Count(i => i.Status == "Paid"),
                    RemainingInstallmentCount = plan.Installments.Count(i => i.Status != "Paid"),
                    NextInstallmentDate = nextUnpaid?.DueDate.ToString("yyyy-MM-dd"),
                    JournalEntryId = journalEntry.Id,
                    JournalEntryNumber = entryNumber,
                    CreatedAt = payment.CreatedAt
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                idempotencyRecord.Status = "FailedRetryable";
                idempotencyRecord.FailureMessage = ex.Message;
                await _context.SaveChangesAsync(cancellationToken);
                throw;
            }
        }
    }
}
