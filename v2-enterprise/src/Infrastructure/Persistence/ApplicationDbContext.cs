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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

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

            // إعدادات المشتريات
            modelBuilder.Entity<Purchase>()
                .HasIndex(p => new { p.PurchaseNumber, p.BranchId })
                .IsUnique();

            modelBuilder.Entity<Purchase>()
                .HasOne(p => p.Supplier)
                .WithMany()
                .HasForeignKey(p => p.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Purchase>()
                .HasOne(p => p.Vehicle)
                .WithMany()
                .HasForeignKey(p => p.VehicleId)
                .OnDelete(DeleteBehavior.Restrict);

            // إعدادات الأقساط
            modelBuilder.Entity<InstallmentPlan>()
                .HasOne(ip => ip.SalesContract)
                .WithOne(sc => sc.InstallmentPlan)
                .HasForeignKey<InstallmentPlan>(ip => ip.SalesContractId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<InstallmentPlan>()
                .HasMany(ip => ip.Installments)
                .WithOne(i => i.InstallmentPlan)
                .HasForeignKey(i => i.InstallmentPlanId)
                .OnDelete(DeleteBehavior.Cascade);

            // تفعيل فلاتر الاستعلام العامة لعزل الفروع (Global Branch Query Filters)
            // سيتم إخفاء أي بيانات تنتمي لفروع أخرى تلقائياً
            modelBuilder.Entity<Account>()
                .HasQueryFilter(a => a.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<JournalEntry>()
                .HasQueryFilter(j => j.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<Vehicle>()
                .HasQueryFilter(v => v.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<Payment>()
                .HasQueryFilter(p => p.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<AuditLog>()
                .HasQueryFilter(al => al.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<Customer>()
                .HasQueryFilter(c => c.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<Supplier>()
                .HasQueryFilter(s => s.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<SalesContract>()
                .HasQueryFilter(sc => sc.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<Purchase>()
                .HasQueryFilter(p => p.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<InstallmentPlan>()
                .HasQueryFilter(ip => ip.BranchId == _currentUserService.BranchId);

            modelBuilder.Entity<Installment>()
                .HasQueryFilter(i => i.BranchId == _currentUserService.BranchId);
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

            return base.SaveChangesAsync(cancellationToken);
        }
    }
}
