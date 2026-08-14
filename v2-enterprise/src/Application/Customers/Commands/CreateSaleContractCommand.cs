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

        // حقول ملكية المركبة قبل البيع
        public VehicleOwnershipType OwnershipType { get; set; } = VehicleOwnershipType.COMPANY;
        public string? OwnerPersonName { get; set; }
        public string? OwnerPersonPhone { get; set; }
        public string? OwnerPersonIdNumber { get; set; }
        public string? OwnerNotes { get; set; }

        public Guid? SupplierId { get; set; }
        public string? SupplierReference { get; set; }
        public DateTime? SupplyDate { get; set; }

        // حقول الشروط والملاحظات
        public string? TermsTemplateId { get; set; }
        public string? DocumentNotes { get; set; }

        // حقول التقسيط
        public int InstallmentPeriodMonths { get; set; } = 0;
        public decimal? CustomMonthlyInstallmentAmount { get; set; } = null;
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
            RuleFor(x => x.OwnershipType).IsInEnum().WithMessage("نوع ملكية المركبة غير صالح.");

            When(x => x.OwnershipType == VehicleOwnershipType.PERSON, () =>
            {
                RuleFor(x => x.OwnerPersonName).NotEmpty().WithMessage("اسم مالك المركبة الشخص مطلوب لملكية الأشخاص.");
                RuleFor(x => x.SupplierId).Null().WithMessage("لا يمكن ربط مورد عند تحديد ملكية شخص.");
            });

            When(x => x.OwnershipType == VehicleOwnershipType.SUPPLIER, () =>
            {
                RuleFor(x => x.SupplierId).NotEmpty().WithMessage("المورد مطلوب عند تحديد ملكية المورد.");
                RuleFor(x => x.OwnerPersonName).Must(string.IsNullOrWhiteSpace).WithMessage("لا يمكن إدخال اسم مالك شخص عند تحديد ملكية المورد.");
            });

            When(x => x.OwnershipType == VehicleOwnershipType.COMPANY, () =>
            {
                RuleFor(x => x.OwnerPersonName).Must(string.IsNullOrWhiteSpace).WithMessage("لا يمكن إدخال اسم مالك شخص عند تحديد ملكية الشركة.");
                RuleFor(x => x.SupplierId).Null().WithMessage("لا يمكن ربط مورد عند تحديد ملكية الشركة.");
            });
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
            // حساب المخزون (1201) وتكلفة البضاعة المباعة يُخفَّضان بسعر الشراء الأساسي الثابت فقط،
            // بينما المصاريف الإضافية (شحن/تخليص/فحص/تجهيز) تُحمَّل كمصروفات مستقلة لحظة إضافتها
            var inventoryRelief = AccountingAmount.RoundMoney(vehicle.PurchaseCost);

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

            // احتساب أرباح وخطة التقسيط مسبقاً قبل إنشاء العقد
            decimal totalProfitMarkup = 0;
            decimal totalPlanAmount = remainingBalance;
            int periodMonths = request.InstallmentPeriodMonths;
            decimal monthlyAmount = 0m;
            DateTime? baseDate = null;

            if (request.PaymentMethod != PaymentMethod.Cash && remainingBalance > 0)
            {
                totalProfitMarkup = AccountingAmount.RoundMoney(remainingBalance * (request.ProfitRatePercentage / 100));
                totalPlanAmount = AccountingAmount.RoundMoney(remainingBalance + totalProfitMarkup);

                if (request.CustomMonthlyInstallmentAmount.HasValue && request.CustomMonthlyInstallmentAmount.Value > 0)
                {
                    var customAmount = AccountingAmount.RoundMoney(request.CustomMonthlyInstallmentAmount.Value);
                    periodMonths = (int)Math.Ceiling(totalPlanAmount / customAmount);
                    if (periodMonths > 240)
                    {
                        throw new InvalidOperationException("فترة التقسيط المحتسبة طويلة جداً (أكثر من 20 سنة). يرجى زيادة قيمة القسط الشهري.");
                    }
                    monthlyAmount = customAmount;
                }
                else
                {
                    if (periodMonths <= 0)
                    {
                        throw new InvalidOperationException("فترة التقسيط بالأشهر مطلوبة لعمليات التقسيط.");
                    }
                    if (periodMonths > 240)
                    {
                        throw new InvalidOperationException("فترة التقسيط لا يمكن أن تتجاوز 240 شهراً (20 سنة).");
                    }
                    monthlyAmount = AccountingAmount.RoundMoney(totalPlanAmount / periodMonths);
                }

                baseDate = request.InstallmentStartDate.HasValue
                    ? DateTime.SpecifyKind(request.InstallmentStartDate.Value, DateTimeKind.Utc)
                    : DateTime.UtcNow;
            }

            // 3.5. جلب بيانات الموظفين والموردين للربط والتوثيق بالنشر المعتمد
            Guid? prepUserId = null;
            User? currentUser = null;
            if (Guid.TryParse(_currentUserService.UserId, out var parsedUserId))
            {
                currentUser = await _context.Users
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Id == parsedUserId, cancellationToken);
                if (currentUser != null) prepUserId = currentUser.Id;
            }

            Employee? salesRep = null;
            if (request.SalesRepId.HasValue)
            {
                salesRep = await _context.Employees
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(e => e.Id == request.SalesRepId.Value, cancellationToken);
            }

            Supplier? supplier = null;
            if (request.OwnershipType == VehicleOwnershipType.SUPPLIER && request.SupplierId.HasValue)
            {
                supplier = await _context.Suppliers
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(s => s.Id == request.SupplierId.Value, cancellationToken);

                if (supplier == null)
                {
                    throw new InvalidOperationException("المورد المحدد غير موجود.");
                }
            }

            var dbContext = _context as DbContext;
            if (dbContext == null)
            {
                throw new InvalidOperationException("DbContext context is invalid.");
            }

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // 4. إنشاء عقد البيع والوثيقة الرسمية بجميع اللقطات والتأطير القانوني
                var totalSalesCount = await _context.SalesContracts.IgnoreQueryFilters().CountAsync(cancellationToken);
                var contractSeq = totalSalesCount + 1;
                var contractNumber = $"SC-{DateTime.UtcNow:yyyy}-{contractSeq:D6}";
                var docNumber = $"SALE-{DateTime.UtcNow:yyyy}-{contractSeq:D6}-R1";

                var randomBytes = new byte[8];
                System.Security.Cryptography.RandomNumberGenerator.Fill(randomBytes);
                var verificationCode = "vsc_" + Convert.ToHexString(randomBytes).ToLowerInvariant();

                var receiptNum = request.PaymentMethod == PaymentMethod.Cash ? $"REC-{DateTime.UtcNow:yyyyMMdd}-{contractSeq:D5}" : null;

                var uuid = Guid.NewGuid().ToString();

                var contract = new SalesContract
                {
                    Id = Guid.NewGuid(),
                    ContractNumber = contractNumber,
                    DocumentNumber = docNumber,
                    DocumentRevision = 1,
                    ReceiptNumber = receiptNum,
                    DocumentStatus = SaleDocumentStatus.FINALIZED,
                    VerificationCode = verificationCode,

                    CustomerId = customer.Id,
                    BuyerNameSnapshot = customer.FullName ?? customer.Name,
                    BuyerPhoneSnapshot = customer.Phone,
                    BuyerIdNumberSnapshot = customer.IdNumber,
                    BuyerAddressSnapshot = customer.Address,
                    BuyerVatNumberSnapshot = customer.VatNumber,

                    VehicleId = vehicle.Id,
                    VehicleBrandSnapshot = vehicle.Brand,
                    VehicleModelSnapshot = vehicle.Model,
                    VehicleYearSnapshot = vehicle.Year,
                    VehicleColorSnapshot = vehicle.Color,
                    VinSnapshot = vehicle.ChassisNumber,
                    EngineNumberSnapshot = vehicle.EngineNumber,
                    PlateNumberSnapshot = vehicle.PlateNumber,
                    ImportCountrySnapshot = vehicle.ImportCountry,

                    OwnershipType = request.OwnershipType,
                    OwnerPersonNameSnapshot = request.OwnershipType == VehicleOwnershipType.PERSON ? request.OwnerPersonName : null,
                    OwnerPersonPhoneSnapshot = request.OwnershipType == VehicleOwnershipType.PERSON ? request.OwnerPersonPhone : null,
                    OwnerPersonIdNumberSnapshot = request.OwnershipType == VehicleOwnershipType.PERSON ? request.OwnerPersonIdNumber : null,
                    OwnerNotes = request.OwnershipType == VehicleOwnershipType.PERSON ? request.OwnerNotes : null,

                    SupplierId = request.OwnershipType == VehicleOwnershipType.SUPPLIER ? supplier?.Id : null,
                    SupplierNameSnapshot = request.OwnershipType == VehicleOwnershipType.SUPPLIER ? supplier?.Name : null,
                    SupplierReference = request.OwnershipType == VehicleOwnershipType.SUPPLIER ? request.SupplierReference : null,
                    SupplyDate = request.OwnershipType == VehicleOwnershipType.SUPPLIER ? request.SupplyDate : null,

                    CompanyNameSnapshot = request.OwnershipType == VehicleOwnershipType.COMPANY ? "شركة الأصدقاء لتجارة السيارات" : null,
                    CompanyRegistrationReference = request.OwnershipType == VehicleOwnershipType.COMPANY ? (branch.VatNumber ?? "300000000000003") : null,

                    SaleDate = DateTime.UtcNow,
                    FinalizedAt = DateTime.UtcNow,
                    FinalizedByUserId = prepUserId != Guid.Empty ? prepUserId : null,

                    SalePrice = salePrice,
                    TaxAmount = taxAmount,
                    RegistrationFees = registrationFees,
                    Discount = discount,
                    NetPrice = netPrice,
                    DownPayment = downPayment,
                    RemainingBalance = totalPlanAmount,
                    PaidAmountAtIssue = downPayment,
                    RemainingAmountAtIssue = totalPlanAmount,
                    CostBasis = vehicle.BookValue,
                    Profit = profit,
                    Currency = vehicle.Currency,
                    PaymentMethod = request.PaymentMethod,
                    
                    InstallmentCountSnapshot = request.PaymentMethod != PaymentMethod.Cash && remainingBalance > 0 ? periodMonths : null,
                    MonthlyInstallmentAmountSnapshot = request.PaymentMethod != PaymentMethod.Cash && remainingBalance > 0 ? monthlyAmount : null,
                    FirstDueDateSnapshot = baseDate,
                    
                    PreparedByUserId = prepUserId,
                    PreparedByNameSnapshot = currentUser?.FullName ?? "منظّم العقد",
                    PreparedByRoleSnapshot = "منظّم العقد",
                    SalesRepId = request.SalesRepId,
                    SalespersonNameSnapshot = salesRep?.FullName,

                    TermsTemplateId = request.TermsTemplateId ?? "STD-2026",
                    TermsTemplateVersion = "1.0",
                    TermsContentSnapshot = "1. أقر الطرف الأول بأن المركبة المبينة في هذا العقد خالية من الشوائب والالتزامات غير المفصح عنها.\n2. أقر الطرف الثاني بمعاينة المركبة معاينة نافية للجهالة وقبل بحالتها الفنية والقانونية الراهنة.\n3. تنتقل حيازة المركبة فور توقيع العقد واستلام المبلغ المتفق عليه حسب الدفعة المسجلة.\n4. يلتزم الطرفان بتسليم المستندات والسنوية والملحقات القياسية عند التسليم الرسمية.\n5. حرر هذا العقد رسمياً ووثق في سجلات شركة الأصدقاء لتجارة السيارات.",
                    DocumentNotes = request.DocumentNotes,

                    BranchId = branchId,
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
                InstallmentPlan? plan = null;

                if (request.PaymentMethod != PaymentMethod.Cash && remainingBalance > 0)
                {
                    plan = new InstallmentPlan
                    {
                        Id = Guid.NewGuid(),
                        SalesContractId = contract.Id,
                        TotalAmount = remainingBalance,
                        DownPayment = downPayment,
                        InstallmentPeriodMonths = periodMonths,
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
                    var actualBaseDate = baseDate ?? DateTime.UtcNow;

                    for (int i = 1; i <= periodMonths; i++)
                    {
                        decimal installmentAmount = monthlyAmount;

                        // تسوية القسط الأخير لضمان مطابقة الإجمالي
                        if (i == periodMonths)
                        {
                            var previousSum = monthlyAmount * (periodMonths - 1);
                            installmentAmount = totalPlanAmount - previousSum;
                        }

                        var dueDate = request.InstallmentStartDate.HasValue ? actualBaseDate.AddMonths(i - 1) : actualBaseDate.AddMonths(i);

                        var installment = new Installment
                        {
                            Id = Guid.NewGuid(),
                            InstallmentPlanId = plan.Id,
                            InstallmentNumber = i,
                            DueDate = dueDate,
                            Amount = installmentAmount,
                            PaidAmount = 0,
                            Status = "Pending",
                            BranchId = branchId
                        };
                        _context.Installments.Add(installment);
                    }
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
                        Description = $"الدفعة المقدمة لعقد البيع {contractNumber}",
                        VehicleId = vehicle.Id
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
                        Description = $"مديونية متبقية لعقد البيع بالتقسيط {contractNumber}",
                        VehicleId = vehicle.Id
                    });
                }

                // 3. حساب COGS بسعر الشراء الأساسي الثابت للسيارة
                journalEntry.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = cogsAccount.Id,
                    Debit = inventoryRelief,
                    Credit = 0,
                    Description = $"تكلفة السيارة المباعة {vehicle.Model}",
                    VehicleId = vehicle.Id
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
                    Description = $"إيراد بيع سيارة {vehicle.Model} - عقد {contractNumber}",
                    VehicleId = vehicle.Id
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
                        Description = $"ضريبة مبيعات مستحقة لعقد البيع {contractNumber}",
                        VehicleId = vehicle.Id
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
                        Description = $"أمانات رسوم التسجيل لعقد البيع {contractNumber}",
                        VehicleId = vehicle.Id
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
                        Description = $"أرباح تقسيط مؤجلة غير محققة لعقد البيع {contractNumber}",
                        VehicleId = vehicle.Id
                    });
                }

                // 5. حساب المخزون لتخفيض سعر الشراء الأساسي للسيارة (ثابت، بدون المصاريف الإضافية)
                journalEntry.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = journalEntry.Id,
                    AccountId = inventoryAccount.Id,
                    Debit = 0,
                    Credit = inventoryRelief,
                    Description = $"تخفيض المخزون لبيع سيارة {vehicle.Model}",
                    VehicleId = vehicle.Id
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
