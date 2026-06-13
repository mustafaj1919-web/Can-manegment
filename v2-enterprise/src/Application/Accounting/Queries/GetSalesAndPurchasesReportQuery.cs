using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.Application.Accounting.Queries
{
    public class SalesAndPurchasesReportResultDto
    {
        // إحصائيات المبيعات
        public int TotalSalesCount { get; set; }
        public decimal TotalSalesRevenue { get; set; }
        public decimal TotalSalesProfit { get; set; }
        public int CashSalesCount { get; set; }
        public decimal CashSalesRevenue { get; set; }
        public int InstallmentSalesCount { get; set; }
        public decimal InstallmentSalesRevenue { get; set; }

        // إحصائيات المشتريات
        public int TotalPurchasesCount { get; set; }
        public decimal TotalPurchasesCost { get; set; }

        // إحصائيات الأقساط والتحصيلات
        public decimal TotalRemainingInstallmentsBalance { get; set; }
        public decimal TotalCollectedInstallments { get; set; }
    }

    public class GetSalesAndPurchasesReportQuery : IRequest<SalesAndPurchasesReportResultDto>
    {
    }

    public class GetSalesAndPurchasesReportQueryHandler : IRequestHandler<GetSalesAndPurchasesReportQuery, SalesAndPurchasesReportResultDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetSalesAndPurchasesReportQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<SalesAndPurchasesReportResultDto> Handle(GetSalesAndPurchasesReportQuery request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // جلب عقود المبيعات النشطة
            var activeSales = await _context.SalesContracts
                .Where(s => s.Status == "Active")
                .ToListAsync(cancellationToken);

            // جلب فواتير الشراء النشطة
            var activePurchases = await _context.Purchases
                .Where(p => p.Status == "Active")
                .ToListAsync(cancellationToken);

            // جلب الأقساط
            var installments = await _context.Installments
                .IgnoreQueryFilters()
                .Where(i => i.BranchId == branchId && i.Status != "Cancelled")
                .ToListAsync(cancellationToken);

            var result = new SalesAndPurchasesReportResultDto
            {
                TotalSalesCount = activeSales.Count,
                TotalSalesRevenue = activeSales.Sum(s => s.NetPrice),
                TotalSalesProfit = activeSales.Sum(s => s.Profit),
                
                CashSalesCount = activeSales.Count(s => s.PaymentMethod == Domain.Enums.PaymentMethod.Cash),
                CashSalesRevenue = activeSales.Where(s => s.PaymentMethod == Domain.Enums.PaymentMethod.Cash).Sum(s => s.NetPrice),

                InstallmentSalesCount = activeSales.Count(s => s.PaymentMethod != Domain.Enums.PaymentMethod.Cash),
                InstallmentSalesRevenue = activeSales.Where(s => s.PaymentMethod != Domain.Enums.PaymentMethod.Cash).Sum(s => s.NetPrice),

                TotalPurchasesCount = activePurchases.Count,
                TotalPurchasesCost = activePurchases.Sum(p => p.PurchaseCost),

                TotalRemainingInstallmentsBalance = activeSales.Sum(s => s.RemainingBalance),
                TotalCollectedInstallments = installments.Sum(i => i.PaidAmount)
            };

            return result;
        }
    }
}
