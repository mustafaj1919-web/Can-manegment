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
    public class InstallmentsAgingDto
    {
        public decimal TotalPaidAmount { get; set; }
        public decimal TotalPendingAmount { get; set; } // مستقبلي غير مستحق بعد
        public decimal TotalOverdueAmount { get; set; } // مستحق متأخر
        
        public int PaidCount { get; set; }
        public int PendingCount { get; set; }
        public int OverdueCount { get; set; }

        public decimal GrossAccountsReceivable { get; set; }
        public decimal CustomerCreditBalances { get; set; }
        public decimal NetCustomerPosition => AccountingAmount.RoundMoney(GrossAccountsReceivable - CustomerCreditBalances);

        public List<InstallmentAgingItemDto> Items { get; set; } = new List<InstallmentAgingItemDto>();
    }

    public class InstallmentAgingItemDto
    {
        public Guid InstallmentId { get; set; }
        public string ContractNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public int InstallmentNumber { get; set; }
        public DateTime DueDate { get; set; }
        public decimal Amount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount => AccountingAmount.RoundMoney(Amount - PaidAmount);
        public string Status { get; set; } = string.Empty; // Pending, Paid, Overdue
        public int DaysPastDue { get; set; }
    }

    public class GetInstallmentsAgingQuery : IRequest<InstallmentsAgingDto>
    {
        public DateTime? AsOfDate { get; set; }
    }

    public class GetInstallmentsAgingQueryHandler : IRequestHandler<GetInstallmentsAgingQuery, InstallmentsAgingDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetInstallmentsAgingQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<InstallmentsAgingDto> Handle(GetInstallmentsAgingQuery request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;
            var asOf = request.AsOfDate ?? DateTime.UtcNow;

            // جلب حسابات ذمم المدينين (الزبائن) لحساب إجمالي الذمم والأرصدة الدائنة secara مستقل
            var customerAccounts = await _context.Accounts
                .Where(a => a.IsActive && a.BranchId == branchId && a.AccountCode.StartsWith("1301") && a.AccountCode != "1301")
                .ToListAsync(cancellationToken);

            var customerAccountIds = customerAccounts.Select(a => a.Id).ToList();

            var customerLines = await _context.JournalLines
                .Include(l => l.JournalEntry)
                .Where(l => l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.BranchId == branchId && customerAccountIds.Contains(l.AccountId))
                .ToListAsync(cancellationToken);

            decimal grossAccountsReceivable = 0;
            decimal customerCreditBalances = 0;

            foreach (var acc in customerAccounts)
            {
                var lines = customerLines.Where(l => l.AccountId == acc.Id).ToList();
                var dr = lines.Sum(l => l.Debit);
                var cr = lines.Sum(l => l.Credit);
                var closingNet = AccountingAmount.RoundMoney(dr - cr);

                if (closingNet > 0)
                {
                    grossAccountsReceivable += closingNet;
                }
                else if (closingNet < 0)
                {
                    customerCreditBalances += Math.Abs(closingNet);
                }
            }

            // جلب الأقساط النشطة للفرع الحالي
            var installments = await _context.Installments
                .IgnoreQueryFilters()
                .Include(i => i.InstallmentPlan)
                .ThenInclude(p => p!.SalesContract)
                .ThenInclude(c => c!.Customer)
                .Where(i => i.BranchId == branchId && i.Status != "Cancelled" && i.InstallmentPlan != null && i.InstallmentPlan.SalesContract != null)
                .ToListAsync(cancellationToken);

            var items = new List<InstallmentAgingItemDto>();

            decimal totalPaid = 0;
            decimal totalPending = 0;
            decimal totalOverdue = 0;

            int paidCount = 0;
            int pendingCount = 0;
            int overdueCount = 0;

            foreach (var inst in installments)
            {
                var contract = inst.InstallmentPlan!.SalesContract!;
                var customer = contract.Customer!;

                string calculatedStatus;
                int daysPast = 0;
                var remaining = AccountingAmount.RoundMoney(inst.Amount - inst.PaidAmount);

                if (inst.PaidAmount >= inst.Amount || inst.Status == "Paid")
                {
                    calculatedStatus = "Paid";
                    paidCount++;
                    totalPaid += AccountingAmount.RoundMoney(inst.PaidAmount);
                }
                else if (inst.DueDate < asOf)
                {
                    calculatedStatus = "Overdue";
                    overdueCount++;
                    totalOverdue += remaining;
                    totalPaid += AccountingAmount.RoundMoney(inst.PaidAmount);
                    daysPast = (asOf - inst.DueDate).Days;
                }
                else
                {
                    calculatedStatus = "Pending";
                    pendingCount++;
                    totalPending += remaining;
                    totalPaid += AccountingAmount.RoundMoney(inst.PaidAmount);
                }

                items.Add(new InstallmentAgingItemDto
                {
                    InstallmentId = inst.Id,
                    ContractNumber = contract.ContractNumber,
                    CustomerName = customer.Name,
                    InstallmentNumber = inst.InstallmentNumber,
                    DueDate = inst.DueDate,
                    Amount = AccountingAmount.RoundMoney(inst.Amount),
                    PaidAmount = AccountingAmount.RoundMoney(inst.PaidAmount),
                    Status = calculatedStatus,
                    DaysPastDue = daysPast
                });
            }

            return new InstallmentsAgingDto
            {
                TotalPaidAmount = AccountingAmount.RoundMoney(totalPaid),
                TotalPendingAmount = AccountingAmount.RoundMoney(totalPending),
                TotalOverdueAmount = AccountingAmount.RoundMoney(totalOverdue),
                PaidCount = paidCount,
                PendingCount = pendingCount,
                OverdueCount = overdueCount,
                GrossAccountsReceivable = AccountingAmount.RoundMoney(grossAccountsReceivable),
                CustomerCreditBalances = AccountingAmount.RoundMoney(customerCreditBalances),
                Items = items.OrderBy(i => i.DueDate).ToList()
            };
        }
    }
}
