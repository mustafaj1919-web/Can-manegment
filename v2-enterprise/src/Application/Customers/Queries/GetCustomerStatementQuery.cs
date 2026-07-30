using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Application.Customers.Queries
{
    public class GetCustomerStatementQuery : IRequest<CustomerStatementDto>
    {
        public Guid CustomerId { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    public class CustomerSummaryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string CustomerType { get; set; } = string.Empty;
    }

    public class StatementSummaryDto
    {
        public int SalesCount { get; set; }
        public decimal TotalSalesAmount { get; set; }
        public decimal TotalPaidAmount { get; set; }
        public decimal TotalRemaining { get; set; }
        public decimal TotalOverdue { get; set; }
        public decimal AccountBalance { get; set; }
        public string PositionStatus { get; set; } = "Zero"; // Debit | Credit | Zero
        public string PositionLabel { get; set; } = "الحساب متزن";
        public DateTime? LastPaymentDate { get; set; }
        public string Currency { get; set; } = "IQD";
    }

    public class StatementScheduleDto
    {
        public Guid Id { get; set; }
        public int InstallmentNumber { get; set; }
        public DateTime? DueDate { get; set; }
        public decimal Amount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public string Currency { get; set; } = "IQD";
        public string Status { get; set; } = string.Empty;
        public DateTime? PaymentDate { get; set; }
    }

    public class StatementInstallmentPlanDto
    {
        public Guid Id { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public string Currency { get; set; } = "IQD";
        public int? NumberOfMonths { get; set; }
        public decimal InstallmentAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal OverdueAmount { get; set; }
        public List<StatementScheduleDto> Schedules { get; set; } = new();
    }

    public class StatementPaymentDto
    {
        public Guid Id { get; set; }
        public string? PaymentMethod { get; set; }
        public DateTime? PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "IQD";
    }

    public class StatementSaleItemDto
    {
        public Guid Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateTime? SaleDate { get; set; }
        public string? CarName { get; set; }
        public string? CarVin { get; set; }
        public decimal SellingPrice { get; set; }
        public string Currency { get; set; } = "IQD";
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public bool HasInstallment { get; set; }
        public StatementInstallmentPlanDto? InstallmentPlan { get; set; }
        public List<StatementPaymentDto> Payments { get; set; } = new();
    }

    public class StatementCustomerPurchaseDto
    {
        public Guid Id { get; set; }
        public string PurchaseNumber { get; set; } = string.Empty;
        public DateTime PurchaseDate { get; set; }
        public string VehicleName { get; set; } = string.Empty;
        public string ChassisNumber { get; set; } = string.Empty;
        public decimal PurchaseCost { get; set; }
        public decimal AmountPaid { get; set; }
        public decimal OutstandingAmount => PurchaseCost - AmountPaid;
        public string Currency { get; set; } = "IQD";
        public string Status { get; set; } = "Active";
    }

    public class CustomerStatementDto
    {
        public CustomerSummaryDto Customer { get; set; } = null!;
        public StatementSummaryDto Summary { get; set; } = null!;
        public List<StatementSaleItemDto> Sales { get; set; } = new();
        public List<StatementCustomerPurchaseDto> CustomerPurchases { get; set; } = new();
    }

    public class GetCustomerStatementQueryHandler : IRequestHandler<GetCustomerStatementQuery, CustomerStatementDto>
    {
        private readonly IApplicationDbContext _context;

        public GetCustomerStatementQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<CustomerStatementDto> Handle(GetCustomerStatementQuery request, CancellationToken cancellationToken)
        {
            var customer = await _context.Customers
                .Include(c => c.Account)
                .FirstOrDefaultAsync(c => c.Id == request.CustomerId, cancellationToken);

            if (customer == null)
            {
                throw new KeyNotFoundException("العميل غير موجود.");
            }

            var startDate = request.StartDate ?? DateTime.MinValue;
            var endDate = request.EndDate ?? DateTime.MaxValue;

            // جلب عقود المبيعات المرتبطة بالعميل بالكامل مع السيارات وخطط التقسيط والأقساط المجدولة
            var salesContracts = await _context.SalesContracts
                .Include(sc => sc.Vehicle)
                .Include(sc => sc.InstallmentPlan)
                    .ThenInclude(ip => ip!.Installments)
                .Where(sc => sc.CustomerId == customer.Id && sc.SaleDate >= startDate && sc.SaleDate <= endDate)
                .ToListAsync(cancellationToken);

            // جلب سندات القبض المدفوعة من العميل
            var payments = await _context.Payments
                .Where(p => p.ContraAccountId == customer.AccountId && p.Status == "posted")
                .ToListAsync(cancellationToken);

            var salesList = new List<StatementSaleItemDto>();

            foreach (var sc in salesContracts)
            {
                var scPayments = new List<StatementPaymentDto>();

                // إضافة الدفعة المقدمة كـ دفعة سداد أولى إن وجدت
                if (sc.DownPayment > 0)
                {
                    scPayments.Add(new StatementPaymentDto
                    {
                        Id = sc.Id,
                        PaymentMethod = sc.PaymentMethod == PaymentMethod.Installment ? "دفعة مقدمة عقد تقسيط" : "دفع نقدي كلي/مقدم",
                        PaymentDate = sc.SaleDate,
                        Amount = sc.DownPayment,
                        Currency = "IQD"
                    });
                }

                // ربط السندات المحصلة التي تحتوي في وصفها على رقم العقد
                var matchedPayments = payments
                    .Where(p => p.Description != null && p.Description.Contains(sc.ContractNumber))
                    .Select(p => new StatementPaymentDto
                    {
                        Id = p.Id,
                        PaymentMethod = p.Method == PaymentMethod.Cash ? "نقداً" : p.Method.ToString(),
                        PaymentDate = p.CreatedAt,
                        Amount = p.Amount,
                        Currency = "IQD"
                    });
                scPayments.AddRange(matchedPayments);

                var totalPaidFromPayments = scPayments.Sum(p => p.Amount);
                var remaining = sc.NetPrice - totalPaidFromPayments;
                if (remaining < 0) remaining = 0;

                StatementInstallmentPlanDto? planDto = null;
                if (sc.PaymentMethod == PaymentMethod.Installment && sc.InstallmentPlan != null)
                {
                    var plan = sc.InstallmentPlan;
                    var schedules = plan.Installments.Select(i => new StatementScheduleDto
                    {
                        Id = i.Id,
                        InstallmentNumber = i.InstallmentNumber,
                        DueDate = i.DueDate,
                        Amount = i.Amount,
                        PaidAmount = i.PaidAmount,
                        RemainingAmount = i.Amount - i.PaidAmount,
                        Currency = "IQD",
                        Status = i.Status,
                        PaymentDate = i.PaymentDate
                    }).OrderBy(i => i.InstallmentNumber).ToList();

                    var planPaid = plan.Installments.Sum(i => i.PaidAmount);
                    var planOverdue = plan.Installments
                        .Where(i => i.Status == "Overdue" || (i.Status == "Pending" && i.DueDate < DateTime.UtcNow))
                        .Sum(i => i.Amount - i.PaidAmount);

                    planDto = new StatementInstallmentPlanDto
                    {
                        Id = plan.Id,
                        TotalAmount = plan.TotalPlanAmount,
                        PaidAmount = planPaid,
                        RemainingAmount = plan.TotalPlanAmount - planPaid,
                        Currency = "IQD",
                        NumberOfMonths = plan.InstallmentPeriodMonths,
                        InstallmentAmount = plan.MonthlyInstallmentAmount,
                        Status = plan.Status,
                        OverdueAmount = planOverdue,
                        Schedules = schedules
                    };
                }

                salesList.Add(new StatementSaleItemDto
                {
                    Id = sc.Id,
                    InvoiceNumber = sc.ContractNumber,
                    SaleDate = sc.SaleDate,
                    CarName = sc.Vehicle != null ? $"{sc.Vehicle.Model} {sc.Vehicle.Year}" : "سيارة غير محددة",
                    CarVin = sc.Vehicle?.ChassisNumber,
                    SellingPrice = sc.NetPrice,
                    Currency = "IQD",
                    PaidAmount = totalPaidFromPayments,
                    RemainingAmount = sc.PaymentMethod == PaymentMethod.Installment && planDto != null ? planDto.RemainingAmount : remaining,
                    PaymentMethod = sc.PaymentMethod == PaymentMethod.Installment ? "تقسيط" : "نقداً",
                    Status = sc.Status,
                    HasInstallment = sc.PaymentMethod == PaymentMethod.Installment,
                    InstallmentPlan = planDto,
                    Payments = scPayments.OrderBy(p => p.PaymentDate).ToList()
                });
            }

            // جلب السيارات المشتراة من الزبون
            var customerPurchases = await _context.Purchases
                .Include(p => p.Vehicle)
                .Where(p => p.SourceType == CarShowroomManagementV2.Domain.Enums.PurchaseSourceType.Customer &&
                            p.CustomerId == customer.Id &&
                            p.PurchaseDate >= startDate &&
                            p.PurchaseDate <= endDate &&
                            p.Status != "Cancelled")
                .Select(p => new StatementCustomerPurchaseDto
                {
                    Id = p.Id,
                    PurchaseNumber = p.PurchaseNumber,
                    PurchaseDate = p.PurchaseDate,
                    VehicleName = p.Vehicle != null ? $"{p.Vehicle.Brand} {p.Vehicle.Model} {p.Vehicle.Year}" : "سيارة غير محددة",
                    ChassisNumber = p.Vehicle != null ? p.Vehicle.ChassisNumber : string.Empty,
                    PurchaseCost = p.PurchaseCost,
                    AmountPaid = p.AmountPaid,
                    Currency = "IQD",
                    Status = p.Status
                })
                .ToListAsync(cancellationToken);

            // حساب الرصيد الإجمالي لدفتر أستاذ الزبون لتحديد المركز المالي الصريح
            decimal accountBalance = 0;
            string positionStatus = "Zero";
            string positionLabel = "الحساب متزن (0.00 د.ع)";

            if (customer.AccountId != Guid.Empty)
            {
                var ledgerLines = await _context.JournalLines
                    .Include(l => l.JournalEntry)
                    .Where(l => l.AccountId == customer.AccountId && l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.EntryDate <= endDate)
                    .ToListAsync(cancellationToken);

                var dr = ledgerLines.Sum(l => l.Debit);
                var cr = ledgerLines.Sum(l => l.Credit);
                accountBalance = dr - cr;

                if (accountBalance > 0)
                {
                    positionStatus = "Debit";
                    positionLabel = "الزبون مدين للمعرض";
                }
                else if (accountBalance < 0)
                {
                    positionStatus = "Credit";
                    positionLabel = "المعرض مدين للزبون";
                }
            }

            var summaryDto = new StatementSummaryDto
            {
                SalesCount = salesList.Count,
                TotalSalesAmount = salesList.Sum(s => s.SellingPrice),
                TotalPaidAmount = salesList.Sum(s => s.PaidAmount),
                TotalRemaining = salesList.Sum(s => s.RemainingAmount),
                TotalOverdue = salesList.Sum(s => s.InstallmentPlan?.OverdueAmount ?? 0),
                AccountBalance = accountBalance,
                PositionStatus = positionStatus,
                PositionLabel = positionLabel,
                LastPaymentDate = payments.OrderByDescending(p => p.CreatedAt).FirstOrDefault()?.CreatedAt,
                Currency = "IQD"
            };

            var customerSummary = new CustomerSummaryDto
            {
                Id = customer.Id,
                Name = customer.Name,
                Phone = customer.Phone,
                CustomerType = customer.CustomerType
            };

            return new CustomerStatementDto
            {
                Customer = customerSummary,
                Summary = summaryDto,
                Sales = salesList,
                CustomerPurchases = customerPurchases
            };
        }
    }
}
