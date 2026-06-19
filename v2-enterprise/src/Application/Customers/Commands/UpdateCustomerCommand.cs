using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;

namespace CarShowroomManagementV2.Application.Customers.Commands
{
    public class UpdateCustomerCommand : IRequest<Guid>
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? IdType { get; set; }
        public string IdNumber { get; set; } = string.Empty;
        public DateTime? IdIssueDate { get; set; }
        public DateTime? IdExpiryDate { get; set; }
        public string? Nationality { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string CustomerType { get; set; } = "Individual"; // Individual, Company
        public string? Notes { get; set; }
    }

    public class UpdateCustomerCommandValidator : AbstractValidator<UpdateCustomerCommand>
    {
        public UpdateCustomerCommandValidator()
        {
            RuleFor(x => x.Id).NotEmpty().WithMessage("معرّف العميل مطلوب.");
            RuleFor(x => x.Name).NotEmpty().WithMessage("اسم العميل مطلوب.");
            RuleFor(x => x.Phone).NotEmpty().WithMessage("رقم الهاتف مطلوب.");
            RuleFor(x => x.IdNumber).NotEmpty().WithMessage("رقم الهوية مطلوب.");
            RuleFor(x => x.CustomerType).Must(t => t == "Individual" || t == "Company")
                .WithMessage("نوع العميل يجب أن يكون Individual أو Company.");
        }
    }

    public class UpdateCustomerCommandHandler : IRequestHandler<UpdateCustomerCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public UpdateCustomerCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(UpdateCustomerCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Id == request.Id && c.BranchId == branchId, cancellationToken);

            if (customer == null)
            {
                throw new InvalidOperationException("العميل غير موجود.");
            }

            // التحقق من عدم تكرار رقم الهوية مع عميل آخر في نفس الفرع
            var duplicate = await _context.Customers
                .AnyAsync(c => c.IdNumber == request.IdNumber
                            && c.BranchId == branchId
                            && c.Id != request.Id, cancellationToken);

            if (duplicate)
            {
                throw new InvalidOperationException("رقم الهوية هذا مسجل بالفعل لعميل آخر في هذا الفرع.");
            }

            customer.Name = request.Name;
            customer.FullName = request.FullName;
            customer.Phone = request.Phone;
            customer.Address = request.Address;
            customer.IdType = request.IdType;
            customer.IdNumber = request.IdNumber;
            customer.IdIssueDate = request.IdIssueDate;
            customer.IdExpiryDate = request.IdExpiryDate;
            customer.Nationality = request.Nationality;
            customer.DateOfBirth = request.DateOfBirth;
            customer.CustomerType = request.CustomerType;
            customer.Notes = request.Notes;

            // مزامنة اسم حساب دفتر الأستاذ المساعد للعميل
            var customerAccount = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Id == customer.AccountId, cancellationToken);
            if (customerAccount != null)
            {
                customerAccount.Name = $"حساب العميل - {request.Name}";
            }

            await _context.SaveChangesAsync(cancellationToken);
            return customer.Id;
        }
    }
}
