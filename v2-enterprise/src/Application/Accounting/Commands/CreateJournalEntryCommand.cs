using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Application.Accounting.Commands
{
    public class CreateJournalEntryCommand : IRequest<Guid>
    {
        public DateTime EntryDate { get; set; } = DateTime.UtcNow;
        public string Description { get; set; } = string.Empty;
        public List<JournalLineDto> Lines { get; set; } = new List<JournalLineDto>();
    }

    public class JournalLineDto
    {
        public Guid AccountId { get; set; }
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public string? Description { get; set; }
    }

    // قواعد التحقق من صحة المدخلات للفريق المحاسبي (Validation Rules)
    public class CreateJournalEntryCommandValidator : AbstractValidator<CreateJournalEntryCommand>
    {
        public CreateJournalEntryCommandValidator()
        {
            RuleFor(x => x.Description)
                .NotEmpty().WithMessage("البيان الإجمالي للقيد مطلوب.");

            RuleFor(x => x.Lines)
                .NotNull().WithMessage("سطور القيد مطلوبة.")
                .Must(x => x != null && x.Count >= 2).WithMessage("يجب أن يحتوي القيد على سطرين على الأقل (قيد مزدوج).");

            RuleForEach(x => x.Lines).ChildRules(line =>
            {
                line.RuleFor(l => l.AccountId).NotEmpty().WithMessage("معرف الحساب المالي مطلوب.");
                line.RuleFor(l => l.Debit).GreaterThanOrEqualTo(0).WithMessage("قيمة المدين لا يمكن أن تكون سالبة.");
                line.RuleFor(l => l.Credit).GreaterThanOrEqualTo(0).WithMessage("قيمة الدائن لا يمكن أن تكون سالبة.");
                line.RuleFor(l => new { l.Debit, l.Credit })
                    .Must(l => (l.Debit > 0 && l.Credit == 0) || (l.Credit > 0 && l.Debit == 0))
                    .WithMessage("يجب أن يحتوي السطر على مبلغ مدين أو دائن فقط (وليس كلاهما أو صفر).");
            });

            RuleFor(x => x)
                .Must(x => x.Lines.Sum(l => l.Debit) == x.Lines.Sum(l => l.Credit))
                .WithMessage("القيد غير متوازن مالياً: مجموع المبالغ المدينة يجب أن يساوي مجموع المبالغ الدائنة.");
        }
    }

    // معالج الأمر المحاسبي (Command Handler)
    public class CreateJournalEntryCommandHandler : IRequestHandler<CreateJournalEntryCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CreateJournalEntryCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(CreateJournalEntryCommand request, CancellationToken cancellationToken)
        {
            // التحقق من وجود الحسابات وفعاليتها في نفس الفرع أو عامة
            var accountIds = request.Lines.Select(l => l.AccountId).Distinct().ToList();
            var accountsExist = await _context.Accounts
                .Where(a => accountIds.Contains(a.Id) && a.IsActive)
                .CountAsync(cancellationToken);

            if (accountsExist != accountIds.Count)
            {
                throw new Exception("أحد الحسابات المحاسبية المحددة غير موجود أو غير نشط.");
            }

            // توليد رقم تسلسلي فريد للقيد المالي
            var totalEntriesCount = await _context.JournalEntries.IgnoreQueryFilters()
                .CountAsync(cancellationToken);
            var entryNumber = $"JV-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

            var journalEntry = new JournalEntry
            {
                EntryNumber = entryNumber,
                EntryDate = request.EntryDate,
                Description = request.Description,
                IsPosted = true, // ترحيل مباشر للسرعة والأمان
                BranchId = _currentUserService.BranchId,
                CreatedBy = _currentUserService.UserId
            };

            foreach (var line in request.Lines)
            {
                journalEntry.Lines.Add(new JournalLine
                {
                    AccountId = line.AccountId,
                    Debit = line.Debit,
                    Credit = line.Credit,
                    Description = line.Description
                });
            }

            _context.JournalEntries.Add(journalEntry);
            await _context.SaveChangesAsync(cancellationToken);

            return journalEntry.Id;
        }
    }
}
