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
using CarShowroomManagementV2.Application.Installments.Commands;
using CarShowroomManagementV2.Application.Installments.Queries;
using CarShowroomManagementV2.Infrastructure.Persistence;
using CarShowroomManagementV2.Infrastructure.Persistence.Interceptors;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.UnitTests.Installments
{
    public class InstallmentsTests : IDisposable
    {
        private readonly Mock<ICurrentUserService> _currentUserServiceMock;
        private readonly AuditableEntitySaveChangesInterceptor _interceptor;
        private readonly Guid _testBranchId = Guid.NewGuid();
        private readonly Microsoft.Data.Sqlite.SqliteConnection _connection;

        public InstallmentsTests()
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
            await SeedAccountAsync(context, Guid.NewGuid(), "111001", "صندوق النقدية الرئيسي", AccountType.Asset, branchId);
            await SeedAccountAsync(context, Guid.NewGuid(), "2202", "ضريبة المبيعات المستحقة", AccountType.Liability, branchId);
            await SeedAccountAsync(context, Guid.NewGuid(), "2203", "أمانات رسوم التسجيل", AccountType.Liability, branchId);
            await SeedAccountAsync(context, Guid.NewGuid(), "2301", "إيرادات أقساط مؤجلة", AccountType.Liability, branchId);
            await SeedAccountAsync(context, Guid.NewGuid(), "4102", "إيرادات أقساط محققة", AccountType.Revenue, branchId);
        }

        // ── الاختبارات البرمجية ───────────────────────────────────────────────────────────────

        [Fact]
        public async Task CreateSale_InstallmentSale_ShouldGenerateSchedule_AndDebitCustomerAccountId()
        {
            // Arrange
            var context = GetSqliteDbContext();
            await SeedBranchAsync(context, _testBranchId, "فرع بغداد", "BR-BG");
            await SeedAccountingSetupAsync(context, _testBranchId);

            var customer = await SeedCustomerAsync(context, Guid.NewGuid(), "أحمد البغدادي", _testBranchId);
            var vehicle = await SeedVehicleAsync(context, Guid.NewGuid(), "Honda Civic", "CH-CIVIC-999", 10000, _testBranchId);

            var handler = new CreateSaleContractCommandHandler(context, _currentUserServiceMock.Object);

            var command = new CreateSaleContractCommand
            {
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 12000,
                PaymentMethod = PaymentMethod.Cheque, // installment method
                DownPayment = 2000,
                InstallmentPeriodMonths = 10,
                ProfitRatePercentage = 10 // إضافة 10% أرباح للتقسيط على المبلغ المتبقي (10000 + 10% = 11000)
            };

            // Act
            var contractId = await handler.Handle(command, CancellationToken.None);

            // Assert
            contractId.Should().NotBeEmpty();

            // 1. التحقق من عقد البيع والمبالغ
            var contract = await context.SalesContracts.FindAsync(contractId);
            contract.Should().NotBeNull();
            contract!.RemainingBalance.Should().Be(11000); // 10000 متبقي + 1000 أرباح
            
            // 2. التحقق من توليد الأقساط
            var plan = await context.InstallmentPlans.Include(p => p.Installments).FirstOrDefaultAsync(p => p.SalesContractId == contractId);
            plan.Should().NotBeNull();
            plan!.TotalProfit.Should().Be(1000);
            plan.TotalPlanAmount.Should().Be(11000);
            plan.MonthlyInstallmentAmount.Should().Be(1100);
            plan.Installments.Count.Should().Be(10);

            // 3. التحقق من قيد اليومية
            var journalEntry = await context.JournalEntries.Include(je => je.Lines).ThenInclude(l => l.Account)
                .FirstOrDefaultAsync(je => je.ReferenceType == "SaleContract" && je.ReferenceId == contractId);

            journalEntry.Should().NotBeNull();
            journalEntry!.IsBalanced.Should().BeTrue();
            
            // التحقق من قيد الأرباح المؤجلة (2301): 1000 دائن
            var deferredLine = journalEntry.Lines.FirstOrDefault(l => l.Account != null && l.Account.AccountCode == "2301");
            deferredLine.Should().NotBeNull();
            deferredLine!.Credit.Should().Be(1000);

            // التحقق من الطرف المدين للعميل (المدفوعات الآجلة): 11000
            var customerLine = journalEntry.Lines.FirstOrDefault(l => l.AccountId == customer.AccountId);
            customerLine.Should().NotBeNull();
            customerLine!.Debit.Should().Be(11000);
        }

        [Fact]
        public async Task PayInstallment_ShouldUpdateInstallmentStatus_AndRemainingBalance_AndCreateReceiptJournalEntry()
        {
            // Arrange
            var context = GetSqliteDbContext();
            await SeedBranchAsync(context, _testBranchId, "فرع بغداد", "BR-BG");
            await SeedAccountingSetupAsync(context, _testBranchId);

            var customer = await SeedCustomerAsync(context, Guid.NewGuid(), "أحمد البغدادي", _testBranchId);
            var vehicle = await SeedVehicleAsync(context, Guid.NewGuid(), "Honda Civic", "CH-CIVIC-999", 10000, _testBranchId);

            var saleHandler = new CreateSaleContractCommandHandler(context, _currentUserServiceMock.Object);
            var payHandler = new PayInstallmentCommandHandler(context, _currentUserServiceMock.Object);

            var saleCommand = new CreateSaleContractCommand
            {
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 12000,
                PaymentMethod = PaymentMethod.Cheque,
                DownPayment = 2000,
                InstallmentPeriodMonths = 10,
                ProfitRatePercentage = 10
            };

            var contractId = await saleHandler.Handle(saleCommand, CancellationToken.None);

            var plan = await context.InstallmentPlans.Include(p => p.Installments)
                .FirstOrDefaultAsync(p => p.SalesContractId == contractId);
            var installment = plan!.Installments.First();

            // Act
            var paymentCommand = new PayInstallmentCommand
            {
                InstallmentId = installment.Id,
                Amount = 1100, // سداد كامل القسط
                PaymentMethod = PaymentMethod.Cash,
                DebitAccountCode = "111001"
            };

            var paymentId = await payHandler.Handle(paymentCommand, CancellationToken.None);

            // Assert
            paymentId.Should().NotBeEmpty();

            // 1. التحقق من حالة القسط
            var dbInstallment = await context.Installments.FindAsync(installment.Id);
            dbInstallment!.Status.Should().Be("Paid");
            dbInstallment.PaidAmount.Should().Be(1100);

            // 2. التحقق من الرصيد المتبقي على العقد
            var dbContract = await context.SalesContracts.FindAsync(contractId);
            dbContract!.RemainingBalance.Should().Be(9900); // 11000 - 1100

            // 3. التحقق من قيد سند القبض والاعتراف بالأرباح
            var journalEntry = await context.JournalEntries.Include(je => je.Lines).ThenInclude(l => l.Account)
                .FirstOrDefaultAsync(je => je.ReferenceType == "Payment" && je.ReferenceId == paymentId);
            
            journalEntry.Should().NotBeNull();
            journalEntry!.IsBalanced.Should().BeTrue();
            
            // إجمالي المدين يجب أن يكون: 1100 (نقدي صندوق) + 100 (تخفيض إيراد أقساط مؤجل) = 1200
            journalEntry.TotalDebit.Should().Be(1200);

            // التحقق من سطر تخفيض الأرباح المؤجلة (2301): 100 مدين
            var deferredDebitLine = journalEntry.Lines.FirstOrDefault(l => l.Account != null && l.Account.AccountCode == "2301" && l.Debit > 0);
            deferredDebitLine.Should().NotBeNull();
            deferredDebitLine!.Debit.Should().Be(100);

            // التحقق من سطر إيرادات الأقساط المحققة (4102): 100 دائن
            var recognizedCreditLine = journalEntry.Lines.FirstOrDefault(l => l.Account != null && l.Account.AccountCode == "4102" && l.Credit > 0);
            recognizedCreditLine.Should().NotBeNull();
            recognizedCreditLine!.Credit.Should().Be(100);
        }

        [Fact]
        public async Task CreateSale_WhenAccountingFails_ShouldRollbackFully()
        {
            // Arrange
            var context = GetSqliteDbContext();
            await SeedBranchAsync(context, _testBranchId, "فرع بغداد", "BR-BG");
            
            // لاحظ هنا أننا لم نقم بتهيئة الحسابات المحاسبية الأساسية للبيع (Accounting Setup)
            // هذا سيؤدي إلى فشل الـ Handler وإلقاء استثناء عند محاولة جلب الحساب 1201 أو 4101
            
            var customer = await SeedCustomerAsync(context, Guid.NewGuid(), "أحمد البغدادي", _testBranchId);
            var vehicle = await SeedVehicleAsync(context, Guid.NewGuid(), "Honda Civic", "CH-CIVIC-999", 10000, _testBranchId);

            var handler = new CreateSaleContractCommandHandler(context, _currentUserServiceMock.Object);

            var command = new CreateSaleContractCommand
            {
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 12000,
                PaymentMethod = PaymentMethod.Cash,
                DownPayment = 12000
            };

            // Act
            Func<Task> act = async () => await handler.Handle(command, CancellationToken.None);

            // Assert
            // 1. يجب إلقاء استثناء نتيجة نقص الحسابات
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*الأساسية للمبيعات غير متوفرة*");

            // 2. التحقق من تراجع المعاملة بالكامل (Rollback) وعدم تغيير حالة السيارة في قاعدة البيانات
            var dbVehicle = await context.Vehicles.FindAsync(vehicle.Id);
            await context.Entry(dbVehicle!).ReloadAsync();
            dbVehicle!.IsSold.Should().BeFalse();
            dbVehicle.Status.Should().Be("Available");

            // 3. عدم إنشاء أي عقود بيع أو قيود يومية
            var contractsCount = await context.SalesContracts.CountAsync();
            contractsCount.Should().Be(0);

            var entriesCount = await context.JournalEntries.CountAsync();
            entriesCount.Should().Be(0);
        }
    }
}
