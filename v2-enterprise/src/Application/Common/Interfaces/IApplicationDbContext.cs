using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Application.Common.Interfaces
{
    public interface IApplicationDbContext
    {
        DbSet<Branch> Branches { get; }
        DbSet<User> Users { get; }
        DbSet<Role> Roles { get; }
        DbSet<Permission> Permissions { get; }
        DbSet<UserRole> UserRoles { get; }
        DbSet<RolePermission> RolePermissions { get; }
        DbSet<Account> Accounts { get; }
        DbSet<JournalEntry> JournalEntries { get; }
        DbSet<JournalLine> JournalLines { get; }
        DbSet<AuditLog> AuditLogs { get; }
        DbSet<Vehicle> Vehicles { get; }
        DbSet<Payment> Payments { get; }
        DbSet<Customer> Customers { get; }
        DbSet<CustomerDocument> CustomerDocuments { get; }
        DbSet<VehicleImage> VehicleImages { get; }
        DbSet<VehicleCost> VehicleCosts { get; }
        DbSet<Supplier> Suppliers { get; }
        DbSet<SalesContract> SalesContracts { get; }
        DbSet<Purchase> Purchases { get; }
        DbSet<InstallmentPlan> InstallmentPlans { get; }
        DbSet<Installment> Installments { get; }
        DbSet<CashboxClose> CashboxCloses { get; }
        DbSet<Expense> Expenses { get; }
        DbSet<Employee> Employees { get; }
        DbSet<CrmInteraction> CrmInteractions { get; }
        DbSet<Deal> Deals { get; }
        DbSet<EmployeeCommission> EmployeeCommissions { get; }
        DbSet<EmployeeTarget> EmployeeTargets { get; }
        DbSet<FiscalYear> FiscalYears { get; }
        DbSet<RecurringJournalTemplate> RecurringJournalTemplates { get; }
        DbSet<RecurringTemplateLine> RecurringTemplateLines { get; }
        DbSet<AppUser> AppUsers { get; }
        DbSet<Conversation> Conversations { get; }
        DbSet<Message> Messages { get; }

        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
