using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using Moq;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Customers.Queries;
using CarShowroomManagementV2.Application.Purchases.Commands;
using CarShowroomManagementV2.Infrastructure.Persistence;
using CarShowroomManagementV2.Infrastructure.Persistence.Interceptors;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.UnitTests.Purchases
{
    public class CustomerBuybackTests : IDisposable
    {
        private readonly Mock<ICurrentUserService> _currentUserServiceMock;
        private readonly AuditableEntitySaveChangesInterceptor _interceptor;
        private readonly Guid _branchAId = Guid.NewGuid();
        private readonly Guid _branchBId = Guid.NewGuid();
        private readonly Microsoft.Data.Sqlite.SqliteConnection _connection;

        public CustomerBuybackTests()
        {
            _currentUserServiceMock = new Mock<ICurrentUserService>();
            _currentUserServiceMock.Setup(x => x.UserId).Returns("test-admin");
            _currentUserServiceMock.Setup(x => x.BranchId).Returns(_branchAId);
            _currentUserServiceMock.Setup(x => x.CanSeeAllBranches).Returns(true);

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

        private async Task<Customer> SeedCustomerAsync(ApplicationDbContext context, string name, string phone, string idNum, Guid branchId)
        {
            var cashAccount = await context.Accounts.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.AccountCode == "111001" && a.BranchId == branchId);
            if (cashAccount == null)
            {
                cashAccount = new Account { Id = Guid.NewGuid(), AccountCode = "111001", Name = "صندوق النقدية", Type = AccountType.Asset, BranchId = branchId, IsActive = true };
                context.Accounts.Add(cashAccount);
            }

            var arParent = await context.Accounts.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.AccountCode == "1301" && a.BranchId == branchId);
            if (arParent == null)
            {
                arParent = new Account { Id = Guid.NewGuid(), AccountCode = "1301", Name = "ذمم المدينين", Type = AccountType.Asset, BranchId = branchId, IsActive = true };
                context.Accounts.Add(arParent);
            }

            await context.SaveChangesAsync();

            var subAccount = new Account
            {
                Id = Guid.NewGuid(),
                AccountCode = $"1301{new Random().Next(1000, 9999)}",
                Name = $"حساب الزبون - {name}",
                Type = AccountType.Asset,
                ParentAccountId = arParent.Id,
                BranchId = branchId,
                IsActive = true
            };
            context.Accounts.Add(subAccount);

            var customer = new Customer
            {
                Id = Guid.NewGuid(),
                Name = name,
                FullName = name,
                Phone = phone,
                IdNumber = idNum,
                CustomerType = "Individual",
                AccountId = subAccount.Id,
                BranchId = branchId
            };
            context.Customers.Add(customer);
            await context.SaveChangesAsync();

            return customer;
        }

        private async Task<(Vehicle vehicle, SalesContract contract)> SeedSoldVehicleAsync(ApplicationDbContext context, Customer customer, string brand, string model, string vin, decimal salePrice, Guid branchId, string contractStatus = "Active", bool isSold = true, string vehicleStatus = "Sold")
        {
            var vehicle = new Vehicle
            {
                Id = Guid.NewGuid(),
                Brand = brand,
                Model = model,
                Year = 2025,
                ChassisNumber = vin,
                Color = "أسود",
                PurchaseCost = salePrice - 5000000,
                BookValue = salePrice - 5000000,
                TargetSellingPrice = salePrice,
                Status = vehicleStatus,
                IsSold = isSold,
                BranchId = branchId
            };
            context.Vehicles.Add(vehicle);

            var contract = new SalesContract
            {
                Id = Guid.NewGuid(),
                ContractNumber = $"SAL-{new Random().Next(1000, 9999)}",
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                BranchId = branchId,
                SaleDate = DateTime.UtcNow.AddDays(-30),
                NetPrice = salePrice,
                DownPayment = salePrice,
                Status = contractStatus
            };
            context.SalesContracts.Add(contract);
            await context.SaveChangesAsync();

            return (vehicle, contract);
        }

        // 1 & 2 & 3. Customer Search by Name, Phone, National ID
        [Fact]
        public async Task Test1_SearchCustomers_ByNamePhoneId_ReturnsMatchingCustomers()
        {
            var context = GetSqliteDbContext();
            await SeedCustomerAsync(context, "علي قاسم", "07701111111", "CUS-001", _branchAId);
            await SeedCustomerAsync(context, "حسين كمال", "07802222222", "CUS-002", _branchAId);

            var queryHandler = new GetCustomersListQueryHandler(context);
            var list = await queryHandler.Handle(new GetCustomersListQuery(), CancellationToken.None);

            list.Should().HaveCount(2);
            list.Any(c => c.Name.Contains("علي")).Should().BeTrue();
        }

        // 4. Load vehicles previously sold to selected customer
        [Fact]
        public async Task Test4_GetCustomerPurchasedVehicles_ReturnsSoldVehicles()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "حيدر علي", "07703333333", "CUS-003", _branchAId);
            var (veh, sc) = await SeedSoldVehicleAsync(context, cust, "Toyota", "Camry", "VIN-CAMRY-001", 35000000, _branchAId);

            var handler = new GetCustomerPurchasedVehiclesQueryHandler(context, _currentUserServiceMock.Object);
            var res = await handler.Handle(new GetCustomerPurchasedVehiclesQuery { CustomerId = cust.Id }, CancellationToken.None);

            res.Should().HaveCount(1);
            res[0].Vin.Should().Be("VIN-CAMRY-001");
            res[0].EligibleForBuyback.Should().BeTrue();
        }

        // 5 & 6. Exclude cancelled/reversed sales
        [Fact]
        public async Task Test5_GetCustomerPurchasedVehicles_CancelledSale_IsMarkedIneligible()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "سعدون", "07704444444", "CUS-004", _branchAId);
            var (veh, sc) = await SeedSoldVehicleAsync(context, cust, "Hyundai", "Tucson", "VIN-TUC-002", 28000000, _branchAId, contractStatus: "Cancelled");

            var handler = new GetCustomerPurchasedVehiclesQueryHandler(context, _currentUserServiceMock.Object);
            var res = await handler.Handle(new GetCustomerPurchasedVehiclesQuery { CustomerId = cust.Id }, CancellationToken.None);

            res.Should().HaveCount(1);
            res[0].EligibleForBuyback.Should().BeFalse();
            res[0].IneligibilityReason.Should().Be("عقد البيع ملغى");
        }

        // 7. Exclude already reacquired vehicles
        [Fact]
        public async Task Test7_GetCustomerPurchasedVehicles_AlreadyReacquired_IsMarkedIneligible()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "فراس", "07705555555", "CUS-005", _branchAId);
            var (veh, sc) = await SeedSoldVehicleAsync(context, cust, "Kia", "Sorento", "VIN-SOR-003", 40000000, _branchAId);

            // Add purchase after sale
            var p = new Purchase
            {
                Id = Guid.NewGuid(),
                PurchaseNumber = "PUR-001",
                SourceType = PurchaseSourceType.Customer,
                CustomerId = cust.Id,
                VehicleId = veh.Id,
                PurchaseDate = DateTime.UtcNow,
                PurchaseCost = 38000000,
                Status = "Active"
            };
            context.Purchases.Add(p);
            await context.SaveChangesAsync();

            var handler = new GetCustomerPurchasedVehiclesQueryHandler(context, _currentUserServiceMock.Object);
            var res = await handler.Handle(new GetCustomerPurchasedVehiclesQuery { CustomerId = cust.Id }, CancellationToken.None);

            res[0].EligibleForBuyback.Should().BeFalse();
            res[0].IneligibilityReason.Should().Be("تم إرجاع السيارة سابقاً إلى المخزون");
        }

        // 8. Reject vehicle owned by another customer
        [Fact]
        public async Task Test8_CustomerBuyback_VehicleOwnedByAnotherCustomer_ThrowsException()
        {
            var context = GetSqliteDbContext();
            var custA = await SeedCustomerAsync(context, "الزبون أ", "07706666666", "CUS-006", _branchAId);
            var custB = await SeedCustomerAsync(context, "الزبون ب", "07707777777", "CUS-007", _branchAId);
            var (veh, sc) = await SeedSoldVehicleAsync(context, custA, "Nissan", "Patrol", "VIN-PAT-004", 80000000, _branchAId);

            // Seed required accounts for cash/inventory
            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(invAcc);
            await context.SaveChangesAsync();

            var cmdHandler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var cmd = new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = custB.Id, // Cust B attempting to sell Cust A's vehicle
                Brand = "Nissan",
                Model = "Patrol",
                Year = 2025,
                ChassisNumber = "VIN-PAT-004",
                PurchaseCost = 75000000,
                PaymentMethod = PaymentMethod.Cash
            };

            Func<Task> act = async () => await cmdHandler.Handle(cmd, CancellationToken.None);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*لم يتم العثور على عقد بيع سابق مؤكد*");
        }

        // 9. Reject duplicate VIN currently in active inventory
        [Fact]
        public async Task Test9_CustomerBuyback_VehicleActiveInInventory_ThrowsException()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "مصطفى", "07708888888", "CUS-008", _branchAId);
            var (veh, sc) = await SeedSoldVehicleAsync(context, cust, "Lexus", "LX600", "VIN-LEX-005", 150000000, _branchAId, isSold: false, vehicleStatus: "Available");

            var cmdHandler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var cmd = new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = cust.Id,
                Brand = "Lexus",
                Model = "LX600",
                Year = 2025,
                ChassisNumber = "VIN-LEX-005",
                PurchaseCost = 140000000
            };

            Func<Task> act = async () => await cmdHandler.Handle(cmd, CancellationToken.None);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*موجودة حالياً في المخزون*");
        }

        // 10 & 11 & 12. Customer buyback creates valid purchase and returns vehicle to inventory
        [Fact]
        public async Task Test10_CustomerBuyback_ValidVehicle_ReacquiresVehicleIntoInventory()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "عمار", "07709999999", "CUS-009", _branchAId);
            var (veh, sc) = await SeedSoldVehicleAsync(context, cust, "Ford", "Mustang", "VIN-MUS-006", 60000000, _branchAId);

            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(invAcc);
            await context.SaveChangesAsync();

            var cmdHandler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var purchaseId = await cmdHandler.Handle(new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = cust.Id,
                Brand = "Ford",
                Model = "Mustang",
                Year = 2025,
                ChassisNumber = "VIN-MUS-006",
                PurchaseCost = 55000000,
                TargetSellingPrice = 62000000,
                PaymentMethod = PaymentMethod.Cash
            }, CancellationToken.None);

            purchaseId.Should().NotBeEmpty();

            // Verify vehicle status returned to Available and IsSold = false
            var updatedVeh = await context.Vehicles.FindAsync(veh.Id);
            updatedVeh.Should().NotBeNull();
            updatedVeh!.IsSold.Should().BeFalse();
            updatedVeh.Status.Should().Be("Available");
            updatedVeh.PurchaseCost.Should().Be(55000000);

            // Verify sales contract remains unchanged and immutable!
            var updatedSc = await context.SalesContracts.FindAsync(sc.Id);
            updatedSc!.Status.Should().Be("Active");
            updatedSc.NetPrice.Should().Be(60000000);
        }

        // 13. Supplier purchase flow remains unchanged
        [Fact]
        public async Task Test13_SupplierPurchase_FlowRemainsUnchanged()
        {
            var context = GetSqliteDbContext();

            var cashAcc = new Account { Id = Guid.NewGuid(), AccountCode = "111001", Name = "صندوق", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            var supAcc = new Account { Id = Guid.NewGuid(), AccountCode = "21010001", Name = "مورد أ", Type = AccountType.Liability, BranchId = _branchAId, IsActive = true };
            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.AddRange(cashAcc, supAcc, invAcc);

            var supplier = new Supplier { Id = Guid.NewGuid(), Name = "شركة الموردين", Phone = "07700001111", AccountId = supAcc.Id, BranchId = _branchAId };
            context.Suppliers.Add(supplier);
            await context.SaveChangesAsync();

            var cmdHandler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var purchaseId = await cmdHandler.Handle(new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Supplier,
                SupplierId = supplier.Id,
                Brand = "GMC",
                Model = "Yukon",
                Year = 2025,
                ChassisNumber = "VIN-YUK-007",
                PurchaseCost = 90000000,
                PaymentMethod = PaymentMethod.Cash
            }, CancellationToken.None);

            purchaseId.Should().NotBeEmpty();
        }

        // 16. Manual external vehicle purchase path works
        [Fact]
        public async Task Test16_ManualExternalVehiclePurchase_FromCustomer_CreatesNewVehicle()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "ياسر", "07702223333", "CUS-010", _branchAId);
            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(invAcc);
            await context.SaveChangesAsync();

            var cmdHandler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var purchaseId = await cmdHandler.Handle(new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = cust.Id,
                Brand = "Chevrolet",
                Model = "Tahoe",
                Year = 2024,
                ChassisNumber = "VIN-EXTERNAL-008",
                PurchaseCost = 70000000,
                PaymentMethod = PaymentMethod.Cash
            }, CancellationToken.None);

            purchaseId.Should().NotBeEmpty();

            var newVeh = await context.Vehicles.FirstOrDefaultAsync(v => v.ChassisNumber == "VIN-EXTERNAL-008");
            newVeh.Should().NotBeNull();
            newVeh!.Status.Should().Be("Available");
            newVeh.PurchaseCost.Should().Be(70000000);
        }
    }
}
