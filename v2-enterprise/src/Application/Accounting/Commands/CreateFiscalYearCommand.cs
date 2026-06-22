using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Application.Accounting.Commands
{
    public class CreateFiscalYearCommand : IRequest<Guid>
    {
        public int Year { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateFiscalYearCommandValidator : AbstractValidator<CreateFiscalYearCommand>
    {
        public CreateFiscalYearCommandValidator()
        {
            RuleFor(x => x.Year).GreaterThan(2000).WithMessage("السنة غير صالحة.");
            RuleFor(x => x.StartDate).NotEmpty().WithMessage("تاريخ البداية مطلوب.");
            RuleFor(x => x.EndDate).GreaterThan(x => x.StartDate).WithMessage("تاريخ النهاية يجب أن يكون بعد تاريخ البداية.");
        }
    }

    public class CreateFiscalYearCommandHandler : IRequestHandler<CreateFiscalYearCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CreateFiscalYearCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(CreateFiscalYearCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;
            var exists = await _context.FiscalYears
                .IgnoreQueryFilters()
                .AnyAsync(f => f.Year == request.Year && f.BranchId == branchId, cancellationToken);
            if (exists)
                throw new InvalidOperationException($"السنة المالية {request.Year} موجودة مسبقاً.");

            var fiscalYear = new FiscalYear
            {
                Id = Guid.NewGuid(),
                Year = request.Year,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Status = "Open",
                Notes = request.Notes,
                BranchId = branchId
            };
            _context.FiscalYears.Add(fiscalYear);
            await _context.SaveChangesAsync(cancellationToken);
            return fiscalYear.Id;
        }
    }
}
