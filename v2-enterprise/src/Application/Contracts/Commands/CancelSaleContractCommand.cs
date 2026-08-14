using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Application.Contracts.Commands
{
    public class CancelSaleContractCommand : IRequest<bool>
    {
        public Guid DocumentId { get; set; }
        public string? Reason { get; set; }
    }

    public class CancelSaleContractCommandValidator : AbstractValidator<CancelSaleContractCommand>
    {
        public CancelSaleContractCommandValidator()
        {
            RuleFor(x => x.DocumentId).NotEmpty().WithMessage("معرّف الوثيقة مطلوب للإلغاء.");
        }
    }

    public class CancelSaleContractCommandHandler : IRequestHandler<CancelSaleContractCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CancelSaleContractCommandHandler(
            IApplicationDbContext context,
            ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<bool> Handle(CancelSaleContractCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            var contract = await _context.SalesContracts
                .FirstOrDefaultAsync(sc => sc.Id == request.DocumentId && sc.BranchId == branchId, cancellationToken);

            if (contract == null)
            {
                throw new InvalidOperationException("الوثيقة غير موجودة أو لا تنتمي للفرع الحالي.");
            }

            if (contract.DocumentStatus == SaleDocumentStatus.CANCELLED)
            {
                return true; // Already cancelled
            }

            contract.DocumentStatus = SaleDocumentStatus.CANCELLED;
            contract.CancelledAt = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(request.Reason))
            {
                contract.DocumentNotes = string.IsNullOrWhiteSpace(contract.DocumentNotes)
                    ? $"سبب الإلغاء: {request.Reason}"
                    : $"{contract.DocumentNotes}\nسبب الإلغاء: {request.Reason}";
            }

            _context.SalesContracts.Update(contract);
            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
