using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Application.Employees.Commands
{
    // ───── إنشاء موظف ─────
    public class CreateEmployeeCommand : IRequest<Guid>
    {
        public string FullName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? IdNumber { get; set; }
        public string? Address { get; set; }
        public string? Title { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class CreateEmployeeCommandValidator : AbstractValidator<CreateEmployeeCommand>
    {
        public CreateEmployeeCommandValidator()
        {
            RuleFor(x => x.FullName).NotEmpty().WithMessage("اسم الموظف مطلوب.");
            RuleFor(x => x.Phone).NotEmpty().WithMessage("رقم الهاتف مطلوب.");
        }
    }

    public class CreateEmployeeCommandHandler : IRequestHandler<CreateEmployeeCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        public CreateEmployeeCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        { _context = context; _currentUserService = currentUserService; }

        public async Task<Guid> Handle(CreateEmployeeCommand request, CancellationToken cancellationToken)
        {
            var employee = new Employee
            {
                Id = Guid.NewGuid(),
                FullName = request.FullName,
                Phone = request.Phone,
                IdNumber = request.IdNumber,
                Address = request.Address,
                Title = request.Title,
                IsActive = request.IsActive,
                BranchId = _currentUserService.BranchId,
                CreatedBy = _currentUserService.UserId,
                CreatedAt = DateTime.UtcNow,
            };
            _context.Employees.Add(employee);
            await _context.SaveChangesAsync(cancellationToken);
            return employee.Id;
        }
    }

    // ───── تعديل موظف ─────
    public class UpdateEmployeeCommand : IRequest<Guid>
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? IdNumber { get; set; }
        public string? Address { get; set; }
        public string? Title { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateEmployeeCommandValidator : AbstractValidator<UpdateEmployeeCommand>
    {
        public UpdateEmployeeCommandValidator()
        {
            RuleFor(x => x.Id).NotEmpty().WithMessage("معرّف الموظف مطلوب.");
            RuleFor(x => x.FullName).NotEmpty().WithMessage("اسم الموظف مطلوب.");
            RuleFor(x => x.Phone).NotEmpty().WithMessage("رقم الهاتف مطلوب.");
        }
    }

    public class UpdateEmployeeCommandHandler : IRequestHandler<UpdateEmployeeCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        public UpdateEmployeeCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        { _context = context; _currentUserService = currentUserService; }

        public async Task<Guid> Handle(UpdateEmployeeCommand request, CancellationToken cancellationToken)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Id == request.Id && e.BranchId == _currentUserService.BranchId, cancellationToken)
                ?? throw new InvalidOperationException("الموظف غير موجود.");

            employee.FullName = request.FullName;
            employee.Phone = request.Phone;
            employee.IdNumber = request.IdNumber;
            employee.Address = request.Address;
            employee.Title = request.Title;
            employee.IsActive = request.IsActive;
            await _context.SaveChangesAsync(cancellationToken);
            return employee.Id;
        }
    }
}
