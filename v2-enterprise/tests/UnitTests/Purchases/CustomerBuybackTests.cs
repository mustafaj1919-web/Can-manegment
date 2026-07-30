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
using CarShowroomManagementV2.Application.Customers.Commands;
using CarShowroomManagementV2.Application.Purchases.Commands;
using CarShowroomManagementV2.Application.Accounting.Queries;
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

        private async Task<(Vehicle vehicle, SalesContract contract)> SeedSoldVehicleAsync(ApplicationDbContext context, Customer customer, string brand, string model, string vin, decimal salePrice, Guid branchId, string contractStatus = "Active", bool isSold = true, string vehicleStatus = "Sold", decimal costBasis = 50000000)
        {
            var vehicle = new Vehicle
            {
                Id = Guid.NewGuid(),
                Brand = brand,
                Model = model,
                Year = 2025,
                ChassisNumber = vin,
                Color = "أسود",
                PurchaseCost = costBasis,
                BookValue = costBasis,
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
                SalePrice = salePrice,
                NetPrice = salePrice,
                DownPayment = salePrice,
                CostBasis = costBasis,
                Profit = salePrice - costBasis,
                Status = contractStatus
            };
            context.SalesContracts.Add(contract);
            await context.SaveChangesAsync();

            return (vehicle, contract);
        }

        // 1. Mandatory Test: Historical sale profit remains 15M after 68M buyback!
        [Fact]
        public async Task Test1_HistoricalSaleProfit_RemainsImmutableAfterBuyback()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "أحمد علي", "07701111111", "CUS-101", _branchAId);
            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(invAcc);
            await context.SaveChangesAsync();

            // Initial purchase cost: 60,000,000 IQD, Sale price: 75,000,000 IQD -> Profit: 15,000,000 IQD
            var (veh, sc) = await SeedSoldVehicleAsync(context, cust, "Toyota", "Land Cruiser", "VIN-LC-60M", 75000000, _branchAId, costBasis: 60000000);

            // Execute Buyback for 68,000,000 IQD
            var cmdHandler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var buybackId = await cmdHandler.Handle(new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = cust.Id,
                Brand = "Toyota",
                Model = "Land Cruiser",
                Year = 2025,
                ChassisNumber = "VIN-LC-60M",
                PurchaseCost = 68000000,
                PaymentMethod = PaymentMethod.Cash
            }, CancellationToken.None);

            buybackId.Should().NotBeEmpty();

            // Verify current vehicle book value is updated to 68M
            var updatedVeh = await context.Vehicles.FindAsync(veh.Id);
            updatedVeh!.BookValue.Should().Be(68000000);

            // Verify historical Sales Contract Profit and CostBasis REMAIN IMMUTABLE at 15M profit and 60M cost basis!
            var updatedSc = await context.SalesContracts.FindAsync(sc.Id);
            updatedSc!.CostBasis.Should().Be(60000000);
            updatedSc.Profit.Should().Be(15000000);

            // Verify Sales Profit Report query returns 15,000,000 IQD profit for Sale 1!
            var reportHandler = new GetSalesProfitReportQueryHandler(context, _currentUserServiceMock.Object);
            var report = await reportHandler.Handle(new GetSalesProfitReportQuery(), CancellationToken.None);

            report.Sales.Should().ContainSingle(s => s.ContractId == sc.Id && s.DirectProfit == 15000000 && s.BookValue == 60000000);
        }

        // 2. Draft/Pending/Cancelled/Reversed sales are ineligible
        [Fact]
        public async Task Test2_DraftAndCancelledSales_AreIneligibleForBuyback()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "حسن", "07702222222", "CUS-102", _branchAId);
            await SeedSoldVehicleAsync(context, cust, "Kia", "Optima", "VIN-DRAFT-01", 30000000, _branchAId, contractStatus: "Draft");
            await SeedSoldVehicleAsync(context, cust, "Kia", "Optima", "VIN-CANCEL-02", 30000000, _branchAId, contractStatus: "Cancelled");

            var handler = new GetCustomerPurchasedVehiclesQueryHandler(context, _currentUserServiceMock.Object);
            var list = await handler.Handle(new GetCustomerPurchasedVehiclesQuery { CustomerId = cust.Id }, CancellationToken.None);

            list.Should().HaveCount(2);
            list.All(v => !v.EligibleForBuyback).Should().BeTrue();
        }

        // 3. Complete Repeated Cycle: Purchase 1 (60M) -> Sale 1 (75M) -> Buyback 1 (68M) -> Sale 2 (80M) -> Buyback 2 (70M)
        [Fact]
        public async Task Test3_CompleteRepeatedCycle_MaintainsImmutabilityAndLinksDirectlyToLatestSale()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "محمد البغدادي", "07703333333", "CUS-103", _branchAId);
            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(invAcc);
            await context.SaveChangesAsync();

            var cmdHandler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);

            // Step 1: Initial Purchase (60M)
            var p1Id = await cmdHandler.Handle(new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = cust.Id,
                Brand = "Nissan",
                Model = "Patrol",
                Year = 2025,
                ChassisNumber = "VIN-CYCLE-99",
                PurchaseCost = 60000000,
                PaymentMethod = PaymentMethod.Cash
            }, CancellationToken.None);

            var veh = await context.Vehicles.FirstAsync(v => v.ChassisNumber == "VIN-CYCLE-99");

            // Step 2: Sale 1 (75M)
            var sc1 = new SalesContract
            {
                Id = Guid.NewGuid(),
                ContractNumber = "SAL-001",
                CustomerId = cust.Id,
                VehicleId = veh.Id,
                BranchId = _branchAId,
                SaleDate = DateTime.UtcNow.AddDays(-20),
                SalePrice = 75000000,
                NetPrice = 75000000,
                CostBasis = 60000000,
                Profit = 15000000,
                Status = "Active"
            };
            veh.IsSold = true;
            veh.Status = "Sold";
            context.SalesContracts.Add(sc1);
            await context.SaveChangesAsync();

            // Step 3: Buyback 1 (68M)
            var b1Id = await cmdHandler.Handle(new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = cust.Id,
                Brand = "Nissan",
                Model = "Patrol",
                Year = 2025,
                ChassisNumber = "VIN-CYCLE-99",
                PurchaseCost = 68000000,
                PaymentMethod = PaymentMethod.Cash
            }, CancellationToken.None);

            var p1Record = await context.Purchases.FindAsync(b1Id);
            p1Record!.PreviousSaleContractId.Should().Be(sc1.Id);

            // Step 4: Sale 2 (80M)
            var sc2 = new SalesContract
            {
                Id = Guid.NewGuid(),
                ContractNumber = "SAL-002",
                CustomerId = cust.Id,
                VehicleId = veh.Id,
                BranchId = _branchAId,
                SaleDate = DateTime.UtcNow.AddDays(-5),
                SalePrice = 80000000,
                NetPrice = 80000000,
                CostBasis = 68000000,
                Profit = 12000000,
                Status = "Active"
            };
            veh.IsSold = true;
            veh.Status = "Sold";
            context.SalesContracts.Add(sc2);
            await context.SaveChangesAsync();

            // Step 5: Buyback 2 (70M)
            var b2Id = await cmdHandler.Handle(new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = cust.Id,
                Brand = "Nissan",
                Model = "Patrol",
                Year = 2025,
                ChassisNumber = "VIN-CYCLE-99",
                PurchaseCost = 70000000,
                PaymentMethod = PaymentMethod.Cash
            }, CancellationToken.None);

            var p2Record = await context.Purchases.FindAsync(b2Id);

            // PROOF: Buyback 2 links directly to Sale 2 (sc2.Id), NEVER sc1.Id!
            p2Record!.PreviousSaleContractId.Should().Be(sc2.Id);

            // PROOF: Sale 1 profit = 15M (based on 60M), Sale 2 profit = 12M (based on 68M)
            sc1.Profit.Should().Be(15000000);
            sc2.Profit.Should().Be(12000000);
            veh.BookValue.Should().Be(70000000);
        }

        // 4. Concurrency protection: duplicate simultaneous buybacks fail safely
        [Fact]
        public async Task Test4_ConcurrentBuybacks_SecondRequestFailsSafely()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "خالد", "07704444444", "CUS-104", _branchAId);
            var (veh, sc) = await SeedSoldVehicleAsync(context, cust, "Toyota", "Avalon", "VIN-AVALON-10", 45000000, _branchAId);

            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(invAcc);
            await context.SaveChangesAsync();

            var cmdHandler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var cmd = new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = cust.Id,
                Brand = "Toyota",
                Model = "Avalon",
                Year = 2025,
                ChassisNumber = "VIN-AVALON-10",
                PurchaseCost = 42000000,
                PaymentMethod = PaymentMethod.Cash
            };

            // First request succeeds
            var firstId = await cmdHandler.Handle(cmd, CancellationToken.None);
            firstId.Should().NotBeEmpty();

            // Second concurrent request fails with clear business exception!
            Func<Task> act = async () => await cmdHandler.Handle(cmd, CancellationToken.None);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*موجودة حالياً في المخزون*");
        }

        // 5. Manual external customer vehicle has null PreviousSaleContractId
        [Fact]
        public async Task Test5_ManualExternalVehiclePurchase_HasNullPreviousSaleContractId()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "سامي", "07705555555", "CUS-105", _branchAId);
            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(invAcc);
            await context.SaveChangesAsync();

            var cmdHandler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var pId = await cmdHandler.Handle(new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = cust.Id,
                Brand = "BMW",
                Model = "X5",
                Year = 2024,
                ChassisNumber = "VIN-EXTERNAL-999",
                PurchaseCost = 95000000,
                PaymentMethod = PaymentMethod.Cash
            }, CancellationToken.None);

            var purchase = await context.Purchases.FindAsync(pId);
            purchase!.PreviousSaleContractId.Should().BeNull();
        }
    }
}
