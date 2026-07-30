using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Infrastructure.Persistence.Interceptors;

namespace CarShowroomManagementV2.Infrastructure.Persistence
{
    public class ApplicationDbContext : DbContext, IApplicationDbContext
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly AuditableEntitySaveChangesInterceptor _auditableInterceptor;

        public ApplicationDbContext(
            DbContextOptions<ApplicationDbContext> options,
            ICurrentUserService currentUserService,
            AuditableEntitySaveChangesInterceptor auditableInterceptor) : base(options)
        {
            _currentUserService = currentUserService;
            _auditableInterceptor = auditableInterceptor;
        }

        public DbSet<Branch> Branches => Set<Branch>();
        public DbSet<User> Users => Set<User>();
        public DbSet<Role> Roles => Set<Role>();
        public DbSet<Permission> Permissions => Set<Permission>();
        public DbSet<UserRole> UserRoles => Set<UserRole>();
        public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
        public DbSet<Account> Accounts => Set<Account>();
        public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
        public DbSet<JournalLine> JournalLines => Set<JournalLine>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
        public DbSet<Vehicle> Vehicles => Set<Vehicle>();
        public DbSet<Payment> Payments => Set<Payment>();
        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<CustomerDocument> CustomerDocuments => Set<CustomerDocument>();
        public DbSet<VehicleImage> VehicleImages => Set<VehicleImage>();
        public DbSet<VehicleCost> VehicleCosts => Set<VehicleCost>();
        public DbSet<Supplier> Suppliers => Set<Supplier>();
        public DbSet<SalesContract> SalesContracts => Set<SalesContract>();
        public DbSet<Purchase> Purchases => Set<Purchase>();
        public DbSet<InstallmentPlan> InstallmentPlans => Set<InstallmentPlan>();
        public DbSet<Installment> Installments => Set<Installment>();
        public DbSet<CashboxClose> CashboxCloses => Set<CashboxClose>();
        public DbSet<Expense> Expenses => Set<Expense>();
        public DbSet<Employee> Employees => Set<Employee>();
        public DbSet<CrmInteraction> CrmInteractions => Set<CrmInteraction>();
        public DbSet<Deal> Deals => Set<Deal>();
        public DbSet<EmployeeCommission> EmployeeCommissions => Set<EmployeeCommission>();
        public DbSet<EmployeeTarget> EmployeeTargets => Set<EmployeeTarget>();
        public DbSet<FiscalYear> FiscalYears => Set<FiscalYear>();
        public DbSet<RecurringJournalTemplate> RecurringJournalTemplates => Set<RecurringJournalTemplate>();
        public DbSet<RecurringTemplateLine> RecurringTemplateLines => Set<RecurringTemplateLine>();
        public DbSet<AppUser> AppUsers => Set<AppUser>();
        public DbSet<Conversation> Conversations => Set<Conversation>();
        public DbSet<Message> Messages => Set<Message>();
        public DbSet<VehicleStatusHistory> VehicleStatusHistories => Set<VehicleStatusHistory>();
        public DbSet<VehicleCostAccountMapping> VehicleCostAccountMappings => Set<VehicleCostAccountMapping>();

        // CMS DbSets
        public DbSet<WebsiteSetting> WebsiteSettings => Set<WebsiteSetting>();
        public DbSet<WebsiteArticle> WebsiteArticles => Set<WebsiteArticle>();
        public DbSet<WebsiteService> WebsiteServices => Set<WebsiteService>();
        public DbSet<WebsiteTestimonial> WebsiteTestimonials => Set<WebsiteTestimonial>();
        public DbSet<WebsitePage> WebsitePages => Set<WebsitePage>();
        public DbSet<WebsiteMedia> WebsiteMedias => Set<WebsiteMedia>();

        // Document Control & Idempotency DbSets
        public DbSet<IdempotencyRecord> IdempotencyRecords => Set<IdempotencyRecord>();
        public DbSet<ReceiptArchiveRecord> ReceiptArchiveRecords => Set<ReceiptArchiveRecord>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<WebsiteArticle>()
                .HasIndex(a => a.Slug)
                .IsUnique();

            modelBuilder.Entity<WebsitePage>()
                .HasIndex(p => p.PageKey)
                .IsUnique();

            // تحديد دقة الأعمدة المالية (numeric 18,4) لتجنب أخطاء التقريب
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(decimal) || property.ClrType == typeof(decimal?))
                    {
                        property.SetColumnType("numeric(18,4)");
                    }
                }
            }

            // إعداد المفاتيح المركبة لجداول الربط في الهوية والصلاحيات
            modelBuilder.Entity<UserRole>()
                .HasKey(ur => new { ur.UserId, ur.RoleId });

            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId);

            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId);

            modelBuilder.Entity<RolePermission>()
                .HasKey(rp => new { rp.RoleId, rp.PermissionId });

            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(rp => rp.RoleId);

            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(rp => rp.PermissionId);

            // عزل الحسابات والقيود شجرياً وربط العلاقات
            modelBuilder.Entity<Account>()
                .HasOne(a => a.ParentAccount)
                .WithMany(p => p.ChildAccounts)
                .HasForeignKey(a => a.ParentAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            // تكوينات وإعدادات فريدة وفهارس للعملاء والمخزون
            modelBuilder.Entity<Customer>()
                .HasIndex(c => new { c.IdNumber, c.BranchId })
                .IsUnique(); // منع تكرار رقم الهوية داخل نفس الفرع

            // مستخدمو تسجيل الدخول عبر Google — فريد بمعرّف Google، وربط اختياري بحساب عميل حقيقي
            modelBuilder.Entity<AppUser>()
                .HasIndex(u => u.GoogleId)
                .IsUnique();

            modelBuilder.Entity<AppUser>()
                .HasOne(u => u.LinkedCustomer)
                .WithMany()
                .HasForeignKey(u => u.LinkedCustomerId)
                .OnDelete(DeleteBehavior.SetNull);

            // محادثات الموبايل حول السيارات
            modelBuilder.Entity<Conversation>()
                .HasOne(c => c.Vehicle)
                .WithMany()
                .HasForeignKey(c => c.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Conversation>()
                .HasOne(c => c.Customer)
                .WithMany()
                .HasForeignKey(c => c.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Conversation>()
                .HasOne(c => c.AppUser)
                .WithMany()
                .HasForeignKey(c => c.AppUserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Message>()
                .HasOne(m => m.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Customer>()
                .HasOne(c => c.Account)
                .WithMany()
                .HasForeignKey(c => c.AccountId)
                .OnDelete(DeleteBehavior.Restrict); // منع حذف الحساب المرتبط بالعميل

            modelBuilder.Entity<Customer>()
                .HasMany(c => c.Documents)
                .WithOne(d => d.Customer)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Vehicle>()
                .HasIndex(v => v.ChassisNumber)
                .IsUnique(); // منع تكرار رقم الشاسيه

            modelBuilder.Entity<Vehicle>()
                .HasMany(v => v.Images)
                .WithOne(i => i.Vehicle)
                .HasForeignKey(i => i.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Vehicle>()
                .HasMany(v => v.DetailedCosts)
                .WithOne(c => c.Vehicle)
                .HasForeignKey(c => c.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);

            // إعدادات الموردين
            modelBuilder.Entity<Supplier>()
                .HasIndex(s => new { s.Code, s.BranchId })
                .IsUnique(); // منع تكرار كود المورد في نفس الفرع

            modelBuilder.Entity<Supplier>()
                .HasOne(s => s.Account)
                .WithMany()
                .HasForeignKey(s => s.AccountId)
                .OnDelete(DeleteBehavior.Restrict);

            // إعدادات عقود المبيعات
            modelBuilder.Entity<SalesContract>()
                .HasIndex(sc => new { sc.ContractNumber, sc.BranchId })
                .IsUnique();

            modelBuilder.Entity<SalesContract>()
                .HasOne(sc => sc.Customer)
                .WithMany()
                .HasForeignKey(sc => sc.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<SalesContract>()
                .HasOne(sc => sc.Vehicle)
                .WithMany()
                .HasForeignKey(sc => sc.VehicleId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<SalesContract>()
                .HasOne(sc => sc.SalesRep)
                .WithMany()
                .HasForeignKey(sc => sc.SalesRepId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            // إعدادات المشتريات
            modelBuilder.Entity<Purchase>()
                .HasIndex(p => new { p.PurchaseNumber, p.BranchId })
                .IsUnique();

            modelBuilder.Entity<Purchase>()
                .HasOne(p => p.Supplier)
                .WithMany()
                .HasForeignKey(p => p.SupplierId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Purchase>()
                .HasOne(p => p.Customer)
                .WithMany()
                .HasForeignKey(p => p.CustomerId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Purchase>()
                .HasOne(p => p.Vehicle)
                .WithMany()
                .HasForeignKey(p => p.VehicleId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Purchase>()
                .HasIndex(p => p.SourceType);

            modelBuilder.Entity<Purchase>()
                .HasIndex(p => p.SupplierId);

            modelBuilder.Entity<Purchase>()
                .HasIndex(p => p.CustomerId);

            modelBuilder.Entity<Purchase>()
                .HasIndex(p => new { p.SourceType, p.SupplierId });

            modelBuilder.Entity<Purchase>()
                .HasIndex(p => new { p.SourceType, p.CustomerId });

            modelBuilder.Entity<Purchase>()
                .ToTable(t => t.HasCheckConstraint("CK_Purchases_SourceIntegrity",
                    "(\"SourceType\" = 1 AND \"SupplierId\" IS NOT NULL AND \"CustomerId\" IS NULL) OR (" +
                    "\"SourceType\" = 2 AND \"CustomerId\" IS NOT NULL AND \"SupplierId\" IS NULL)"));

            // إعدادات الأقساط
            modelBuilder.Entity<InstallmentPlan>()
                .HasOne(ip => ip.SalesContract)
                .WithOne(sc => sc.InstallmentPlan)
                .HasForeignKey<InstallmentPlan>(ip => ip.SalesContractId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<InstallmentPlan>()
                .HasOne(ip => ip.Purchase)
                .WithMany()
                .HasForeignKey(ip => ip.PurchaseId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<InstallmentPlan>()
                .HasMany(ip => ip.Installments)
                .WithOne(i => i.InstallmentPlan)
                .HasForeignKey(i => i.InstallmentPlanId)
                .OnDelete(DeleteBehavior.Cascade);

            // Global Branch Query Filters — bypassed for Owner/Admin/Accountant (CanSeeAllBranches)
            modelBuilder.Entity<Account>()
                .HasQueryFilter(a => _currentUserService.CanSeeAllBranches || a.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<JournalEntry>()
                .HasQueryFilter(j => _currentUserService.CanSeeAllBranches || j.BranchId == _currentUserService.BranchId);

            // ─── Global Query Filters ───────────────────────────────────────────────────
            // دمج فلتر الفرع مع Soft Delete للجداول التي يُطبَّق عليها الحذف الناعم
            modelBuilder.Entity<Vehicle>()
                .HasQueryFilter(v => !v.IsDeleted && (_currentUserService.CanSeeAllBranches || v.BranchId == _currentUserService.BranchId));

            modelBuilder.Entity<Customer>()
                .HasQueryFilter(c => !c.IsDeleted && (_currentUserService.CanSeeAllBranches || c.BranchId == _currentUserService.BranchId));

            modelBuilder.Entity<Employee>()
                .HasQueryFilter(e => !e.IsDeleted && (_currentUserService.CanSeeAllBranches || e.BranchId == _currentUserService.BranchId));

            modelBuilder.Entity<Supplier>()
                .HasQueryFilter(s => !s.IsDeleted && (_currentUserService.CanSeeAllBranches || s.BranchId == _currentUserService.BranchId));

            // السجلات المالية — فلتر الفرع فقط، بدون Soft Delete (لا تُحذف السجلات المالية)
            modelBuilder.Entity<Payment>()
                .HasQueryFilter(p => _currentUserService.CanSeeAllBranches || p.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<AuditLog>()
                .HasQueryFilter(al => _currentUserService.CanSeeAllBranches || al.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<SalesContract>()
                .HasQueryFilter(sc => _currentUserService.CanSeeAllBranches || sc.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<Purchase>()
                .HasQueryFilter(p => _currentUserService.CanSeeAllBranches || p.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<InstallmentPlan>()
                .HasQueryFilter(ip => _currentUserService.CanSeeAllBranches || ip.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<Installment>()
                .HasQueryFilter(i => _currentUserService.CanSeeAllBranches || i.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<Expense>()
                .HasQueryFilter(e => _currentUserService.CanSeeAllBranches || e.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<CrmInteraction>()
                .HasQueryFilter(e => _currentUserService.CanSeeAllBranches || e.BranchId == _currentUserService.BranchId);
            modelBuilder.Entity<Deal>()
                .HasQueryFilter(e => _currentUserService.CanSeeAllBranches || e.BranchId == _currentUserService.BranchId);
            modelBuilder.Entity<EmployeeCommission>()
                .HasQueryFilter(e => _currentUserService.CanSeeAllBranches || e.BranchId == _currentUserService.BranchId);
            modelBuilder.Entity<EmployeeTarget>()
                .HasQueryFilter(e => _currentUserService.CanSeeAllBranches || e.BranchId == _currentUserService.BranchId);
            modelBuilder.Entity<FiscalYear>()
                .HasQueryFilter(f => _currentUserService.CanSeeAllBranches || f.BranchId == _currentUserService.BranchId);
            modelBuilder.Entity<RecurringJournalTemplate>()
                .HasQueryFilter(r => _currentUserService.CanSeeAllBranches || r.BranchId == _currentUserService.BranchId);
            modelBuilder.Entity<VehicleCostAccountMapping>()
                .HasQueryFilter(m => _currentUserService.CanSeeAllBranches || m.BranchId == _currentUserService.BranchId);

            // Document Control & Idempotency Configurations
            modelBuilder.Entity<IdempotencyRecord>()
                .HasIndex(r => new { r.BranchId, r.OperationType, r.IdempotencyKey })
                .IsUnique();

            modelBuilder.Entity<ReceiptArchiveRecord>()
                .HasIndex(r => r.PaymentId)
                .IsUnique();

            modelBuilder.Entity<IdempotencyRecord>()
                .HasQueryFilter(r => _currentUserService.CanSeeAllBranches || r.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<ReceiptArchiveRecord>()
                .HasQueryFilter(r => _currentUserService.CanSeeAllBranches || r.BranchId == _currentUserService.BranchId);

            // ─── VehicleStatusHistory ───────────────────────────────────────────────────
            modelBuilder.Entity<VehicleStatusHistory>()
                .HasOne(h => h.Vehicle)
                .WithMany(v => v.StatusHistory)
                .HasForeignKey(h => h.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<VehicleStatusHistory>()
                .HasIndex(h => h.VehicleId);
            modelBuilder.Entity<VehicleStatusHistory>()
                .HasIndex(h => h.ChangedAt);

            // ─── Performance Indexes ────────────────────────────────────────────────────
            modelBuilder.Entity<Customer>().HasIndex(c => c.Phone);
            modelBuilder.Entity<Customer>().HasIndex(c => c.Name);
            modelBuilder.Entity<Customer>().HasIndex(c => c.IsDeleted);
            modelBuilder.Entity<Customer>().HasIndex(c => c.IsBlacklisted);

            modelBuilder.Entity<Vehicle>().HasIndex(v => v.Status);
            modelBuilder.Entity<Vehicle>().HasIndex(v => v.PlateNumber);
            modelBuilder.Entity<Vehicle>().HasIndex(v => v.IsDeleted);
            modelBuilder.Entity<Vehicle>().HasIndex(v => new { v.Brand, v.Model, v.Year });

            modelBuilder.Entity<Installment>().HasIndex(i => new { i.DueDate, i.Status });
            modelBuilder.Entity<Installment>().HasIndex(i => i.Status);

            modelBuilder.Entity<Payment>().HasIndex(p => p.CreatedAt);

            modelBuilder.Entity<SalesContract>().HasIndex(sc => sc.SaleDate);
            modelBuilder.Entity<Employee>().HasIndex(e => e.IsDeleted);
            modelBuilder.Entity<Supplier>().HasIndex(s => s.IsDeleted);
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            // ربط معترض حفظ التغيرات لتشغيل التدقيق والمراجعة والقيود المالية الصارمة
            optionsBuilder.AddInterceptors(_auditableInterceptor);
            base.OnConfiguring(optionsBuilder);
        }

        // فرض قواعد الأمان المالي والتشغيلي
        public override Task<int> SaveChangesAsync(System.Threading.CancellationToken cancellationToken = default)
        {
            // 1. العميل: منع تغيير الحساب المالي
            foreach (var entry in ChangeTracker.Entries<Customer>())
            {
                if (entry.State == EntityState.Modified)
                {
                    var originalAccountId = entry.OriginalValues.GetValue<Guid>("AccountId");
                    var currentAccountId = entry.CurrentValues.GetValue<Guid>("AccountId");
                    if (originalAccountId != currentAccountId)
                    {
                        throw new InvalidOperationException("قوانين الأمان: لا يمكن تغيير الحساب المالي المرتبط بالعميل بعد إنشائه.");
                    }
                }
            }

            // 2. المورد: منع تغيير الحساب المالي
            foreach (var entry in ChangeTracker.Entries<Supplier>())
            {
                if (entry.State == EntityState.Modified)
                {
                    var originalAccountId = entry.OriginalValues.GetValue<Guid>("AccountId");
                    var currentAccountId = entry.CurrentValues.GetValue<Guid>("AccountId");
                    if (originalAccountId != currentAccountId)
                    {
                        throw new InvalidOperationException("قوانين الأمان: لا يمكن تغيير الحساب المالي المرتبط بالمورد بعد إنشائه.");
                    }
                }
            }

            // 3. عقود المبيعات: منع تغيير العميل والسيارة
            foreach (var entry in ChangeTracker.Entries<SalesContract>())
            {
                if (entry.State == EntityState.Modified)
                {
                    var originalCustomerId = entry.OriginalValues.GetValue<Guid>("CustomerId");
                    var currentCustomerId = entry.CurrentValues.GetValue<Guid>("CustomerId");
                    var originalVehicleId = entry.OriginalValues.GetValue<Guid>("VehicleId");
                    var currentVehicleId = entry.CurrentValues.GetValue<Guid>("VehicleId");

                    if (originalCustomerId != currentCustomerId || originalVehicleId != currentVehicleId)
                    {
                        throw new InvalidOperationException("قوانين الأمان: لا يمكن تغيير العميل أو السيارة المرتبطة بعقد المبيعات بعد إنشائه.");
                    }
                }
            }

            // 4. المشتريات: منع تغيير المورد والسيارة
            foreach (var entry in ChangeTracker.Entries<Purchase>())
            {
                if (entry.State == EntityState.Modified)
                {
                    var originalSupplierId = entry.OriginalValues.GetValue<Guid>("SupplierId");
                    var currentSupplierId = entry.CurrentValues.GetValue<Guid>("SupplierId");
                    var originalVehicleId = entry.OriginalValues.GetValue<Guid>("VehicleId");
                    var currentVehicleId = entry.CurrentValues.GetValue<Guid>("VehicleId");

                    if (originalSupplierId != currentSupplierId || originalVehicleId != currentVehicleId)
                    {
                        throw new InvalidOperationException("قوانين الأمان: لا يمكن تغيير المورد أو السيارة المرتبطة بفاتورة الشراء بعد إنشائها.");
                    }
                }
            }

            // 5. تسجيل تاريخ تغيير حالة السيارة تلقائياً
            var vehicleStatusChanges = new List<VehicleStatusHistory>();
            foreach (var entry in ChangeTracker.Entries<Vehicle>())
            {
                if (entry.State == EntityState.Modified)
                {
                    var originalStatus = entry.OriginalValues.GetValue<string>("Status");
                    var currentStatus  = entry.CurrentValues.GetValue<string>("Status");
                    if (originalStatus != currentStatus)
                    {
                        vehicleStatusChanges.Add(new VehicleStatusHistory
                        {
                            VehicleId  = entry.Entity.Id,
                            OldStatus  = originalStatus,
                            NewStatus  = currentStatus,
                            ChangedBy  = _currentUserService.UserId,
                            ChangedAt  = DateTime.UtcNow,
                            BranchId   = entry.Entity.BranchId,
                        });
                    }
                }
            }

            if (vehicleStatusChanges.Count > 0)
                VehicleStatusHistories.AddRange(vehicleStatusChanges);

            return base.SaveChangesAsync(cancellationToken);
        }
    }
}
