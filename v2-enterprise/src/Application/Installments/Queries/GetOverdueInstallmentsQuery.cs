using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.Application.Installments.Queries
{
    public class OverdueInstallmentDto
    {
        public Guid Id { get; set; }
        public int InstallmentNumber { get; set; }
        public DateTime DueDate { get; set; }
        public decimal Amount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount => Amount - PaidAmount;
        
        // تفاصيل عقد البيع والعميل
        public string ContractNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string VehicleModel { get; set; } = string.Empty;
    }

    public class GetOverdueInstallmentsQuery : IRequest<List<OverdueInstallmentDto>>
    {
    }

    public class GetOverdueInstallmentsQueryHandler : IRequestHandler<GetOverdueInstallmentsQuery, List<OverdueInstallmentDto>>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetOverdueInstallmentsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<List<OverdueInstallmentDto>> Handle(GetOverdueInstallmentsQuery request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // تحديث حالة الأقساط المتأخرة في قاعدة البيانات قبل الاستعلام عنها
            var now = DateTime.UtcNow;
            var pendingOverdue = await _context.Installments
                .Where(i => i.Status == "Pending" && i.DueDate < now)
                .ToListAsync(cancellationToken);

            if (pendingOverdue.Any())
            {
                foreach (var inst in pendingOverdue)
                {
                    inst.Status = "Overdue";
                }
                await _context.SaveChangesAsync(cancellationToken);
            }

            // الاستعلام عن الأقساط المتأخرة وتفاصيلها الملحقة
            var overdueList = await _context.Installments
                .Include(i => i.InstallmentPlan)
                .Where(i => i.Status == "Overdue")
                .OrderBy(i => i.DueDate)
                .Select(i => new OverdueInstallmentDto
                {
                    Id = i.Id,
                    InstallmentNumber = i.InstallmentNumber,
                    DueDate = i.DueDate,
                    Amount = i.Amount,
                    PaidAmount = i.PaidAmount,
                    ContractNumber = i.InstallmentPlan != null && i.InstallmentPlan.SalesContract != null ? i.InstallmentPlan.SalesContract.ContractNumber : string.Empty,
                    CustomerName = i.InstallmentPlan != null && i.InstallmentPlan.SalesContract != null && i.InstallmentPlan.SalesContract.Customer != null ? i.InstallmentPlan.SalesContract.Customer.Name : string.Empty,
                    CustomerPhone = i.InstallmentPlan != null && i.InstallmentPlan.SalesContract != null && i.InstallmentPlan.SalesContract.Customer != null ? i.InstallmentPlan.SalesContract.Customer.Phone : string.Empty,
                    VehicleModel = i.InstallmentPlan != null && i.InstallmentPlan.SalesContract != null && i.InstallmentPlan.SalesContract.Vehicle != null ? i.InstallmentPlan.SalesContract.Vehicle.Model : string.Empty
                })
                .ToListAsync(cancellationToken);

            return overdueList;
        }
    }
}
