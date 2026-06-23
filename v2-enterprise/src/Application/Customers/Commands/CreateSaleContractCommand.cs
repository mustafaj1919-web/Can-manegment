using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Common.Helpers;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Application.Customers.Commands
{
    public class CreateSaleContractCommand : IRequest<Guid>
    {
        public Guid CustomerId { get; set; }
        public Guid VehicleId { get; set; }
        public decimal SalePrice { get; set; }
        public decimal TaxAmount { get; set; } = 0;
        public decimal RegistrationFees { get; set; } = 0;
        public decimal Discount { get; set; } = 0;
        public decimal DownPayment { get; set; } = 0;
        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash; // Cash, Installment
        public string? CustomerVatNumber { get; set; } // الرقم الضريبي للعميل
        public Guid? SalesRepId { get; set; } // مندوب المبيعات (موظف) المسؤول عن العقد

        // حقول التقسيط
        public int InstallmentPeriodMonths { get; set; } = 0;
        public decimal ProfitRatePercentage { get; set; } = 0; // نسبة الربح المضافة للتقسيط
        public DateTime? InstallmentStartDate { get; set; } // تاريخ بدء الأقساط (اختياري - افتراضي اليوم)
    }

    public class CreateSaleContractCommandValidator : AbstractValidator<CreateSaleContractCommand>
    {
        public CreateSaleContractCommandValidator()
        {
            RuleFor(x => x.CustomerId).NotEmpty().WithMessage("العميل مطلوب.");
            RuleFor(x => x.VehicleId).NotEmpty().WithMessage("السيارة مطلوبة.");
            RuleFor(x => x.SalePrice).GreaterThan(0).WithMessage("سعر البيع يجب أن يكون أكبر من صفر.");
            RuleFor(x => x.DownPayment).GreaterThanOrEqualTo(0).WithMessage("الدفعة الأولى لا يمكن أن تكون سالبة.");
            RuleFor(x => x.PaymentMethod).IsInEnum().WithMessage("طريقة الدفع غير صالحة.");
        }
    }

    public class CreateSaleContractCommandHandler : IRequestHandler<CreateSaleContractCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        private readonly IEInvoiceService _eInvoiceService;

        public CreateSaleContractCommandHandler(
            IApplicationDbContext context, 
            ICurrentUserService currentUserService,
            IEInvoiceService eInvoiceService)
        {
            _context = context;
            _currentUserService = currentUserService;
            _eInvoiceService = eInvoiceService;
        }

        public async Task<Guid> Handle(CreateSaleContractCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // التحقق من وجود الفرع وتأكيد بياناته الضريبية
            var branch = await _context.Branches
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(b => b.Id == branchId, cancellationToken);
            if (branch == null)
            {
                throw new InvalidOperationException("الفرع الحالي غير موجود في النظام.");
            }

            // 1. التحقق من وجود العميل
            var customer = await _context.Customers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == request.CustomerId && c.BranchId == branchId, cancellationToken);

            if (customer == null)
            {
                throw new InvalidOperationException("العميل المحدد غير موجود أو لا ينتمي لهذا الفرع.");
            }

            // تحديث الرقم الضريبي للعميل إذا تم إدخاله وكان فارغاً أو متغيراً
            if (!string.IsNullOrWhiteSpace(request.CustomerVatNumber) && customer.VatNumber != request.CustomerVatNumber)
            {
                customer.VatNumber = request.CustomerVatNumber;
                _context.Customers.Update(customer);
                await _context.SaveChangesAsync(cancellationToken);
            }

            // 2. التحقق من وجود السيارة وحالتها
            var vehicle = await _context.Vehicles
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(v => v.Id == request.VehicleId && v.BranchId == branchId, cancellationToken);

            if (vehicle == null)
            {
                throw new InvalidOperationException("السيارة المحددة غير موجودة أو لا تنتمي لهذا الفرع.");
            }

            if (vehicle.IsSold || vehicle.Status == "Sold")
            {
                throw new InvalidOperationException("لا يمكن بيع السيارة لأنها مباعة مسبقاً.");
            }

            // 3. التحقق المسبق من وجود جميع الحسابات المحاسبية المطلوبة (Fail Fast لمنع بقاء الكائنات معدلة بالذاكرة)
            // حساب مخزون السيارات: 1201
            var inventoryAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "1201" && a.BranchId == branchId, cancellationToken);

            // حساب إيرادات المبيعات: 4101
            var salesRevenueAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "4101" && a.BranchId == branchId, cancellationToken);

            // حساب تكلفة السيارات المباعة COGS: 5101
            var cogsAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "5101" && a.BranchId == branchId, cancellationToken);

            // ضريبة المبيعات المستحقة: 2202
            var salesTaxAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "2202" && a.BranchId == branchId, cancellationToken);

            // أمانات رسوم التسجيل: 2203
            var registrationFeesAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "2203" && a.BranchId == branchId, cancellationToken);

            // إيرادات أقساط مؤجلة: 2301
            var deferredProfitAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "2301" && a.BranchId == branchId, cancellationToken);

            if (inventoryAccount == null || salesRevenueAccount == null || cogsAccount == null ||
                salesTaxAccount == null || registrationFeesAccount == null)
            {
                throw new InvalidOperationException("الحسابات المحاسبية الأساسية للمبيعات غير متوفرة في هذا الفرع.");
            }

            var salePrice = AccountingAmount.RoundMoney(request.SalePrice);
            var taxAmount = AccountingAmount.RoundMoney(request.TaxAmount);
            var registrationFees = AccountingAmount.RoundMoney(request.RegistrationFees);
            var discount = AccountingAmount.RoundMoney(request.Discount);
            var downPayment = AccountingAmount.RoundMoney(request.DownPayment);
            var bookValue = AccountingAmount.RoundMoney(vehicle.BookValue);

            var netPrice = AccountingAmount.RoundMoney(salePrice + taxAmount + registrationFees - discount);
            var remainingBalance = AccountingAmount.RoundMoney(netPrice - downPayment);

            if (request.PaymentMethod == PaymentMethod.Cash && remainingBalance > 0)
            {
                throw new InvalidOperationException("البيع النقدي يتطلب سداد كامل قيمة الصافي كدفعة أولى.");
            }

            if (remainingBalance < 0)
            {
                throw new InvalidOperationException("الدفعة المقدمة أكبر من صافي قيمة الفاتورة.");
            }

            if (remainingBalance > 0 && deferredProfitAccount == null)
            {
                throw new InvalidOperationException("حساب إيرادات أقساط مؤجلة (2301) غير متوفر في هذا الفرع.");
            }

            var profit = AccountingAmount.RoundMoney(salePrice - bookValue);

            var dbContext = _context as DbContext;
            if (dbContext == null)
            {
                throw new InvalidOperationException("DbContext context is invalid.");
            }

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // 4. إنشاء عقد البيع وحفظه أولاً لتأمين المفاتيح الأجنبية للخطط والأقساط
                var totalSalesCount = await _context.SalesContracts.IgnoreQueryFilters().CountAsync(cancellationToken);
                var contractNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{totalSalesCount + 1:D5}";

                var uuid = Guid.NewGuid().ToString();

                var contract = new SalesContract
                {
                    Id = Guid.NewGuid(),
                    ContractNumber = contractNumber,
                    CustomerId = customer.Id,
                    VehicleId = vehicle.Id,
                    SaleDate = DateTime.UtcNow,
                    SalePrice = salePrice,
                    TaxAmount = taxAmount,
                    RegistrationFees = registrationFees,
                    Discount = discount,
                    NetPrice = netPrice,
                    DownPayment = downPayment,
                    RemainingBalance = remainingBalance,
                    Profit = profit,
                    PaymentMethod = request.PaymentMethod,
                    Status = "Active",
                    BranchId = branchId,
                    SalesRepId = request.SalesRepId,
                    EInvoiceUuid = uuid,
                    EInvoiceStatus = "Pending"
                };

                // إرفاق السيارة مؤقتاً لتسهيل توليد الـ XML قبل التخزين الفعلي
                contract.Vehicle = vehicle;

                // توليد الـ QR Code الضريبي باستخدام ترميز TLV
                var sellerName = branch.TaxName ?? branch.Name;
                var sellerVat = branch.VatNumber ?? "300000000000003";
                contract.EInvoiceQrCode = _eInvoiceService.GenerateTlvQrCodeBase64(
                    sellerName,
                    sellerVat,
                    contract.SaleDate,
                    netPrice,
                    taxAmount);

                // توليد الفاتورة بصيغة UBL XML وحساب الهاش
                var xmlContent = _eInvoiceService.GenerateInvoiceXml(contract, branch, customer);
                contract.EInvoiceXmlHash = _eInvoiceService.CalculateXmlHash(xmlContent);

                // تقديم الفاتورة إلى خادم المصلحة الضريبية (محاكي)
                var submissionResult = await _eInvoiceService.SubmitInvoiceToPortalAsync(contract, xmlContent);
                if (submissionResult.Success)
                {
                    contract.EInvoiceStatus = "Sent";
                    contract.EInvoiceError = null;
                }
                else
                {
                    contract.EInvoiceStatus = "Failed";
                    contract.EInvoiceError = submissionResult.Message;
                }

                // مسح المرجع المؤقت للسيارة لتجنب إعادة الإدراج المزدوج
                contract.Vehicle = null;

                _context.SalesContracts.Add(contract);
                await _context.SaveChangesAsync(cancellationToken);

                // 5. تعديل حالة السيارة
                vehicle.IsSold = true;
                vehicle.Status = "Sold";
                _context.Vehicles.Update(vehicle);
                await _context.SaveChangesAsync(cancellationToken);

                // 6. التعامل مع خطة التقسيط وجدول الأقساط بعد حفظ العقد
                decimal totalProfitMarkup = 0;
                InstallmentPlan? plan = null;

                if (request.PaymentMethod != PaymentMethod.Cash && remainingBalance > 0)
                {
                    if (request.InstallmentPeriodMonths <= 0)
                    {
                        throw new InvalidOperationException("فترة التقسيط بالأشهر مطلوبة لعمليات التقسيط.");
                    }

                    // احتساب أرباح التقسيط المضافة
                    totalProfitMarkup = AccountingAmount.RoundMoney(remainingBalance * (request.ProfitRatePercentage / 100));
                    var totalPlanAmount = AccountingAmount.RoundMoney(remainingBalance + totalProfitMarkup);
                    var monthlyAmount = AccountingAmount.RoundMoney(totalPlanAmount / request.InstallmentPeriodMonths);

                    plan = new InstallmentPlan
                    {
                        Id = Guid.NewGuid(),
                        SalesContractId = contract.Id,
                        TotalAmount = remainingBalance,
                        DownPayment = downPayment,
                        InstallmentPeriodMonths = request.InstallmentPeriodMonths,
                        ProfitRatePercentage = request.ProfitRatePercentage,
                        TotalProfit = totalProfitMarkup,
                        TotalPlanAmount = totalPlanAmount,
                        MonthlyInstallmentAmount = monthlyAmount,
                        Status = "Active",
                        BranchId = branchId
                    };

                    _context.InstallmentPlans.Add(plan);
                    await _context.SaveChangesAsync(cancellationToken);

                    // توليد جدول الأقساط
                    var baseDate = request.InstallmentStartDate.HasValue
                        ? DateTime.SpecifyKind(request.InstallmentStartDate.Value, DateTimeKind.Utc)
                        : DateTime.UtcNow;
                    for (int i = 1; i <= request.InstallmentPeriodMonths; i++)
                    {
                        var installment = new Installment
                        {
                            Id = Guid.NewGuid(),
                            InstallmentPlanId = plan.Id,
                            InstallmentNumber = i,
                            DueDate = baseDate.AddMonths(i),
                            Amount = monthlyAmount,
                            PaidAmount = 0,
                            Status = "Pending",
                            BranchId = branchId
                        };
                        _context.Installments.Add(installment);
                    }
                    await _context.SaveChangesAsync(cancellationToken);

                    // تحديث المبلغ المتبقي على العقد ليشمل أرباح التقسيط المضافة
                    contract.RemainingBalance = totalPlanAmount;
                    _context.SalesContracts.Update(contract);
                    await _context.SaveChangesAsync(cancellationToken);
                }

                // 7. إنشاء القيد المحاسبي المتوازن لعملية البيع
                var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                var entryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

                var journalEntry = new JournalEntry
                {
                    Id = Guid.NewGuid(),
                    EntryNumber = entryNumber,
                    EntryDate = DateTime.UtcNow,
                    Description = $"قيد إثبات عقد بيع سيارة رقم: {contractNumber} - شاصي: {vehicle.ChassisNumber}",
                    IsPosted = true,
                    BranchId = branchId,
                    ReferenceType = "SaleContract",
                    ReferenceId = contract.Id,
                    CreatedBy = _currentUserService.UserId
                };

                // أ. الطرف المدين:
                // 1. الدفعة الأولى (صندوق النقدية 1101)
                if (downPayment > 0)
                {
                    var cashAccount = await _context.Accounts
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(a => a.AccountCode == "111001" && a.BranchId == branchId, cancellationToken);
                    if (cashAccount == null) throw new InvalidOperationException("حساب الصندوق (111001) غير موجود.");

                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = journalEntry.Id,
                        AccountId = cashAccount.Id,
                        Debit = downPayment,
                        Credit = 0,
                        Description = $"الدفعة المقدمة لعقد البيع {contractNumber}"
                    });
                }

                // 2. حساب العميل الفرعي بالباقي + الأرباح المؤجلة
                if (remainingBalance > 0)
                {
                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = journalEntry.Id,
                        AccountId = customer.AccountId,
                        Debit = AccountingAmount.RoundMoney(remainingBalance + totalProfitMarkup),
                        Credit = 0,
                        Description = $"مديونية متبقية لعقد البيع بالتقسيط {contractNumber}"
                    });
                }

                // 3. حساب COGS بقيمة السيارة الدفترية
                journalEntry.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = cogsAccount.Id,
                    Debit = bookValue,
                    Credit = 0,
                    Description = $"تكلفة السيارة المباعة {vehicle.Model}"
                });

                // ب. الطرف الدائن:
                // 1. حساب إيرادات المبيعات
                journalEntry.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = salesRevenueAccount.Id,
                    Debit = 0,
                    Credit = AccountingAmount.RoundMoney(salePrice - discount),
                    Description = $"إيراد بيع سيارة {vehicle.Model} - عقد {contractNumber}"
                });

                // 2. حساب ضريبة المبيعات المستحقة: 2202
                if (taxAmount > 0)
                {
                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = journalEntry.Id,
                        AccountId = salesTaxAccount.Id,
                        Debit = 0,
                        Credit = taxAmount,
                        Description = $"ضريبة مبيعات مستحقة لعقد البيع {contractNumber}"
                    });
                }

                // 3. حساب أمانات رسوم التسجيل: 2203
                if (registrationFees > 0)
                {
                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = journalEntry.Id,
                        AccountId = registrationFeesAccount.Id,
                        Debit = 0,
                        Credit = registrationFees,
                        Description = $"أمانات رسوم التسجيل لعقد البيع {contractNumber}"
                    });
                }

                // 4. حساب إيرادات الأقساط المؤجلة: 2301
                if (totalProfitMarkup > 0)
                {
                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = journalEntry.Id,
                        AccountId = deferredProfitAccount!.Id,
                        Debit = 0,
                        Credit = totalProfitMarkup,
                        Description = $"أرباح تقسيط مؤجلة غير محققة لعقد البيع {contractNumber}"
                    });
                }

                // 5. حساب المخزون لتخفيض قيمة السيارة الدفترية
                journalEntry.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = inventoryAccount.Id,
                    Debit = 0,
                    Credit = bookValue,
                    Description = $"تخفيض المخزون لبيع سيارة {vehicle.Model}"
                });

                if (!journalEntry.IsBalanced)
                {
                    throw new InvalidOperationException("القيد المحاسبي المولد للمبيعات غير متوازن.");
                }

                _context.JournalEntries.Add(journalEntry);
                await _context.SaveChangesAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);
                return contract.Id;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }
}
