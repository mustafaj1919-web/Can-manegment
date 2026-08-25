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

namespace CarShowroomManagementV2.Application.Suppliers.Commands
{
    public class CreateSupplierCommand : IRequest<Guid>
    {
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateSupplierCommandValidator : AbstractValidator<CreateSupplierCommand>
    {
        public CreateSupplierCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage("اسم المورد مطلوب.");
            RuleFor(x => x.Code).NotEmpty().WithMessage("كود المورد مطلوب.");
            RuleFor(x => x.Phone).NotEmpty().WithMessage("رقم الهاتف مطلوب.");
        }
    }

    public class CreateSupplierCommandHandler : IRequestHandler<CreateSupplierCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CreateSupplierCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(CreateSupplierCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            // 1. التحقق من عدم تكرار كود المورد
            var existingSupplier = await _context.Suppliers
                .IgnoreQueryFilters()
                .AnyAsync(s => s.Code == request.Code && s.BranchId == branchId, cancellationToken);

            if (existingSupplier)
            {
                throw new InvalidOperationException("كود المورد هذا مسجل بالفعل في هذا الفرع.");
            }

            // 2. جلب حساب الموردين الرئيسي (2101)
            var parentAccount = await _context.Accounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "2101", cancellationToken);

            if (parentAccount == null)
            {
                throw new InvalidOperationException("حساب الموردين الرئيسي (2101) غير موجود في شجرة الحسابات.");
            }

            var dbContext = _context as DbContext;
            if (dbContext == null)
            {
                throw new InvalidOperationException("DbContext context is invalid.");
            }

            using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // 3. توليد كود حساب فريد للمورد تحت 2101
                var childAccounts = await _context.Accounts
                    .IgnoreQueryFilters()
                    .Where(a => a.ParentAccountId == parentAccount.Id)
                    .ToListAsync(cancellationToken);

                long nextSuffix = 1;
                if (childAccounts.Any())
                {
                    var suffixes = childAccounts
                        .Select(a => a.AccountCode)
                        .Where(code => code.StartsWith("2101") && code.Length > 4)
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

                var newAccountCode = $"2101{nextSuffix:D4}";

                // 4. إنشاء الحساب المالي للمورد مرتبطاً بفرعه
                var supplierAccount = new Account
                {
                    Id = Guid.NewGuid(),
                    AccountCode = newAccountCode,
                    Name = $"حساب المورد - {request.Name}",
                    Type = AccountType.Liability,
                    ParentAccountId = parentAccount.Id,
                    BranchId = branchId,
                    IsActive = true,
                    Description = $"حساب دفتر أستاذ مساعد للمورد {request.Name}"
                };

                _context.Accounts.Add(supplierAccount);
                await _context.SaveChangesAsync(cancellationToken);

                // 5. إنشاء سجل المورد
                var supplier = new Supplier
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name,
                    Code = request.Code,
                    Phone = request.Phone,
                    Address = request.Address,
                    Notes = request.Notes,
                    AccountId = supplierAccount.Id,
                    BranchId = branchId,
                    IsActive = true
                };

                _context.Suppliers.Add(supplier);
                await _context.SaveChangesAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);
                return supplier.Id;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }
}
