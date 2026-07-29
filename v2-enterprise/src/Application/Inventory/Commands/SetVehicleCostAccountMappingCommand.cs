using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Application.Inventory.Commands
{
    public class SetVehicleCostAccountMappingCommand : IRequest<Guid>
    {
        public string CostType { get; set; } = string.Empty;
        public Guid AccountId { get; set; }
    }

    public class SetVehicleCostAccountMappingCommandValidator : AbstractValidator<SetVehicleCostAccountMappingCommand>
    {
        public SetVehicleCostAccountMappingCommandValidator()
        {
            RuleFor(x => x.CostType).NotEmpty().WithMessage("نوع المصروف مطلوب.");
            RuleFor(x => x.AccountId).NotEmpty().WithMessage("الحساب المحاسبي مطلوب.");
        }
    }

    public class SetVehicleCostAccountMappingCommandHandler : IRequestHandler<SetVehicleCostAccountMappingCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public SetVehicleCostAccountMappingCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(SetVehicleCostAccountMappingCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;
            var costType = request.CostType.ToLower();

            var account = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Id == request.AccountId, cancellationToken);

            if (account == null)
            {
                throw new InvalidOperationException("الحساب المحاسبي المحدد غير موجود بشجرة الحسابات.");
            }

            var mapping = await _context.VehicleCostAccountMappings
                .FirstOrDefaultAsync(m => m.CostType == costType && m.BranchId == branchId, cancellationToken);

            if (mapping == null)
            {
                mapping = new VehicleCostAccountMapping
                {
                    Id = Guid.NewGuid(),
                    CostType = costType,
                    AccountId = account.Id,
                    BranchId = branchId,
                    CreatedBy = _currentUserService.UserId,
                };
                _context.VehicleCostAccountMappings.Add(mapping);
            }
            else
            {
                mapping.AccountId = account.Id;
                mapping.LastModifiedAt = DateTime.UtcNow;
                mapping.LastModifiedBy = _currentUserService.UserId;
            }

            await _context.SaveChangesAsync(cancellationToken);
            return mapping.Id;
        }
    }
}
