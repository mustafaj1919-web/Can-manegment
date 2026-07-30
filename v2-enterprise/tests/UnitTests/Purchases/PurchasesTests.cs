using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using Moq;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Suppliers.Commands;
using CarShowroomManagementV2.Application.Purchases.Commands;
using CarShowroomManagementV2.Infrastructure.Persistence;
using CarShowroomManagementV2.Infrastructure.Persistence.Interceptors;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.UnitTests.Purchases
{
    public class PurchasesTests : IDisposable
    {
        private readonly Mock<ICurrentUserService> _currentUserServiceMock;
        private readonly AuditableEntitySaveChangesInterceptor _interceptor;
        private readonly Guid _testBranchId = Guid.NewGuid();
        private readonly Microsoft.Data.Sqlite.SqliteConnection _connection;

        public PurchasesTests()
        {
            _currentUserServiceMock = new Mock<ICurrentUserService>();
            _currentUserServiceMock.Setup(x => x.UserId).Returns("test-user-01");
            _currentUserServiceMock.Setup(x => x.BranchId).Returns(_testBranchId);

            _interceptor = new AuditableEntitySaveChangesInterceptor(_currentUserServiceMock.Object);

            _connection = new Microsoft.Data.Sqlite.SqliteConnection("DataSource=:memory:");
            _connection.Open();
        }

        private ApplicationDbContext GetSqliteDbContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .Options;

            var context = new ApplicationDbContext(options, _currentUserServiceMock.Object, _interceptor);
            context.Database.EnsureCreated();
            return context;
        }

        public void Dispose()
        {
            _connection.Close();
            _connection.Dispose();
        }

        // ── دوال المساعدة لتهيئة البيانات (Seeding Helpers) ───────────────────────────────────
        
        private async Task<Branch> SeedBranchAsync(ApplicationDbContext context, Guid branchId, string name, string code)
        {
            var branch = new Branch { Id = branchId, Name = name, Code = code, IsActive = true };
            context.Branches.Add(branch);
            await context.SaveChangesAsync();
            return branch;
        }

        private async Task<Account> SeedAccountAsync(ApplicationDbContext context, Guid accountId, string code, string name, AccountType type, Guid branchId)
        {
            var account = new Account
            {
                Id = accountId,
                AccountCode = code,
                Name = name,
                Type = type,
                BranchId = branchId,
                IsActive = true
            };
            context.Accounts.Add(account);
            await context.SaveChangesAsync();
            return account;
        }

        private async Task<Supplier> SeedSupplierAsync(ApplicationDbContext context, Guid supplierId, string name, string code, Guid branchId)
        {
            var parent = await context.Accounts.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.AccountCode == "2101" && a.BranchId == branchId);
            if (parent == null)
            {
                parent = await SeedAccountAsync(context, Guid.NewGuid(), "2101", "Accounts Payable", AccountType.Liability, branchId);
            }

            var subAccount = await SeedAccountAsync(context, Guid.NewGuid(), $"21010001", $"حساب المورد - {name}", AccountType.Liability, branchId);

            var supplier = new Supplier
            {
                Id = supplierId,
                Name = name,
                Code = code,
                Phone = "077001122",
                AccountId = subAccount.Id,
                BranchId = branchId
            };
            context.Suppliers.Add(supplier);
            await context.SaveChangesAsync();
            return supplier;
        }

        private async Task<Customer> SeedCustomerAsync(ApplicationDbContext context, Guid customerId, string name, Guid branchId)
        {
            var parent = await context.Accounts.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.AccountCode == "1301" && a.BranchId == branchId);
            if (parent == null)
            {
                parent = await SeedAccountAsync(context, Guid.NewGuid(), "1301", "Accounts Receivable", AccountType.Asset, branchId);
            }

            var subAccount = await SeedAccountAsync(context, Guid.NewGuid(), "13010001", $"حساب الزبون - {name}", AccountType.Asset, branchId);

            var customer = new Customer
            {
                Id = customerId,
                Name = name,
                Phone = "07800998877",
                IdNumber = "CUST-101",
                CustomerType = "Individual",
                AccountId = subAccount.Id,
                BranchId = branchId
            };
            context.Customers.Add(customer);
            await context.SaveChangesAsync();
            return customer;
        }

        // ── الاختبارات البرمجية ───────────────────────────────────────────────────────────────

        [Fact]
        public async Task CreateSupplier_ShouldGenerateSubledgerAccountSuccessfully()
        {
            // Arrange
            var context = GetSqliteDbContext();
            await SeedBranchAsync(context, _testBranchId, "فرع بغداد", "BR-BG");
            var parentAccount = await SeedAccountAsync(context, Guid.NewGuid(), "2101", "Accounts Payable", AccountType.Liability, _testBranchId);

            var handler = new CreateSupplierCommandHandler(context, _currentUserServiceMock.Object);
            var command = new CreateSupplierCommand
            {
                Name = "مورد سيارات الخليج",
                Code = "SUP-GULF",
                Phone = "0790123456"
            };

            // Act
            var supplierId = await handler.Handle(command, CancellationToken.None);

            // Assert
            supplierId.Should().NotBeEmpty();

            var supplier = await context.Suppliers.Include(s => s.Account).FirstOrDefaultAsync(s => s.Id == supplierId);
            supplier.Should().NotBeNull();
            supplier!.Name.Should().Be("مورد سيارات الخليج");
            
            // التحقق من الحساب المساعد المولّد تلقائيًا
            supplier.Account.Should().NotBeNull();
            supplier.Account!.AccountCode.Should().Be("21010001");
            supplier.Account.ParentAccountId.Should().Be(parentAccount.Id);
            supplier.Account.Type.Should().Be(AccountType.Liability);
        }

        [Fact]
        public async Task CreatePurchase_ShouldIncreaseInventory_AndGenerateBalancedJournalEntry()
        {
            // Arrange
            var context = GetSqliteDbContext();
            await SeedBranchAsync(context, _testBranchId, "فرع بغداد", "BR-BG");
            await SeedAccountAsync(context, Guid.NewGuid(), "1201", "مخزون السيارات للمعرض", AccountType.Asset, _testBranchId);
            var supplier = await SeedSupplierAsync(context, Guid.NewGuid(), "مورد سيارات الخليج", "SUP-GULF", _testBranchId);

            var handler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var command = new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Supplier,
                SupplierId = supplier.Id,
                PurchaseCost = 20000,
                PaymentMethod = PaymentMethod.Cheque, // استحقاق دائن للمورد
                Model = "Hyundai Tucson",
                ChassisNumber = "CH-TUCSON-888",
                Year = 2024,
                TargetSellingPrice = 23000
            };

            // Act
            var purchaseId = await handler.Handle(command, CancellationToken.None);

            // Assert
            purchaseId.Should().NotBeEmpty();

            // 1. التحقق من وجود السيارة وتحديث حالتها
            var vehicle = await context.Vehicles.FirstOrDefaultAsync(v => v.ChassisNumber == "CH-TUCSON-888");
            vehicle.Should().NotBeNull();
            vehicle!.PurchaseCost.Should().Be(20000);
            vehicle.BookValue.Should().Be(20000);
            vehicle.Status.Should().Be("Available");
            vehicle.IsSold.Should().BeFalse();

            // 2. التحقق من قيد المشتريات
            var journalEntry = await context.JournalEntries.Include(je => je.Lines)
                .FirstOrDefaultAsync(je => je.ReferenceType == "Purchase" && je.ReferenceId == purchaseId);
            
            journalEntry.Should().NotBeNull();
            journalEntry!.IsBalanced.Should().BeTrue();
            journalEntry.TotalDebit.Should().Be(20000);

            // التحقق من حساب المورد الدائن وحساب المخزون المدين
            var debitLine = journalEntry.Lines.FirstOrDefault(l => l.Debit > 0);
            var creditLine = journalEntry.Lines.FirstOrDefault(l => l.Credit > 0);

            debitLine!.Account!.AccountCode.Should().Be("1201");
            creditLine!.AccountId.Should().Be(supplier.AccountId);
        }

        [Fact]
        public async Task CreatePurchase_FromCustomer_ShouldCreditCustomerAccount_AndGenerateBalancedJournalEntry()
        {
            // Arrange
            var context = GetSqliteDbContext();
            await SeedBranchAsync(context, _testBranchId, "فرع بغداد", "BR-BG");
            await SeedAccountAsync(context, Guid.NewGuid(), "1201", "مخزون السيارات للمعرض", AccountType.Asset, _testBranchId);
            var customer = await SeedCustomerAsync(context, Guid.NewGuid(), "أحمد علي", _testBranchId);

            var handler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var command = new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = customer.Id,
                PurchaseCost = 35000000,
                PaymentMethod = PaymentMethod.Cheque, // آجل كامل على حساب الزبون
                Model = "Toyota Camry",
                ChassisNumber = "CH-CAMRY-999",
                Year = 2023,
                TargetSellingPrice = 38000000
            };

            // Act
            var purchaseId = await handler.Handle(command, CancellationToken.None);

            // Assert
            purchaseId.Should().NotBeEmpty();

            var purchase = await context.Purchases.FirstOrDefaultAsync(p => p.Id == purchaseId);
            purchase.Should().NotBeNull();
            purchase!.SourceType.Should().Be(PurchaseSourceType.Customer);
            purchase.CustomerId.Should().Be(customer.Id);
            purchase.SupplierId.Should().BeNull();

            // قيد المشتريات: مدين المخزون / دائن حساب الزبون
            var journalEntry = await context.JournalEntries.Include(je => je.Lines)
                .FirstOrDefaultAsync(je => je.ReferenceType == "Purchase" && je.ReferenceId == purchaseId);
            
            journalEntry.Should().NotBeNull();
            journalEntry!.IsBalanced.Should().BeTrue();
            journalEntry.TotalDebit.Should().Be(35000000);

            var creditLine = journalEntry.Lines.FirstOrDefault(l => l.Credit > 0);
            creditLine!.AccountId.Should().Be(customer.AccountId);
        }

        [Fact]
        public async Task CreatePurchase_FromCustomer_WithImmediatePayment_ShouldGeneratePaymentJournalEntry()
        {
            // Arrange
            var context = GetSqliteDbContext();
            await SeedBranchAsync(context, _testBranchId, "فرع بغداد", "BR-BG");
            await SeedAccountAsync(context, Guid.NewGuid(), "1201", "مخزون السيارات", AccountType.Asset, _testBranchId);
            await SeedAccountAsync(context, Guid.NewGuid(), "111001", "صندوق النقدية", AccountType.Asset, _testBranchId);
            var customer = await SeedCustomerAsync(context, Guid.NewGuid(), "عمر خالد", _testBranchId);

            var handler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var command = new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = customer.Id,
                PurchaseCost = 15000000,
                PaidAmount = 15000000,
                PaymentMethod = PaymentMethod.Cash,
                Model = "Kia Sportage",
                ChassisNumber = "CH-KIA-555",
                Year = 2022,
                TargetSellingPrice = 17000000
            };

            // Act
            var purchaseId = await handler.Handle(command, CancellationToken.None);

            // Assert
            var purchase = await context.Purchases.FirstOrDefaultAsync(p => p.Id == purchaseId);
            purchase!.AmountPaid.Should().Be(15000000);

            // قيد السداد الفوري: مدين حساب الزبون / دائن صندوق النقدية
            var payJournal = await context.JournalEntries.Include(je => je.Lines)
                .FirstOrDefaultAsync(je => je.ReferenceType == "PurchasePayment" && je.ReferenceId == purchaseId);

            payJournal.Should().NotBeNull();
            payJournal!.IsBalanced.Should().BeTrue();
            
            var debitLine = payJournal.Lines.FirstOrDefault(l => l.Debit > 0);
            debitLine!.AccountId.Should().Be(customer.AccountId);
        }

        [Fact]
        public async Task QueryPurchasesAndSuppliers_ShouldFilterByBranchAutomatically()
        {
            // Arrange
            var context = GetSqliteDbContext();
            var branchA = _testBranchId;
            var branchB = Guid.NewGuid();

            await SeedBranchAsync(context, branchA, "الفرع A", "BR-A");
            await SeedBranchAsync(context, branchB, "الفرع B", "BR-B");

            var supplierA = await SeedSupplierAsync(context, Guid.NewGuid(), "Supplier A", "SUP-A", branchA);
            var supplierB = await SeedSupplierAsync(context, Guid.NewGuid(), "Supplier B", "SUP-B", branchB);

            // Act
            var suppliers = await context.Suppliers.ToListAsync();

            // Assert
            suppliers.Should().ContainSingle();
            suppliers.First().Code.Should().Be("SUP-A");
        }
    }
}
