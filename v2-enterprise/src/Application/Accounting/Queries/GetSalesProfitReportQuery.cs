using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Common.Helpers;

namespace CarShowroomManagementV2.Application.Accounting.Queries
{
    public class SalesProfitReportDto
    {
        public decimal TotalSalePrice { get; set; }
        public decimal TotalBookValue { get; set; }
        public decimal TotalDirectProfit { get; set; }
        public decimal TotalDeferredProfitMarkup { get; set; }
        public decimal TotalRecognizedInstallmentProfit { get; set; }
        public decimal TotalOverallProfit => AccountingAmount.RoundMoney(TotalDirectProfit + TotalRecognizedInstallmentProfit);

        public List<SalesProfitItemDto> Sales { get; set; } = new List<SalesProfitItemDto>();
    }

    public class SalesProfitItemDto
    {
        public Guid ContractId { get; set; }
        public string ContractNumber { get; set; } = string.Empty;
        public DateTime SaleDate { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string VehicleModel { get; set; } = string.Empty;
        public decimal SalePrice { get; set; }
        public decimal BookValue { get; set; }
        public decimal DirectProfit { get; set; }
        public decimal ProfitRatePercentage { get; set; }
        public decimal TotalProfitMarkup { get; set; }
        public decimal RecognizedInstallmentProfit { get; set; }
        public decimal OverallProfit => AccountingAmount.RoundMoney(DirectProfit + RecognizedInstallmentProfit);
    }

    public class GetSalesProfitReportQuery : IRequest<SalesProfitReportDto>
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class GetSalesProfitReportQueryHandler : IRequestHandler<GetSalesProfitReportQuery, SalesProfitReportDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetSalesProfitReportQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<SalesProfitReportDto> Handle(GetSalesProfitReportQuery request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // 1. جلب عقود المبيعات النشطة للفرع الحالي وضمن التواريخ المطلوبة
            var contractsQuery = _context.SalesContracts
                .Include(c => c.Customer)
                .Include(c => c.Vehicle)
                .Where(c => c.BranchId == branchId && c.Status == "Active");

            if (request.FromDate.HasValue)
            {
                contractsQuery = contractsQuery.Where(c => c.SaleDate >= request.FromDate.Value);
            }

            if (request.ToDate.HasValue)
            {
                contractsQuery = contractsQuery.Where(c => c.SaleDate <= request.ToDate.Value);
            }

            var contracts = await contractsQuery.ToListAsync(cancellationToken);

            // 2. جلب كافة سطور القيود اليومية المرحلة للفرع للاستخدام كمصدر للحقيقة في تقييم الأرباح
            var jvLines = await _context.JournalLines
                .Include(l => l.Account)
                .Include(l => l.JournalEntry)
                .Where(l => l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.BranchId == branchId)
                .ToListAsync(cancellationToken);

            var items = new List<SalesProfitItemDto>();

            decimal totalSalePrice = 0;
            decimal totalBookValue = 0;
            decimal totalDirectProfit = 0;
            decimal totalDeferred = 0;
            decimal totalRecognized = 0;

            foreach (var contract in contracts)
            {
                // مطابقة الحركات التي تحتوي على رقم العقد بالبيان (البيان الكلي أو التفصيلي للسطر)
                var contractLines = jvLines
                    .Where(l => (l.JournalEntry!.Description != null && l.JournalEntry.Description.Contains(contract.ContractNumber))
                             || (l.Description != null && l.Description.Contains(contract.ContractNumber)))
                    .ToList();

                // أرباح التقسيط المؤجلة المضافة (دائن حساب 2301 في قيد إثبات عقد البيع)
                var deferredProfit = contractLines
                    .Where(l => l.Account != null && l.Account.AccountCode == "2301")
                    .Sum(l => l.Credit);

                // أرباح التقسيط المعترف بها تدريجياً (دائن حساب 4102 في قيود سداد الأقساط)
                var recognizedProfit = contractLines
                    .Where(l => l.Account != null && l.Account.AccountCode == "4102")
                    .Sum(l => l.Credit);

                decimal historicalCostBasis = contract.CostBasis > 0
                    ? contract.CostBasis
                    : (contract.Vehicle != null && contract.Vehicle.BookValue > 0 ? contract.Vehicle.BookValue : Math.Max(0, contract.SalePrice - contract.Profit));
                var directProfit = AccountingAmount.RoundMoney(contract.SalePrice - historicalCostBasis);

                totalSalePrice += contract.SalePrice;
                totalBookValue += historicalCostBasis;
                totalDirectProfit += directProfit;
                totalDeferred += deferredProfit;
                totalRecognized += recognizedProfit;

                // جلب نسبة الربح وخطة الأقساط إذا كانت متوفرة
                decimal profitRate = 0;
                var plan = await _context.InstallmentPlans
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(p => p.SalesContractId == contract.Id && p.BranchId == branchId, cancellationToken);
                if (plan != null)
                {
                    profitRate = plan.ProfitRatePercentage;
                }

                items.Add(new SalesProfitItemDto
                {
                    ContractId = contract.Id,
                    ContractNumber = contract.ContractNumber,
                    SaleDate = contract.SaleDate,
                    CustomerName = contract.Customer!.Name,
                    VehicleModel = contract.Vehicle!.Model,
                    SalePrice = AccountingAmount.RoundMoney(contract.SalePrice),
                    BookValue = AccountingAmount.RoundMoney(historicalCostBasis),
                    DirectProfit = directProfit,
                    ProfitRatePercentage = profitRate,
                    TotalProfitMarkup = AccountingAmount.RoundMoney(deferredProfit),
                    RecognizedInstallmentProfit = AccountingAmount.RoundMoney(recognizedProfit)
                });
            }

            return new SalesProfitReportDto
            {
                TotalSalePrice = AccountingAmount.RoundMoney(totalSalePrice),
                TotalBookValue = AccountingAmount.RoundMoney(totalBookValue),
                TotalDirectProfit = AccountingAmount.RoundMoney(totalDirectProfit),
                TotalDeferredProfitMarkup = AccountingAmount.RoundMoney(totalDeferred),
                TotalRecognizedInstallmentProfit = AccountingAmount.RoundMoney(totalRecognized),
                Sales = items.OrderByDescending(s => s.SaleDate).ToList()
            };
        }
    }
}
