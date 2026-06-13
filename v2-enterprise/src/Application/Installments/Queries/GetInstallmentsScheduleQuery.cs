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
    public class InstallmentDto
    {
        public Guid Id { get; set; }
        public int InstallmentNumber { get; set; }
        public DateTime DueDate { get; set; }
        public decimal Amount { get; set; }
        public decimal PaidAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? PaymentDate { get; set; }
    }

    public class GetInstallmentsScheduleQuery : IRequest<List<InstallmentDto>>
    {
        public Guid SalesContractId { get; set; }
    }

    public class GetInstallmentsScheduleQueryHandler : IRequestHandler<GetInstallmentsScheduleQuery, List<InstallmentDto>>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetInstallmentsScheduleQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<List<InstallmentDto>> Handle(GetInstallmentsScheduleQuery request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // جلب خطة التقسيط المرتبطة بالعقد
            var plan = await _context.InstallmentPlans
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.SalesContractId == request.SalesContractId && p.BranchId == branchId, cancellationToken);

            if (plan == null)
            {
                return new List<InstallmentDto>();
            }

            // جلب الأقساط
            var installments = await _context.Installments
                .Where(i => i.InstallmentPlanId == plan.Id)
                .OrderBy(i => i.InstallmentNumber)
                .Select(i => new InstallmentDto
                {
                    Id = i.Id,
                    InstallmentNumber = i.InstallmentNumber,
                    DueDate = i.DueDate,
                    Amount = i.Amount,
                    PaidAmount = i.PaidAmount,
                    Status = i.Status,
                    PaymentDate = i.PaymentDate
                })
                .ToListAsync(cancellationToken);

            // تحديث حالة الأقساط المتأخرة ديناميكياً وعرضها
            foreach (var inst in installments)
            {
                if (inst.Status == "Pending" && inst.DueDate < DateTime.UtcNow)
                {
                    inst.Status = "Overdue";
                    
                    // تحديث الحالة في قاعدة البيانات
                    var dbInst = await _context.Installments.FindAsync(new object[] { inst.Id }, cancellationToken);
                    if (dbInst != null)
                    {
                        dbInst.Status = "Overdue";
                        _context.Installments.Update(dbInst);
                    }
                }
            }
            await _context.SaveChangesAsync(cancellationToken);

            return installments;
        }
    }
}
