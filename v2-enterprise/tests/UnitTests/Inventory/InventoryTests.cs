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
using CarShowroomManagementV2.Application.Inventory.Commands;
using CarShowroomManagementV2.Application.Inventory.Queries;
using CarShowroomManagementV2.Infrastructure.Persistence;
using CarShowroomManagementV2.Infrastructure.Persistence.Interceptors;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.UnitTests.Inventory
{
    public class InventoryTests : IDisposable
    {
        private readonly Mock<ICurrentUserService> _currentUserServiceMock;
        private readonly AuditableEntitySaveChangesInterceptor _interceptor;
        private readonly Guid _testBranchId = Guid.NewGuid();
        private readonly Microsoft.Data.Sqlite.SqliteConnection _connection;

        public InventoryTests()
        {
            _currentUserServiceMock = new Mock<ICurrentUserService>();
            _currentUserServiceMock.Setup(x => x.UserId).Returns("test-user-01");
            _currentUserServiceMock.Setup(x => x.BranchId).Returns(_testBranchId);

            _interceptor = new AuditableEntitySaveChangesInterceptor(_currentUserServiceMock.Object);

            // إعداد وفتح اتصال SQLite في الذاكرة للاختبارات
            _connection = new Microsoft.Data.Sqlite.SqliteConnection("DataSource=:memory:");
            _connection.Open();
        }

        private ApplicationDbContext GetSqliteDbContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .Options;

            var context = new ApplicationDbContext(options, _currentUserServiceMock.Object, _interceptor);
            context.Database.EnsureCreated(); // إنشاء الجداول
            return context;
        }

        public void Dispose()
        {
            _connection.Close();
            _connection.Dispose();
        }

        // اختبار: إنشاء قيد متوازن عند شراء سيارة
        [Fact]
        public async Task CreateVehicle_WhenAccountsExist_ShouldRegisterVehicleAndCreateBalancedJournalEntry()
        {
            // Arrange
            var context = GetSqliteDbContext();
            
            // تهيئة حساب المخزون (1201) وحساب الموردين (2101)
            var inventoryAccount = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "Cars Inventory", Type = AccountType.Asset, BranchId = _testBranchId };
            var payablesAccount = new Account { Id = Guid.NewGuid(), AccountCode = "2101", Name = "Accounts Payable", Type = AccountType.Liability, BranchId = _testBranchId };
            context.Accounts.AddRange(inventoryAccount, payablesAccount);
            await context.SaveChangesAsync();

            var handler = new CreateVehicleCommandHandler(context, _currentUserServiceMock.Object);

            var command = new CreateVehicleCommand
            {
                Model = "Toyota Camry 2025",
                ChassisNumber = "VIN-CAMRY2025XYZ",
                Year = 2025,
                PurchaseCost = 25000,
                TargetSellingPrice = 28000,
                CreditAccountCode = "2101"
            };

            // Act
            var vehicleId = await handler.Handle(command, CancellationToken.None);

            // Assert
            vehicleId.Should().NotBeEmpty();

            var vehicle = await context.Vehicles.FirstOrDefaultAsync(v => v.Id == vehicleId);
            vehicle.Should().NotBeNull();
            vehicle!.Model.Should().Be("Toyota Camry 2025");
            vehicle.BookValue.Should().Be(25000); // القيمة الدفترية الأولية

            // التحقق من إنشاء القيد المحاسبي المتوازن المولد للمركبة
            var journalEntry = await context.JournalEntries
                .Include(j => j.Lines)
                .FirstOrDefaultAsync(j => j.ReferenceType == "Vehicle" && j.ReferenceId == vehicleId);

            journalEntry.Should().NotBeNull();
            journalEntry!.IsBalanced.Should().BeTrue();
            journalEntry.Lines.Count.Should().Be(2);

            var debitLine = journalEntry.Lines.FirstOrDefault(l => l.AccountId == inventoryAccount.Id);
            debitLine.Should().NotBeNull();
            debitLine!.Debit.Should().Be(25000);
            debitLine.Credit.Should().Be(0);

            var creditLine = journalEntry.Lines.FirstOrDefault(l => l.AccountId == payablesAccount.Id);
            creditLine.Should().NotBeNull();
            creditLine!.Debit.Should().Be(0);
            creditLine.Credit.Should().Be(25000);
        }

        // اختبار: زيادة BookValue للسيارة عند إضافة تكلفة جديدة
        [Fact]
        public async Task AddVehicleCost_ShouldIncreaseBookValueAndCreateJournalEntry()
        {
            // Arrange
            var context = GetSqliteDbContext();
            
            // تهيئة الحسابات المحاسبية والسيارة
            var inventoryAccount = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "Cars Inventory", Type = AccountType.Asset, BranchId = _testBranchId };
            var cashAccount = new Account { Id = Guid.NewGuid(), AccountCode = "1101", Name = "Cash", Type = AccountType.Asset, BranchId = _testBranchId };
            context.Accounts.AddRange(inventoryAccount, cashAccount);
            context.VehicleCostAccountMappings.Add(new VehicleCostAccountMapping
            {
                Id = Guid.NewGuid(),
                CostType = "maintenance",
                AccountId = inventoryAccount.Id,
                Account = inventoryAccount,
                BranchId = _testBranchId
            });

            var vehicle = new Vehicle
            {
                Id = Guid.NewGuid(),
                Model = "Hyundai Elantra",
                ChassisNumber = "VIN-ELANTRA123",
                Year = 2024,
                PurchaseCost = 15000,
                BookValue = 15000,
                BranchId = _testBranchId
            };
            context.Vehicles.Add(vehicle);
            await context.SaveChangesAsync();

            var handler = new AddVehicleCostCommandHandler(context, _currentUserServiceMock.Object);

            var command = new AddVehicleCostCommand
            {
                VehicleId = vehicle.Id,
                CostType = "maintenance",
                Amount = 800,
                Currency = "USD",
                Description = "تغيير إطارات وتصفية محرك",
                CreditAccountCode = "1101"
            };

            // Act
            var costId = await handler.Handle(command, CancellationToken.None);

            // Assert
            costId.Should().NotBeEmpty();

            // التحقق من زيادة القيمة الدفترية للسيارة
            var updatedVehicle = await context.Vehicles.FirstOrDefaultAsync(v => v.Id == vehicle.Id);
            updatedVehicle.Should().NotBeNull();
            updatedVehicle!.BookValue.Should().Be(15800); // 15000 + 800
            updatedVehicle.MaintenanceCost.Should().Be(800);

            // التحقق من إنشاء القيد المحاسبي المتوازن للتكلفة
            var journalEntry = await context.JournalEntries
                .Include(j => j.Lines)
                .FirstOrDefaultAsync(j => j.ReferenceType == "VehicleCost" && j.ReferenceId == costId);

            journalEntry.Should().NotBeNull();
            journalEntry!.IsBalanced.Should().BeTrue();
            
            var debitLine = journalEntry.Lines.FirstOrDefault(l => l.AccountId == inventoryAccount.Id);
            debitLine.Should().NotBeNull();
            debitLine!.Debit.Should().Be(800);

            var creditLine = journalEntry.Lines.FirstOrDefault(l => l.AccountId == cashAccount.Id);
            creditLine.Should().NotBeNull();
            creditLine!.Credit.Should().Be(800);
        }

        // اختبار: فشل العملية بالكامل إذا فشل القيد المحاسبي (مثال: عدم وجود حساب دائن)
        [Fact]
        public async Task CreateVehicle_WhenAccountingSetupFails_ShouldRollbackAndNotSaveVehicle()
        {
            // Arrange
            var context = GetSqliteDbContext();
            
            // تهيئة حساب المخزون فقط، مع إهمال حساب الموردين
            var inventoryAccount = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "Cars Inventory", Type = AccountType.Asset, BranchId = _testBranchId };
            context.Accounts.Add(inventoryAccount);
            await context.SaveChangesAsync();

            var handler = new CreateVehicleCommandHandler(context, _currentUserServiceMock.Object);

            var command = new CreateVehicleCommand
            {
                Model = "Kia Sportage",
                ChassisNumber = "VIN-SPORTAGE11",
                Year = 2024,
                PurchaseCost = 22000,
                TargetSellingPrice = 24000,
                CreditAccountCode = "2101" // حساب غير موجود في قاعدة البيانات
            };

            // Act & Assert
            Func<Task> act = async () => await handler.Handle(command, CancellationToken.None);
            
            // يجب أن ترفع المحاولة استثناءً
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*الحساب الدائن المحدد (2101) غير موجود*");

            // التحقق من عدم حفظ السيارة في قاعدة البيانات بسبب التراجع (Rollback) للعملية بالكامل
            var vehicleExists = await context.Vehicles.AnyAsync(v => v.ChassisNumber == "VIN-SPORTAGE11");
            vehicleExists.Should().BeFalse();
        }

        [Fact]
        public async Task GetPublicVehicles_ShouldReturnOnlyAvailableVehiclesAcrossBranches()
        {
            var context = GetSqliteDbContext();
            var otherBranchId = Guid.NewGuid();

            context.Vehicles.AddRange(
                new Vehicle
                {
                    Brand = "Toyota",
                    Model = "Camry",
                    ChassisNumber = "PUBLIC-AVAILABLE-1",
                    Year = 2025,
                    Color = "White",
                    TargetSellingPrice = 45000000,
                    Status = "Available",
                    BranchId = otherBranchId
                },
                new Vehicle
                {
                    Model = "Kia Sportage",
                    ChassisNumber = "PUBLIC-SOLD-1",
                    Year = 2024,
                    Status = "Sold",
                    IsSold = true,
                    BranchId = _testBranchId
                },
                new Vehicle
                {
                    Model = "Hyundai Tucson",
                    ChassisNumber = "PUBLIC-RESERVED-1",
                    Year = 2024,
                    Status = "Reserved",
                    BranchId = _testBranchId
                });
            await context.SaveChangesAsync();

            var handler = new GetPublicVehiclesQueryHandler(context);
            var result = await handler.Handle(new GetPublicVehiclesQuery(), CancellationToken.None);

            result.Total.Should().Be(1);
            result.Items.Should().ContainSingle();
            result.Items[0].Brand.Should().Be("Toyota");
            result.Items[0].Model.Should().Be("Camry");
            result.Items[0].SellingPrice.Should().Be(45000000);
        }

        [Fact]
        public async Task GetPublicVehicleDetails_ShouldExposeDisplayDataWithoutAccountingValues()
        {
            var context = GetSqliteDbContext();
            var vehicle = new Vehicle
            {
                Brand = "Lexus",
                Model = "LX600",
                ChassisNumber = "PRIVATE-VIN-123",
                Year = 2025,
                Color = "Black",
                PurchaseCost = 100,
                BookValue = 150,
                TargetSellingPrice = 200,
                Status = "Available",
                BranchId = _testBranchId
            };
            context.Vehicles.Add(vehicle);
            await context.SaveChangesAsync();

            var handler = new GetPublicVehicleDetailsQueryHandler(context);
            var result = await handler.Handle(
                new GetPublicVehicleDetailsQuery { VehicleId = vehicle.Id },
                CancellationToken.None);

            result.Should().NotBeNull();
            result!.Brand.Should().Be("Lexus");
            result.Model.Should().Be("LX600");
            result.SellingPrice.Should().Be(200);
            typeof(PublicVehicleDetailsDto).GetProperty("PurchaseCost").Should().BeNull();
            typeof(PublicVehicleDetailsDto).GetProperty("BookValue").Should().BeNull();
            typeof(PublicVehicleDetailsDto).GetProperty("ChassisNumber").Should().BeNull();
        }
    }
}
