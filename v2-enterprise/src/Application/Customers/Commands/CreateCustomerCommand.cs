using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Application.Customers.Commands
{
    public class CreateCustomerCommand : IRequest<Guid>
    {
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

    public class CreateCustomerCommandValidator : AbstractValidator<CreateCustomerCommand>
    {
        public CreateCustomerCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage("اسم العميل مطلوب.");
            RuleFor(x => x.Phone).NotEmpty().WithMessage("رقم الهاتف مطلوب.");
            RuleFor(x => x.IdNumber).NotEmpty().WithMessage("رقم الهوية مطلوب.");
            RuleFor(x => x.CustomerType).Must(t => t == "Individual" || t == "Company")
                .WithMessage("نوع العميل يجب أن يكون Individual أو Company.");
        }
    }

    public class CreateCustomerCommandHandler : IRequestHandler<CreateCustomerCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CreateCustomerCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(CreateCustomerCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // 1. التحقق من عدم تكرار رقم الهوية داخل نفس الفرع
            var existingCustomer = await _context.Customers
                .IgnoreQueryFilters() // للتحقق عبر الفروع الأخرى للخصوصية أو نفس الفرع بدقة
                .AnyAsync(c => c.IdNumber == request.IdNumber && c.BranchId == branchId, cancellationToken);

            if (existingCustomer)
            {
                throw new InvalidOperationException("رقم الهوية هذا مسجل بالفعل لعميل آخر في هذا الفرع.");
            }

            // 2. جلب حساب ذمم المدينين الرئيسي (1301)
            var parentAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "1301", cancellationToken);

            if (parentAccount == null)
            {
                throw new InvalidOperationException("حساب ذمم المدينين الرئيسي (1301) غير موجود في شجرة الحسابات.");
            }

            // استخدام معاملة قاعدة البيانات لضمان حفظ كل شيء بشكل متناسق (Atomic Transaction)
            var dbContext = _context as DbContext;
            if (dbContext == null)
            {
                throw new InvalidOperationException("DbContext context is invalid.");
            }

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // 3. توليد كود حساب فريد للعميل تلقائياً تحت 1301
                var childAccounts = await _context.Accounts
                    .IgnoreQueryFilters()
                    .Where(a => a.ParentAccountId == parentAccount.Id)
                    .ToListAsync(cancellationToken);

                long nextSuffix = 1;
                if (childAccounts.Any())
                {
                    var suffixes = childAccounts
                        .Select(a => a.AccountCode)
                        .Where(code => code.StartsWith("1301") && code.Length > 4)
                        .Select(code =>
                        {
                            long.TryParse(code.Substring(4), out var num);
                            return num;
                        })
                        .ToList();

                    if (suffixes.Any())
                    {
                        nextSuffix = suffixes.Max() + 1;
                    }
                }

                var newAccountCode = $"1301{nextSuffix:D4}";

                // 4. إنشاء الحساب المالي للعميل مرتبطاً بفرعه
                var customerAccount = new Account
                {
                    Id = Guid.NewGuid(),
                    AccountCode = newAccountCode,
                    Name = $"حساب العميل - {request.Name}",
                    Type = AccountType.Asset,
                    ParentAccountId = parentAccount.Id,
                    BranchId = branchId,
                    IsActive = true,
                    Description = $"حساب دفتر أستاذ مساعد للعميل {request.Name}"
                };

                _context.Accounts.Add(customerAccount);
                await _context.SaveChangesAsync(cancellationToken);

                // 5. إنشاء سجل العميل وربطه بالحساب المالي والفرع
                var customer = new Customer
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name,
                    FullName = request.FullName,
                    Phone = request.Phone,
                    Address = request.Address,
                    IdType = request.IdType,
                    IdNumber = request.IdNumber,
                    IdIssueDate = request.IdIssueDate,
                    IdExpiryDate = request.IdExpiryDate,
                    Nationality = request.Nationality,
                    DateOfBirth = request.DateOfBirth,
                    CustomerType = request.CustomerType,
                    Notes = request.Notes,
                    AccountId = customerAccount.Id,
                    BranchId = branchId
                };

                _context.Customers.Add(customer);
                await _context.SaveChangesAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);
                return customer.Id;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync(cancellationToken);
                throw; // إعادة الرفع لتفشل العملية بالكامل
            }
        }
    }
}
