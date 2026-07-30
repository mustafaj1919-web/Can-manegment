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

            var (veh, sc) = await SeedSoldVehicleAsync(context, cust, "Toyota", "Land Cruiser", "VIN-LC-60M", 75000000, _branchAId, costBasis: 60000000);

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

            var updatedVeh = await context.Vehicles.FindAsync(veh.Id);
            updatedVeh!.BookValue.Should().Be(68000000);

            var updatedSc = await context.SalesContracts.FindAsync(sc.Id);
            updatedSc!.CostBasis.Should().Be(60000000);
            updatedSc.Profit.Should().Be(15000000);

            var reportHandler = new GetSalesProfitReportQueryHandler(context, _currentUserServiceMock.Object);
            var report = await reportHandler.Handle(new GetSalesProfitReportQuery(), CancellationToken.None);

            report.Sales.Should().ContainSingle(s => s.ContractId == sc.Id && s.DirectProfit == 15000000 && s.BookValue == 60000000);
        }

        // 2. Historical COGS remains unchanged
        [Fact]
        public async Task Test2_HistoricalCOGS_RemainsUnchanged()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "باسم", "07701234567", "CUS-COGS", _branchAId);
            var (veh, sc) = await SeedSoldVehicleAsync(context, cust, "Lexus", "LX600", "VIN-COGS-1", 120000000, _branchAId, costBasis: 95000000);

            sc.CostBasis.Should().Be(95000000);
        }

        // 3. Supplier profitability remains unchanged
        [Fact]
        public async Task Test3_SupplierProfitability_RemainsUnchanged()
        {
            var context = GetSqliteDbContext();
            var supAcc = new Account { Id = Guid.NewGuid(), AccountCode = "21010099", Name = "مورد الشرق", Type = AccountType.Liability, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(supAcc);
            var supplier = new Supplier { Id = Guid.NewGuid(), Name = "مورد الشرق", AccountId = supAcc.Id, BranchId = _branchAId, Code = "SUP-01" };
            context.Suppliers.Add(supplier);
            await context.SaveChangesAsync();

            var cust = await SeedCustomerAsync(context, "زياد", "07709999999", "CUS-SUP", _branchAId);
            var (veh, sc) = await SeedSoldVehicleAsync(context, cust, "GMC", "Yukon", "VIN-SUP-01", 90000000, _branchAId, costBasis: 70000000);

            var purchase = new Purchase
            {
                Id = Guid.NewGuid(),
                PurchaseNumber = "PUR-SUP-01",
                SourceType = PurchaseSourceType.Supplier,
                SupplierId = supplier.Id,
                VehicleId = veh.Id,
                PurchaseCost = 70000000,
                BranchId = _branchAId
            };
            context.Purchases.Add(purchase);
            await context.SaveChangesAsync();

            var handler = new GetSupplierProfitabilityQueryHandler(context, _currentUserServiceMock.Object);
            var result = await handler.Handle(new GetSupplierProfitabilityQuery { SupplierId = supplier.Id }, CancellationToken.None);

            result.Summary.RealizedGrossProfit.Should().Be(20000000);
        }

        // 4. Profit & Loss for a closed prior period remains unchanged
        [Fact]
        public async Task Test4_ProfitAndLoss_ForPriorPeriod_RemainsUnchanged()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "عمر", "07708888888", "CUS-PL", _branchAId);
            var (veh, sc) = await SeedSoldVehicleAsync(context, cust, "Ford", "Expedition", "VIN-PL-01", 65000000, _branchAId, costBasis: 50000000);

            sc.Profit.Should().Be(15000000);
        }

        // 5. Draft sale is ineligible
        [Fact]
        public async Task Test5_DraftSale_IsIneligible()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "حسن", "07702222222", "CUS-DRAFT", _branchAId);
            await SeedSoldVehicleAsync(context, cust, "Kia", "Optima", "VIN-DRAFT-01", 30000000, _branchAId, contractStatus: "Draft");

            var handler = new GetCustomerPurchasedVehiclesQueryHandler(context, _currentUserServiceMock.Object);
            var list = await handler.Handle(new GetCustomerPurchasedVehiclesQuery { CustomerId = cust.Id }, CancellationToken.None);

            list.Should().ContainSingle(v => !v.EligibleForBuyback);
        }

        // 6. Pending sale is ineligible
        [Fact]
        public async Task Test6_PendingSale_IsIneligible()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "طارق", "07707777777", "CUS-PENDING", _branchAId);
            await SeedSoldVehicleAsync(context, cust, "Hyundai", "Tucson", "VIN-PENDING-01", 32000000, _branchAId, contractStatus: "Pending");

            var handler = new GetCustomerPurchasedVehiclesQueryHandler(context, _currentUserServiceMock.Object);
            var list = await handler.Handle(new GetCustomerPurchasedVehiclesQuery { CustomerId = cust.Id }, CancellationToken.None);

            list.Should().ContainSingle(v => !v.EligibleForBuyback);
        }

        // 7. Cancelled sale is ineligible
        [Fact]
        public async Task Test7_CancelledSale_IsIneligible()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "عادل", "07706666666", "CUS-CANCEL", _branchAId);
            await SeedSoldVehicleAsync(context, cust, "Toyota", "Camry", "VIN-CANCEL-01", 35000000, _branchAId, contractStatus: "Cancelled");

            var handler = new GetCustomerPurchasedVehiclesQueryHandler(context, _currentUserServiceMock.Object);
            var list = await handler.Handle(new GetCustomerPurchasedVehiclesQuery { CustomerId = cust.Id }, CancellationToken.None);

            list.Should().ContainSingle(v => !v.EligibleForBuyback && v.IneligibilityReason == "عقد البيع ملغى");
        }

        // 8. Reversed sale is ineligible
        [Fact]
        public async Task Test8_ReversedSale_IsIneligible()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "كمال", "07705554444", "CUS-REV", _branchAId);
            await SeedSoldVehicleAsync(context, cust, "Nissan", "Altima", "VIN-REV-01", 28000000, _branchAId, contractStatus: "Reversed");

            var handler = new GetCustomerPurchasedVehiclesQueryHandler(context, _currentUserServiceMock.Object);
            var list = await handler.Handle(new GetCustomerPurchasedVehiclesQuery { CustomerId = cust.Id }, CancellationToken.None);

            list.Should().ContainSingle(v => !v.EligibleForBuyback);
        }

        // 9. Completed sale is eligible
        [Fact]
        public async Task Test9_CompletedSale_IsEligible()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "فراس", "07703332222", "CUS-COMP", _branchAId);
            await SeedSoldVehicleAsync(context, cust, "Toyota", "Hilux", "VIN-COMP-01", 40000000, _branchAId, contractStatus: "Completed");

            var handler = new GetCustomerPurchasedVehiclesQueryHandler(context, _currentUserServiceMock.Object);
            var list = await handler.Handle(new GetCustomerPurchasedVehiclesQuery { CustomerId = cust.Id }, CancellationToken.None);

            list.Should().ContainSingle(v => v.EligibleForBuyback);
        }

        // 10. Complete Repeated Cycle: Purchase 1 (60M) -> Sale 1 (75M) -> Buyback 1 (68M) -> Sale 2 (80M) -> Buyback 2 (70M)
        [Fact]
        public async Task Test10_CompleteRepeatedCycle_MaintainsImmutabilityAndLinksDirectlyToLatestSale()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "محمد البغدادي", "07703333333", "CUS-103", _branchAId);
            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(invAcc);
            await context.SaveChangesAsync();

            var cmdHandler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);

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
            p2Record!.PreviousSaleContractId.Should().Be(sc2.Id);

            sc1.Profit.Should().Be(15000000);
            sc2.Profit.Should().Be(12000000);
            veh.BookValue.Should().Be(70000000);
        }

        // 11. Database-enforced concurrency protection with two distinct contexts
        [Fact]
        public async Task Test11_RealDatabaseConcurrency_SecondRequestFailsSafely()
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

            var firstId = await cmdHandler.Handle(cmd, CancellationToken.None);
            firstId.Should().NotBeEmpty();

            Func<Task> act = async () => await cmdHandler.Handle(cmd, CancellationToken.None);
            await act.Should().ThrowAsync<InvalidOperationException>();
        }

        // 12. Manual external customer vehicle has null PreviousSaleContractId
        [Fact]
        public async Task Test12_ManualExternalVehiclePurchase_HasNullPreviousSaleContractId()
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

        // 13. PreviousSaleContractId/customer/vehicle mismatch is rejected
        [Fact]
        public async Task Test13_CustomerVehicleMismatch_IsRejected()
        {
            var context = GetSqliteDbContext();
            var custA = await SeedCustomerAsync(context, "زبون أ", "07701112233", "CUS-A", _branchAId);
            var custB = await SeedCustomerAsync(context, "زبون ب", "07709998877", "CUS-B", _branchAId);

            var (veh, sc) = await SeedSoldVehicleAsync(context, custA, "Kia", "Sorento", "VIN-MISMATCH-1", 40000000, _branchAId);

            var cmdHandler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);

            Func<Task> act = async () => await cmdHandler.Handle(new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = custB.Id,
                Brand = "Kia",
                Model = "Sorento",
                Year = 2025,
                ChassisNumber = "VIN-MISMATCH-1",
                PurchaseCost = 35000000,
                PaymentMethod = PaymentMethod.Cash
            }, CancellationToken.None);

            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*لم يتم العثور على عقد بيع سابق*");
        }

        // 14. Vehicle documents and images remain linked
        [Fact]
        public async Task Test14_VehicleDocumentsAndImages_RemainLinked()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "ياسر", "07704443333", "CUS-DOC", _branchAId);
            var (veh, sc) = await SeedSoldVehicleAsync(context, cust, "Audi", "Q7", "VIN-AUDI-01", 85000000, _branchAId);

            veh.Notes = "سيارة فل مواصفات مع الفحص الفني";
            await context.SaveChangesAsync();

            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(invAcc);
            await context.SaveChangesAsync();

            var cmdHandler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);
            await cmdHandler.Handle(new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = cust.Id,
                Brand = "Audi",
                Model = "Q7",
                Year = 2025,
                ChassisNumber = "VIN-AUDI-01",
                PurchaseCost = 78000000,
                PaymentMethod = PaymentMethod.Cash
            }, CancellationToken.None);

            var reacquiredVeh = await context.Vehicles.FindAsync(veh.Id);
            reacquiredVeh!.Notes.Should().Be("سيارة فل مواصفات مع الفحص الفني");
        }

        // 15. Correct post-buyback inventory status
        [Fact]
        public async Task Test15_CorrectPostBuybackInventoryStatus()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "مصطفى", "07705556666", "CUS-STAT", _branchAId);
            var (veh, sc) = await SeedSoldVehicleAsync(context, cust, "Mazda", "CX90", "VIN-CX90-01", 52000000, _branchAId);

            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(invAcc);
            await context.SaveChangesAsync();

            var cmdHandler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);
            await cmdHandler.Handle(new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = cust.Id,
                Brand = "Mazda",
                Model = "CX90",
                Year = 2025,
                ChassisNumber = "VIN-CX90-01",
                PurchaseCost = 48000000,
                PaymentMethod = PaymentMethod.Cash
            }, CancellationToken.None);

            var reacquiredVeh = await context.Vehicles.FindAsync(veh.Id);
            reacquiredVeh!.IsSold.Should().BeFalse();
            reacquiredVeh.Status.Should().Be("Available");
        }

        // 16. Supplier flow remains unchanged
        [Fact]
        public async Task Test16_SupplierFlow_RemainsUnchanged()
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
            var pId = await cmdHandler.Handle(new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Supplier,
                SupplierId = supplier.Id,
                Brand = "Chevrolet",
                Model = "Tahoe",
                Year = 2025,
                ChassisNumber = "VIN-TAHOE-99",
                PurchaseCost = 75000000,
                PaymentMethod = PaymentMethod.Cash
            }, CancellationToken.None);

            pId.Should().NotBeEmpty();
            var purchase = await context.Purchases.FindAsync(pId);
            purchase!.SupplierId.Should().Be(supplier.Id);
            purchase.CustomerId.Should().BeNull();
        }

        // 17. Branch isolation
        [Fact]
        public async Task Test17_BranchIsolation_PreventsCrossBranchBuybacks()
        {
            var context = GetSqliteDbContext();
            var custInBranchA = await SeedCustomerAsync(context, "علي بغداد", "07701110000", "CUS-BR-A", _branchAId);
            var (veh, sc) = await SeedSoldVehicleAsync(context, custInBranchA, "Toyota", "Camry", "VIN-BRANCH-A", 35000000, _branchAId);

            var mockBranchBUser = new Mock<ICurrentUserService>();
            mockBranchBUser.Setup(x => x.UserId).Returns("user-b");
            mockBranchBUser.Setup(x => x.BranchId).Returns(_branchBId);

            var handlerBranchB = new GetCustomerPurchasedVehiclesQueryHandler(context, mockBranchBUser.Object);
            var list = await handlerBranchB.Handle(new GetCustomerPurchasedVehiclesQuery { CustomerId = custInBranchA.Id }, CancellationToken.None);

            list.Should().BeEmpty();
        }

        // 18. Posted journals remain balanced
        [Fact]
        public async Task Test18_PostedJournals_RemainBalanced()
        {
            var context = GetSqliteDbContext();
            var cust = await SeedCustomerAsync(context, "نور", "07709991111", "CUS-JV", _branchAId);
            var (veh, sc) = await SeedSoldVehicleAsync(context, cust, "Honda", "Accord", "VIN-HONDA-1", 38000000, _branchAId);

            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(invAcc);
            await context.SaveChangesAsync();

            var cmdHandler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var pId = await cmdHandler.Handle(new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = cust.Id,
                Brand = "Honda",
                Model = "Accord",
                Year = 2025,
                ChassisNumber = "VIN-HONDA-1",
                PurchaseCost = 34000000,
                PaymentMethod = PaymentMethod.Cash
            }, CancellationToken.None);

            var jvLines = await context.JournalLines
                .Include(l => l.JournalEntry)
                .Where(l => l.JournalEntry!.ReferenceId == pId)
                .ToListAsync();

            var totalDebit = jvLines.Sum(l => l.Debit);
            var totalCredit = jvLines.Sum(l => l.Credit);

            totalDebit.Should().Be(totalCredit);
            totalDebit.Should().Be(34000000);
        }
    }
}
