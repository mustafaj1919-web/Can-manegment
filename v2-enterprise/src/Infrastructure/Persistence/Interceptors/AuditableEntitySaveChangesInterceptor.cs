using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Common;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Infrastructure.Persistence.Interceptors
{
    public class AuditableEntitySaveChangesInterceptor : SaveChangesInterceptor
    {
        private readonly ICurrentUserService _currentUserService;

        public AuditableEntitySaveChangesInterceptor(ICurrentUserService currentUserService)
        {
            _currentUserService = currentUserService;
        }

        public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
        {
            EnforceFinancialRules(eventData.Context);
            UpdateAuditProperties(eventData.Context);
            return base.SavingChanges(eventData, result);
        }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            EnforceFinancialRules(eventData.Context);
            UpdateAuditProperties(eventData.Context);
            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }

        // أتمتة حقول التدقيق قبل الحفظ الفعلي
        private void UpdateAuditProperties(DbContext? context)
        {
            if (context == null) return;

            foreach (var entry in context.ChangeTracker.Entries<AuditableEntity>())
            {
                if (entry.State == EntityState.Added)
                {
                    entry.Entity.CreatedBy = _currentUserService.UserId ?? "System";
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    // إرفاق معرّف الفرع تلقائياً بناءً على فرع المستخدم المتصل
                    if (entry.Entity.BranchId == Guid.Empty)
                    {
                        entry.Entity.BranchId = _currentUserService.BranchId;
                    }
                }
                else if (entry.State == EntityState.Modified)
                {
                    entry.Entity.LastModifiedBy = _currentUserService.UserId ?? "System";
                    entry.Entity.LastModifiedAt = DateTime.UtcNow;
                }
            }
        }

        // فرض القوانين المالية الصارمة ومنع تعديل أو حذف القيود التاريخية
        private void EnforceFinancialRules(DbContext? context)
        {
            if (context == null) return;

            // 1. منع حذف أو تعديل رأس القيد المحاسبي (JournalEntry)
            var modifiedOrDeletedEntries = context.ChangeTracker.Entries<JournalEntry>()
                .Where(e => e.State == EntityState.Modified || e.State == EntityState.Deleted);

            if (modifiedOrDeletedEntries.Any())
            {
                throw new InvalidOperationException("قوانين الأمان المالي: يُمنع تماماً تعديل أو حذف قيود اليومية التاريخية. يرجى استخدام قيود التسوية العكسية (Reversal entries) بدلاً من ذلك.");
            }

            // 2. منع حذف أو تعديل سطور القيد المحاسبي (JournalLine)
            var modifiedOrDeletedLines = context.ChangeTracker.Entries<JournalLine>()
                .Where(e => e.State == EntityState.Modified || e.State == EntityState.Deleted);

            if (modifiedOrDeletedLines.Any())
            {
                throw new InvalidOperationException("قوانين الأمان المالي: يُمنع تماماً تعديل أو حذف سطور قيود اليومية لضمان سلامة ميزان المراجعة.");
            }
        }
    }
}
