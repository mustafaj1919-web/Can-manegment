using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using Moq;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Purchases.Commands;
using CarShowroomManagementV2.Infrastructure.Persistence;
using CarShowroomManagementV2.Infrastructure.Persistence.Interceptors;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.UnitTests.Purchases
{
    public class CancelPurchaseCommandTests : IDisposable
    {
        private readonly Mock<ICurrentUserService> _currentUserServiceMock;
        private readonly AuditableEntitySaveChangesInterceptor _interceptor;
        private readonly Guid _testBranchId = Guid.NewGuid();
        private readonly Microsoft.Data.Sqlite.SqliteConnection _connection;

        public CancelPurchaseCommandTests()
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

        private async Task<(Supplier supplier, Vehicle vehicle, Purchase purchase)> SeedPurchaseAsync(ApplicationDbContext context)
        {
            var branch = new Branch { Id = _testBranchId, Name = "Main Branch", Code = "BR01", IsActive = true };
            context.Branches.Add(branch);

            var payablesAccount = new Account
            {
                Id = Guid.NewGuid(),
                AccountCode = "2101",
                Name = "Accounts Payable",
                Type = AccountType.Liability,
                BranchId = _testBranchId,
                IsActive = true
            };
            var supplierAccount = new Account
            {
                Id = Guid.NewGuid(),
                AccountCode = "21010001",
                Name = "Supplier Account",
                Type = AccountType.Liability,
                BranchId = _testBranchId,
                IsActive = true
            };
            var inventoryAccount = new Account
            {
                Id = Guid.NewGuid(),
                AccountCode = "1201",
                Name = "Inventory Vehicles",
                Type = AccountType.Asset,
                BranchId = _testBranchId,
                IsActive = true
            };
            context.Accounts.AddRange(payablesAccount, supplierAccount, inventoryAccount);

            var supplier = new Supplier
            {
                Id = Guid.NewGuid(),
                Name = "شركة ذرى الخليج",
                Code = "SUP-001",
                Phone = "0770000000",
                AccountId = supplierAccount.Id,
                BranchId = _testBranchId
            };
            context.Suppliers.Add(supplier);

            var vehicle = new Vehicle
            {
                Id = Guid.NewGuid(),
                Model = "Destroyer 05",
                Year = 2025,
                ChassisNumber = "VIN1234567890",
                PurchaseCost = 21100000,
                BookValue = 21100000,
                TargetSellingPrice = 22000000,
                Status = "Available",
                IsSold = false,
                BranchId = _testBranchId
            };
            context.Vehicles.Add(vehicle);

            var purchase = new Purchase
            {
                Id = Guid.NewGuid(),
                PurchaseNumber = "PUR-20260801-00085",
                SourceType = PurchaseSourceType.Supplier,
                SupplierId = supplier.Id,
                VehicleId = vehicle.Id,
                PurchaseCost = 21100000,
                AmountPaid = 0,
                PaymentMethod = PaymentMethod.Cheque,
                Status = "Active",
                BranchId = _testBranchId,
                PurchaseDate = DateTime.UtcNow
            };
            context.Purchases.Add(purchase);

            var journalEntry = new JournalEntry
            {
                Id = Guid.NewGuid(),
                EntryNumber = "JV-20260801-00001",
                EntryDate = DateTime.UtcNow,
                Description = "قيد إثبات شراء سيارة",
                IsPosted = true,
                BranchId = _testBranchId,
                ReferenceType = "Purchase",
                ReferenceId = purchase.Id,
                CreatedBy = "test-user-01"
            };
            journalEntry.Lines.Add(new JournalLine
            {
                Id = Guid.NewGuid(),
                JournalEntryId = journalEntry.Id,
                AccountId = inventoryAccount.Id,
                Debit = 21100000,
                Credit = 0,
                Description = "زيادة قيمة المخزون",
                VehicleId = vehicle.Id
            });
            journalEntry.Lines.Add(new JournalLine
            {
                Id = Guid.NewGuid(),
                JournalEntryId = journalEntry.Id,
                AccountId = supplierAccount.Id,
                Debit = 0,
                Credit = 21100000,
                Description = "إثبات استحقاق المورد",
                VehicleId = vehicle.Id
            });
            context.JournalEntries.Add(journalEntry);

            await context.SaveChangesAsync();
            return (supplier, vehicle, purchase);
        }

        [Fact]
        public async Task CancelPurchaseCommand_ShouldCancelActivePurchase_AndReverseJournalEntries()
        {
            // Arrange
            using var context = GetSqliteDbContext();
            var (_, vehicle, purchase) = await SeedPurchaseAsync(context);

            var handler = new CancelPurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var command = new CancelPurchaseCommand
            {
                PurchaseId = purchase.Id,
                Reason = "شراء مكرر عن طريق الخطأ"
            };

            // Act
            var result = await handler.Handle(command, CancellationToken.None);

            // Assert
            result.Should().BeTrue();

            var updatedPurchase = await context.Purchases.FindAsync(purchase.Id);
            updatedPurchase.Should().NotBeNull();
            updatedPurchase!.Status.Should().Be("Cancelled");

            var updatedVehicle = await context.Vehicles.FindAsync(vehicle.Id);
            updatedVehicle!.Status.Should().Be("Cancelled");

            var reversalEntry = await context.JournalEntries
                .Include(j => j.Lines)
                .FirstOrDefaultAsync(j => j.ReferenceType == "PurchaseCancel" && j.ReferenceId == purchase.Id);

            reversalEntry.Should().NotBeNull();
            reversalEntry!.IsBalanced.Should().BeTrue();
            reversalEntry.Lines.Should().HaveCount(2);

            var debitLine = reversalEntry.Lines.First(l => l.Debit > 0);
            var creditLine = reversalEntry.Lines.First(l => l.Credit > 0);

            debitLine.Debit.Should().Be(21100000);
            creditLine.Credit.Should().Be(21100000);
        }

        [Fact]
        public async Task CancelPurchaseCommand_ShouldFail_WhenAlreadyCancelled()
        {
            // Arrange
            using var context = GetSqliteDbContext();
            var (_, _, purchase) = await SeedPurchaseAsync(context);

            purchase.Status = "Cancelled";
            await context.SaveChangesAsync();

            var handler = new CancelPurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var command = new CancelPurchaseCommand { PurchaseId = purchase.Id };

            // Act
            Func<Task> act = async () => await handler.Handle(command, CancellationToken.None);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*ملغاة بالفعل*");
        }

        [Fact]
        public async Task CancelPurchaseCommand_ShouldFail_WhenAmountPaidIsGreaterThanZero()
        {
            // Arrange
            using var context = GetSqliteDbContext();
            var (_, _, purchase) = await SeedPurchaseAsync(context);

            purchase.AmountPaid = 5000000;
            await context.SaveChangesAsync();

            var handler = new CancelPurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var command = new CancelPurchaseCommand { PurchaseId = purchase.Id };

            // Act
            Func<Task> act = async () => await handler.Handle(command, CancellationToken.None);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*مدفوعات*");
        }
    }
}
