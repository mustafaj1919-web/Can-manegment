using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using Moq;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Customers.Commands;
using CarShowroomManagementV2.Infrastructure.Persistence;
using CarShowroomManagementV2.Infrastructure.Persistence.Interceptors;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.UnitTests.Sales
{
    public class SalesTests : IDisposable
    {
        private readonly Mock<ICurrentUserService> _currentUserServiceMock;
        private readonly AuditableEntitySaveChangesInterceptor _interceptor;
        private readonly Guid _testBranchId = Guid.NewGuid();
        private readonly Microsoft.Data.Sqlite.SqliteConnection _connection;

        public SalesTests()
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

        private async Task<Customer> SeedCustomerAsync(ApplicationDbContext context, Guid customerId, string name, Guid branchId)
        {
            var parent = await context.Accounts.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.AccountCode == "1301" && a.BranchId == branchId);
            if (parent == null)
            {
                parent = await SeedAccountAsync(context, Guid.NewGuid(), "1301", "Accounts Receivable", AccountType.Asset, branchId);
            }

            var subAccount = await SeedAccountAsync(context, Guid.NewGuid(), $"13010001", $"حساب العميل - {name}", AccountType.Asset, branchId);

            var customer = new Customer
            {
                Id = customerId,
                Name = name,
                Phone = "07700000000",
                IdNumber = "NID-" + Guid.NewGuid().ToString("N").Substring(0, 6),
                AccountId = subAccount.Id,
                BranchId = branchId
            };
            context.Customers.Add(customer);
            await context.SaveChangesAsync();
            return customer;
        }

        private async Task<Vehicle> SeedVehicleAsync(ApplicationDbContext context, Guid vehicleId, string model, string chassis, decimal purchaseCost, Guid branchId)
        {
            var vehicle = new Vehicle
            {
                Id = vehicleId,
                Model = model,
                ChassisNumber = chassis,
                PurchaseCost = purchaseCost,
                BookValue = purchaseCost,
                Status = "Available",
                IsSold = false,
                BranchId = branchId
            };
            context.Vehicles.Add(vehicle);
            await context.SaveChangesAsync();
            return vehicle;
        }

        private async Task SeedAccountingSetupAsync(ApplicationDbContext context, Guid branchId)
        {
            await SeedAccountAsync(context, Guid.NewGuid(), "1201", "مخزون السيارات للمعرض", AccountType.Asset, branchId);
            await SeedAccountAsync(context, Guid.NewGuid(), "4101", "إيرادات مبيعات السيارات", AccountType.Revenue, branchId);
            await SeedAccountAsync(context, Guid.NewGuid(), "5101", "تكلفة السيارات المباعة COGS", AccountType.Expense, branchId);
            await SeedAccountAsync(context, Guid.NewGuid(), "1101", "صندوق النقدية الرئيسي", AccountType.Asset, branchId);
            await SeedAccountAsync(context, Guid.NewGuid(), "2202", "ضريبة المبيعات المستحقة", AccountType.Liability, branchId);
            await SeedAccountAsync(context, Guid.NewGuid(), "2203", "أمانات رسوم التسجيل", AccountType.Liability, branchId);
            await SeedAccountAsync(context, Guid.NewGuid(), "2301", "إيرادات أقساط مؤجلة", AccountType.Liability, branchId);
            await SeedAccountAsync(context, Guid.NewGuid(), "4102", "إيرادات أقساط محققة", AccountType.Revenue, branchId);
        }

        // ── الاختبارات البرمجية ───────────────────────────────────────────────────────────────

        [Fact]
        public async Task CreateSaleContract_CashSale_ShouldGenerateBalancedJournalEntry_AndMarkVehicleAsSold()
        {
            // Arrange
            var context = GetSqliteDbContext();
            await SeedBranchAsync(context, _testBranchId, "الفرع الرئيسي", "BR-01");
            await SeedAccountingSetupAsync(context, _testBranchId);
            
            var customer = await SeedCustomerAsync(context, Guid.NewGuid(), "أحمد البغدادي", _testBranchId);
            var vehicle = await SeedVehicleAsync(context, Guid.NewGuid(), "Toyota Camry", "CH-CAMRY-111", 15000, _testBranchId);

            var handler = new CreateSaleContractCommandHandler(context, _currentUserServiceMock.Object);

            var command = new CreateSaleContractCommand
            {
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 18000,
                TaxAmount = 500,
                RegistrationFees = 200,
                Discount = 100,
                DownPayment = 18600, // 18000 + 500 + 200 - 100
                PaymentMethod = PaymentMethod.Cash
            };

            // Act
            var contractId = await handler.Handle(command, CancellationToken.None);

            // Assert
            contractId.Should().NotBeEmpty();

            // 1. التأكد من تحديث السيارة
            var dbVehicle = await context.Vehicles.FindAsync(vehicle.Id);
            dbVehicle!.IsSold.Should().BeTrue();
            dbVehicle.Status.Should().Be("Sold");

            // 2. التأكد من حفظ عقد البيع
            var contract = await context.SalesContracts.FindAsync(contractId);
            contract.Should().NotBeNull();
            contract!.NetPrice.Should().Be(18600);
            contract.RemainingBalance.Should().Be(0);
            contract.Profit.Should().Be(3000); // 18000 - 15000 (BookValue)

            // 3. التأكد من توليد قيد يومية متوازن
            var journalEntry = await context.JournalEntries.Include(je => je.Lines).ThenInclude(l => l.Account)
                .FirstOrDefaultAsync(je => je.ReferenceType == "SaleContract" && je.ReferenceId == contractId);
            
            journalEntry.Should().NotBeNull();
            journalEntry!.IsBalanced.Should().BeTrue();
            journalEntry.TotalDebit.Should().Be(18600 + 15000); // NetPrice + Vehicle BookValue (COGS)

            // التحقق من عزل الضرائب والرسوم في القيود
            var taxLine = journalEntry.Lines.FirstOrDefault(l => l.Account != null && l.Account.AccountCode == "2202");
            taxLine.Should().NotBeNull();
            taxLine!.Credit.Should().Be(500);

            var feesLine = journalEntry.Lines.FirstOrDefault(l => l.Account != null && l.Account.AccountCode == "2203");
            feesLine.Should().NotBeNull();
            feesLine!.Credit.Should().Be(200);

            var revenueLine = journalEntry.Lines.FirstOrDefault(l => l.Account != null && l.Account.AccountCode == "4101");
            revenueLine.Should().NotBeNull();
            revenueLine!.Credit.Should().Be(17900); // SalePrice (18000) - Discount (100)
        }

        [Fact]
        public async Task CreateSaleContract_AttemptingToSellSoldVehicle_ShouldThrowException()
        {
            // Arrange
            var context = GetSqliteDbContext();
            await SeedBranchAsync(context, _testBranchId, "الفرع الرئيسي", "BR-01");
            await SeedAccountingSetupAsync(context, _testBranchId);
            
            var customer = await SeedCustomerAsync(context, Guid.NewGuid(), "أحمد البغدادي", _testBranchId);
            var vehicle = await SeedVehicleAsync(context, Guid.NewGuid(), "Kia Optima", "CH-KIA-222", 12000, _testBranchId);
            
            // بيع السيارة مسبقاً
            vehicle.IsSold = true;
            vehicle.Status = "Sold";
            context.Vehicles.Update(vehicle);
            await context.SaveChangesAsync();

            var handler = new CreateSaleContractCommandHandler(context, _currentUserServiceMock.Object);

            var command = new CreateSaleContractCommand
            {
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 14000,
                PaymentMethod = PaymentMethod.Cash,
                DownPayment = 14000
            };

            // Act & Assert
            Func<Task> act = async () => await handler.Handle(command, CancellationToken.None);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*مباعة مسبقاً*");
        }

        [Fact]
        public async Task CancelSaleContract_ShouldCreateReversalJournalEntry_AndMakeVehicleAvailableAgain()
        {
            // Arrange
            var context = GetSqliteDbContext();
            await SeedBranchAsync(context, _testBranchId, "الفرع الرئيسي", "BR-01");
            await SeedAccountingSetupAsync(context, _testBranchId);
            
            var customer = await SeedCustomerAsync(context, Guid.NewGuid(), "أحمد البغدادي", _testBranchId);
            var vehicle = await SeedVehicleAsync(context, Guid.NewGuid(), "Toyota Camry", "CH-CAMRY-111", 15000, _testBranchId);

            var createHandler = new CreateSaleContractCommandHandler(context, _currentUserServiceMock.Object);
            var cancelHandler = new CancelSaleContractCommandHandler(context, _currentUserServiceMock.Object);

            var createCommand = new CreateSaleContractCommand
            {
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 18000,
                DownPayment = 18000,
                PaymentMethod = PaymentMethod.Cash
            };

            var contractId = await createHandler.Handle(createCommand, CancellationToken.None);

            // Act
            var cancelResult = await cancelHandler.Handle(new CancelSaleContractCommand { ContractId = contractId }, CancellationToken.None);

            // Assert
            cancelResult.Should().BeTrue();

            // 1. السيارة متاحة مجدداً
            var dbVehicle = await context.Vehicles.FindAsync(vehicle.Id);
            dbVehicle!.IsSold.Should().BeFalse();
            dbVehicle.Status.Should().Be("Available");

            // 2. العقد ملغي
            var dbContract = await context.SalesContracts.FindAsync(contractId);
            dbContract!.Status.Should().Be("Cancelled");

            // 3. التحقق من قيد التسوية العكسي
            var originalEntry = await context.JournalEntries
                .FirstOrDefaultAsync(je => je.ReferenceType == "SaleContract" && je.ReferenceId == contractId);
            
            var reversalEntry = await context.JournalEntries.Include(je => je.Lines)
                .FirstOrDefaultAsync(je => je.ReferenceType == "SaleContractCancel" && je.ReferenceId == contractId);

            reversalEntry.Should().NotBeNull();
            reversalEntry!.ReversedEntryId.Should().Be(originalEntry!.Id);
            reversalEntry.IsBalanced.Should().BeTrue();

            // التأكد من أن قيمة المدين والدائن في القيد العكسي تعكس الأصلي
            var originalDebit = originalEntry.TotalDebit;
            reversalEntry.TotalCredit.Should().Be(originalDebit);
        }

        [Fact]
        public async Task QuerySales_ShouldFilterByBranchAutomatically()
        {
            // Arrange
            var context = GetSqliteDbContext();
            var branchA = _testBranchId;
            var branchB = Guid.NewGuid();

            await SeedBranchAsync(context, branchA, "الفرع A", "BR-A");
            await SeedBranchAsync(context, branchB, "الفرع B", "BR-B");

            var customerA = await SeedCustomerAsync(context, Guid.NewGuid(), "عميل A", branchA);
            var customerB = await SeedCustomerAsync(context, Guid.NewGuid(), "عميل B", branchB);

            var vehicleA = await SeedVehicleAsync(context, Guid.NewGuid(), "Car A", "CH-A", 10000, branchA);
            var vehicleB = await SeedVehicleAsync(context, Guid.NewGuid(), "Car B", "CH-B", 10000, branchB);

            var contractA = new SalesContract
            {
                Id = Guid.NewGuid(),
                ContractNumber = "CON-A",
                CustomerId = customerA.Id,
                VehicleId = vehicleA.Id,
                SalePrice = 12000,
                NetPrice = 12000,
                BranchId = branchA
            };

            var contractB = new SalesContract
            {
                Id = Guid.NewGuid(),
                ContractNumber = "CON-B",
                CustomerId = customerB.Id,
                VehicleId = vehicleB.Id,
                SalePrice = 12000,
                NetPrice = 12000,
                BranchId = branchB
            };

            context.SalesContracts.AddRange(contractA, contractB);
            await context.SaveChangesAsync();

            // Act
            var list = await context.SalesContracts.ToListAsync();

            // Assert
            list.Should().ContainSingle();
            list.First().ContractNumber.Should().Be("CON-A");
        }
    }
}
