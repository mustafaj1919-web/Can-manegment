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
using CarShowroomManagementV2.Application.Common.Helpers;
using CarShowroomManagementV2.Application.Accounting.Queries;
using CarShowroomManagementV2.Infrastructure.Persistence;
using CarShowroomManagementV2.Infrastructure.Persistence.Interceptors;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.UnitTests.Accounting
{
    public class AccountingReportsTests : IDisposable
    {
        private readonly Mock<ICurrentUserService> _currentUserServiceMock;
        private readonly AuditableEntitySaveChangesInterceptor _interceptor;
        private readonly Guid _baghdadBranchId = Guid.NewGuid();
        private readonly Guid _erbilBranchId = Guid.NewGuid();
        private readonly Microsoft.Data.Sqlite.SqliteConnection _connection;

        public AccountingReportsTests()
        {
            _currentUserServiceMock = new Mock<ICurrentUserService>();
            _currentUserServiceMock.Setup(x => x.UserId).Returns("test-reporter-01");
            _currentUserServiceMock.Setup(x => x.BranchId).Returns(_baghdadBranchId);

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

            if (!context.Branches.Any(b => b.Id == _baghdadBranchId))
            {
                context.Branches.Add(new Branch { Id = _baghdadBranchId, Name = "فرع بغداد", Code = "BGD-01", IsActive = true });
            }
            if (!context.Branches.Any(b => b.Id == _erbilBranchId))
            {
                context.Branches.Add(new Branch { Id = _erbilBranchId, Name = "فرع أربيل", Code = "ERB-01", IsActive = true });
            }
            context.SaveChanges();

            return context;
        }

        public void Dispose()
        {
            _connection.Close();
            _connection.Dispose();
        }

        // ── دوال المساعدة لتهيئة البيانات (Seeding Helpers) ───────────────────────────────────
        
        private async Task<Account> SeedAccountAsync(ApplicationDbContext context, string code, string name, AccountType type, Guid branchId)
        {
            var account = new Account
            {
                Id = Guid.NewGuid(),
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

        private async Task<JournalEntry> PostJournalEntryAsync(ApplicationDbContext context, string description, Guid branchId, DateTime entryDate, params (Account account, decimal debit, decimal credit)[] lines)
        {
            var entry = new JournalEntry
            {
                Id = Guid.NewGuid(),
                EntryNumber = "JV-" + Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper(),
                Description = description,
                EntryDate = entryDate,
                IsPosted = true,
                BranchId = branchId,
                CreatedBy = "test-user"
            };

            foreach (var line in lines)
            {
                entry.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(),
                    JournalEntryId = entry.Id,
                    AccountId = line.account.Id,
                    Debit = line.debit,
                    Credit = line.credit,
                    Description = description
                });
            }

            context.JournalEntries.Add(entry);
            await context.SaveChangesAsync();
            return entry;
        }

        // ── الاختبارات البرمجية للتقارير ───────────────────────────────────────────────────────

        [Fact]
        public async Task GetTrialBalance_ShouldBeBalanced_AndIsolateBranches()
        {
            // Arrange
            var context = GetSqliteDbContext();

            // فرع بغداد (الحالي)
            var cashBg = await SeedAccountAsync(context, "1101", "الصندوق بغداد", AccountType.Asset, _baghdadBranchId);
            var capitalBg = await SeedAccountAsync(context, "3101", "رأس المال بغداد", AccountType.Equity, _baghdadBranchId);
            await PostJournalEntryAsync(context, "رأس المال الافتتاحي بغداد", _baghdadBranchId, DateTime.UtcNow,
                (cashBg, 50000, 0),
                (capitalBg, 0, 50000)
            );

            // فرع أربيل (معزول)
            var cashErbil = await SeedAccountAsync(context, "1101", "الصندوق أربيل", AccountType.Asset, _erbilBranchId);
            var capitalErbil = await SeedAccountAsync(context, "3101", "رأس المال أربيل", AccountType.Equity, _erbilBranchId);
            await PostJournalEntryAsync(context, "رأس المال الافتتاحي أربيل", _erbilBranchId, DateTime.UtcNow,
                (cashErbil, 75000, 0),
                (capitalErbil, 0, 75000)
            );

            var handler = new GetTrialBalanceQueryHandler(context, _currentUserServiceMock.Object);

            // Act
            var result = await handler.Handle(new GetTrialBalanceQuery(), CancellationToken.None);

            // Assert
            result.Accounts.Should().NotBeEmpty();
            result.Accounts.All(r => r.AccountId != cashErbil.Id && r.AccountId != capitalErbil.Id).Should().BeTrue("لا يجب عرض حسابات فرع أربيل المعزول");
            
            var totalDebit = result.Accounts.Sum(r => r.TotalDebit);
            var totalCredit = result.Accounts.Sum(r => r.TotalCredit);
            totalDebit.Should().Be(50000);
            totalCredit.Should().Be(50000);
            (totalDebit == totalCredit).Should().BeTrue("ميزان المراجعة يجب أن يكون متوازناً تماماً");
        }

        [Fact]
        public async Task GetProfitAndLoss_ShouldReturnCorrectValues_AndIsolateBranches()
        {
            // Arrange
            var context = GetSqliteDbContext();

            var cashBg = await SeedAccountAsync(context, "1101", "الصندوق", AccountType.Asset, _baghdadBranchId);
            var salesBg = await SeedAccountAsync(context, "4101", "إيرادات المبيعات", AccountType.Revenue, _baghdadBranchId);
            var rentBg = await SeedAccountAsync(context, "5102", "مصروف الإيجار", AccountType.Expense, _baghdadBranchId);

            // قيود بغداد
            await PostJournalEntryAsync(context, "إيراد مبيعات", _baghdadBranchId, DateTime.UtcNow,
                (cashBg, 12000, 0),
                (salesBg, 0, 12000)
            );
            await PostJournalEntryAsync(context, "مصروف الإيجار شهري", _baghdadBranchId, DateTime.UtcNow,
                (rentBg, 2000, 0),
                (cashBg, 0, 2000)
            );

            // قيود أربيل (معزول)
            var salesErbil = await SeedAccountAsync(context, "4101", "إيرادات أربيل", AccountType.Revenue, _erbilBranchId);
            await PostJournalEntryAsync(context, "إيراد مبيعات أربيل", _erbilBranchId, DateTime.UtcNow,
                (cashBg, 99000, 0),
                (salesErbil, 0, 99000)
            );

            var handler = new GetProfitAndLossQueryHandler(context, _currentUserServiceMock.Object);

            // Act
            var result = await handler.Handle(new GetProfitAndLossQuery(), CancellationToken.None);

            // Assert
            result.TotalRevenues.Should().Be(12000);
            result.TotalExpenses.Should().Be(2000);
            result.NetProfitOrLoss.Should().Be(10000); // 12000 - 2000
        }

        [Fact]
        public async Task GetBalanceSheet_ShouldHoldAccountingEquation_AndIsolateBranches()
        {
            // Arrange
            var context = GetSqliteDbContext();

            var cashBg = await SeedAccountAsync(context, "1101", "الصندوق", AccountType.Asset, _baghdadBranchId);
            var inventoryBg = await SeedAccountAsync(context, "1201", "المخزون", AccountType.Asset, _baghdadBranchId);
            var supplierBg = await SeedAccountAsync(context, "2101", "الدائنين", AccountType.Liability, _baghdadBranchId);
            var capitalBg = await SeedAccountAsync(context, "3101", "رأس المال", AccountType.Equity, _baghdadBranchId);
            var salesBg = await SeedAccountAsync(context, "4101", "الإيرادات", AccountType.Revenue, _baghdadBranchId);

            // 1. إثبات رأس المال: 50000 في الصندوق
            await PostJournalEntryAsync(context, "إثبات رأس المال", _baghdadBranchId, DateTime.UtcNow,
                (cashBg, 50000, 0),
                (capitalBg, 0, 50000)
            );

            // 2. شراء سيارة بالآجل: 15000 في المخزون
            await PostJournalEntryAsync(context, "شراء سيارة آجل", _baghdadBranchId, DateTime.UtcNow,
                (inventoryBg, 15000, 0),
                (supplierBg, 0, 15000)
            );

            // 3. تحقيق بيع نقدي بربح: بعنا سيارة تكلفتها 15000 بسعر 20000 نقداً
            // إيراد مبيعات: 20000
            await PostJournalEntryAsync(context, "إيراد بيع سيارة", _baghdadBranchId, DateTime.UtcNow,
                (cashBg, 20000, 0),
                (salesBg, 0, 20000)
            );
            // تكلفة المبيعات COGS (تخفيض المخزون): 15000
            var cogsBg = await SeedAccountAsync(context, "5101", "تكلفة المبيعات", AccountType.Expense, _baghdadBranchId);
            await PostJournalEntryAsync(context, "تكلفة السيارة المباعة", _baghdadBranchId, DateTime.UtcNow,
                (cogsBg, 15000, 0),
                (inventoryBg, 0, 15000)
            );

            var handler = new GetBalanceSheetQueryHandler(context, _currentUserServiceMock.Object);

            // Act
            var result = await handler.Handle(new GetBalanceSheetQuery(), CancellationToken.None);

            // Assert
            // الأصول = الصندوق (50000 + 20000 = 70000) والمخزون (15000 - 15000 = 0) -> إجمالي الأصول = 70000
            result.TotalAssets.Should().Be(70000);

            // الالتزامات = الدائنين (15000)
            result.TotalLiabilities.Should().Be(15000);

            // حقوق الملكية الأساسية = رأس المال (50000)
            result.TotalEquityAccounts.Should().Be(50000);

            // صافي ربح الفترة = المبيعات (20000) - تكلفة المبيعات (15000) = 5000
            result.NetProfitOrLoss.Should().Be(5000);

            // إجمالي الالتزامات وحقوق الملكية = 15000 + 50000 + 5000 = 70000
            result.TotalLiabilitiesAndEquity.Should().Be(70000);

            // تحقق من المعادلة المحاسبية الكبرى
            result.TotalAssets.Should().Be(result.TotalLiabilitiesAndEquity);
        }

        [Fact]
        public async Task GetCustomerLedger_ShouldCalculateOpeningAndRunningBalance_AndPaginate()
        {
            // Arrange
            var context = GetSqliteDbContext();

            // تهيئة العميل وحسابه المساعد
            var subAccount = await SeedAccountAsync(context, "13010001", "ذمم أحمد", AccountType.Asset, _baghdadBranchId);
            var customer = new Customer
            {
                Id = Guid.NewGuid(),
                Name = "أحمد البغدادي",
                Phone = "07700000000",
                IdNumber = "NID-123456",
                AccountId = subAccount.Id,
                BranchId = _baghdadBranchId
            };
            context.Customers.Add(customer);
            await context.SaveChangesAsync();

            var revenueAcc = await SeedAccountAsync(context, "4101", "إيرادات", AccountType.Revenue, _baghdadBranchId);
            var cashAcc = await SeedAccountAsync(context, "1101", "الصندوق", AccountType.Asset, _baghdadBranchId);

            // حركات قبل FromDate (لتوليد رصيد افتتاحي)
            var dateBefore = DateTime.UtcNow.AddDays(-5);
            await PostJournalEntryAsync(context, "فاتورة مبيعات آجل أولى", _baghdadBranchId, dateBefore,
                (subAccount, 1000, 0),
                (revenueAcc, 0, 1000)
            );

            // حركات خلال الفترة
            var dateDuring1 = DateTime.UtcNow.AddDays(-2);
            await PostJournalEntryAsync(context, "تحصيل دفعة نقدية", _baghdadBranchId, dateDuring1,
                (cashAcc, 400, 0),
                (subAccount, 0, 400)
            );

            var dateDuring2 = DateTime.UtcNow.AddDays(-1);
            await PostJournalEntryAsync(context, "فاتورة مبيعات آجل ثانية", _baghdadBranchId, dateDuring2,
                (subAccount, 1500, 0),
                (revenueAcc, 0, 1500)
            );

            var handler = new GetCustomerLedgerQueryHandler(context, _currentUserServiceMock.Object);

            // Act
            var result = await handler.Handle(new GetCustomerLedgerQuery
            {
                CustomerId = customer.Id,
                FromDate = DateTime.UtcNow.AddDays(-3), // بعد الفاتورة الأولى وقبل الدفعة
                ToDate = DateTime.UtcNow,
                Page = 1,
                PageSize = 10
            }, CancellationToken.None);

            // Assert
            result.CustomerName.Should().Be("أحمد البغدادي");
            result.OpeningBalance.Should().Be(1000); // الفاتورة الأولى فقط
            result.ClosingBalance.Should().Be(2100); // 1000 - 400 + 1500 = 2100
            result.TotalCount.Should().Be(2); // التحصيل والفاتورة الثانية
            result.Transactions.Count.Should().Be(2);

            // الحركة الأولى بالفترة (التحصيل): الرصيد الجاري = 1000 - 400 = 600
            result.Transactions[0].Credit.Should().Be(400);
            result.Transactions[0].RunningBalance.Should().Be(600);

            // الحركة الثانية (الفاتورة الثانية): الرصيد الجاري = 600 + 1500 = 2100
            result.Transactions[1].Debit.Should().Be(1500);
            result.Transactions[1].RunningBalance.Should().Be(2100);
        }

        [Fact]
        public async Task GetInventoryValuation_ShouldMatchBookValue_AndIsolateBranches()
        {
            // Arrange
            var context = GetSqliteDbContext();

            // سيارات بغداد (المتاحة)
            var carBg1 = new Vehicle { Id = Guid.NewGuid(), Model = "KIA Sportage", ChassisNumber = "CH-KIA-01", PurchaseCost = 20000, BookValue = 20000, Status = "Available", IsSold = false, BranchId = _baghdadBranchId };
            var carBg2 = new Vehicle { Id = Guid.NewGuid(), Model = "Hyundai Tucson", ChassisNumber = "CH-HY-02", PurchaseCost = 22000, BookValue = 22000, Status = "Available", IsSold = false, BranchId = _baghdadBranchId };
            // سيارة بغداد (مباعة)
            var carBgSold = new Vehicle { Id = Guid.NewGuid(), Model = "Toyota Corolla", ChassisNumber = "CH-TOY-03", PurchaseCost = 15000, BookValue = 15000, Status = "Sold", IsSold = true, BranchId = _baghdadBranchId };
            // سيارة أربيل (متاحة - معزولة)
            var carErbil = new Vehicle { Id = Guid.NewGuid(), Model = "BMW X5", ChassisNumber = "CH-BMW-04", PurchaseCost = 60000, BookValue = 60000, Status = "Available", IsSold = false, BranchId = _erbilBranchId };

            context.Vehicles.AddRange(carBg1, carBg2, carBgSold, carErbil);
            await context.SaveChangesAsync();

            var handler = new GetInventoryValuationQueryHandler(context, _currentUserServiceMock.Object);

            // Act
            var result = await handler.Handle(new GetInventoryValuationQuery(), CancellationToken.None);

            // Assert
            result.TotalVehiclesCount.Should().Be(2); // KIA & Hyundai فقط
            result.TotalBookValue.Should().Be(42000); // 20000 + 22000
            result.Vehicles.Any(v => v.ChassisNumber == "CH-TOY-03" || v.ChassisNumber == "CH-BMW-04").Should().BeFalse("لا يجب عرض سيارات مباعة أو من فروع أخرى");
        }

        [Fact]
        public async Task GetInstallmentsAging_ShouldClassifyPaidPendingOverdue()
        {
            // Arrange
            var context = GetSqliteDbContext();

            // Seed customer account to satisfy foreign key constraint
            var customerAccount = await SeedAccountAsync(context, "13010002", "ذمم زبون التقسيط", AccountType.Asset, _baghdadBranchId);

            var customer = new Customer 
            { 
                Id = Guid.NewGuid(), 
                Name = "زبون التقسيط", 
                Phone = "123", 
                IdNumber = "123", 
                AccountId = customerAccount.Id, 
                BranchId = _baghdadBranchId 
            };
            
            var vehicle = new Vehicle { Id = Guid.NewGuid(), Model = "KIA Optima", ChassisNumber = "CH-OPT-11", PurchaseCost = 10000, BookValue = 10000, Status = "Sold", IsSold = true, BranchId = _baghdadBranchId };
            
            context.Customers.Add(customer);
            context.Vehicles.Add(vehicle);
            await context.SaveChangesAsync();

            var contract = new SalesContract
            {
                Id = Guid.NewGuid(),
                ContractNumber = "INV-AGING-01",
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 12000,
                NetPrice = 12000,
                BranchId = _baghdadBranchId
            };
            context.SalesContracts.Add(contract);
            await context.SaveChangesAsync();

            var plan = new InstallmentPlan
            {
                Id = Guid.NewGuid(),
                SalesContractId = contract.Id,
                TotalAmount = 10000,
                TotalPlanAmount = 11000,
                BranchId = _baghdadBranchId
            };
            context.InstallmentPlans.Add(plan);
            await context.SaveChangesAsync();

            var referenceDate = new DateTime(2026, 06, 11);

            // القسط 1: مسدد
            var instPaid = new Installment
            {
                Id = Guid.NewGuid(),
                InstallmentPlanId = plan.Id,
                InstallmentNumber = 1,
                DueDate = referenceDate.AddMonths(-2),
                Amount = 1000,
                PaidAmount = 1000,
                Status = "Paid",
                BranchId = _baghdadBranchId
            };

            // القسط 2: متأخر
            var instOverdue = new Installment
            {
                Id = Guid.NewGuid(),
                InstallmentPlanId = plan.Id,
                InstallmentNumber = 2,
                DueDate = referenceDate.AddMonths(-1), // متأخر بشهر
                Amount = 1000,
                PaidAmount = 300,
                Status = "PartiallyPaid",
                BranchId = _baghdadBranchId
            };

            // القسط 3: معلق مستقبلي
            var instPending = new Installment
            {
                Id = Guid.NewGuid(),
                InstallmentPlanId = plan.Id,
                InstallmentNumber = 3,
                DueDate = referenceDate.AddMonths(1), // مستحق مستقبلاً
                Amount = 1000,
                PaidAmount = 0,
                Status = "Pending",
                BranchId = _baghdadBranchId
            };

            context.Installments.AddRange(instPaid, instOverdue, instPending);
            await context.SaveChangesAsync();

            var handler = new GetInstallmentsAgingQueryHandler(context, _currentUserServiceMock.Object);

            // Act
            var result = await handler.Handle(new GetInstallmentsAgingQuery { AsOfDate = referenceDate }, CancellationToken.None);

            // Assert
            result.PaidCount.Should().Be(1);
            result.OverdueCount.Should().Be(1);
            result.PendingCount.Should().Be(1);

            result.TotalPaidAmount.Should().Be(1300); // 1000 + 300
            result.TotalOverdueAmount.Should().Be(700); // 1000 - 300 = 700 متبقي متأخر
            result.TotalPendingAmount.Should().Be(1000); // 1000 متبقي معلق

            var overdueItem = result.Items.FirstOrDefault(i => i.InstallmentId == instOverdue.Id);
            overdueItem.Should().NotBeNull();
            overdueItem!.Status.Should().Be("Overdue");
            overdueItem.DaysPastDue.Should().BeGreaterThan(25);
        }

        [Fact]
        public async Task GetSupplierLedger_ShouldCalculateOpeningAndRunningBalance_AndPaginate()
        {
            // Arrange
            var context = GetSqliteDbContext();

            // تهيئة المورد وحسابه المساعد
            var subAccount = await SeedAccountAsync(context, "21010001", "ذمم المورد المعتمد", AccountType.Liability, _baghdadBranchId);
            var supplier = new Supplier
            {
                Id = Guid.NewGuid(),
                Name = "مورد العراق للمركبات",
                Phone = "07800000000",
                Code = "SUP-IQ-01",
                AccountId = subAccount.Id,
                BranchId = _baghdadBranchId,
                IsActive = true
            };
            context.Suppliers.Add(supplier);
            await context.SaveChangesAsync();

            var inventoryAcc = await SeedAccountAsync(context, "1201", "المخزون", AccountType.Asset, _baghdadBranchId);
            var cashAcc = await SeedAccountAsync(context, "1101", "الصندوق", AccountType.Asset, _baghdadBranchId);

            // حركات قبل FromDate
            var dateBefore = DateTime.UtcNow.AddDays(-5);
            await PostJournalEntryAsync(context, "فاتورة شراء أولى", _baghdadBranchId, dateBefore,
                (inventoryAcc, 10000, 0),
                (subAccount, 0, 10000)
            );

            // حركات خلال الفترة
            var dateDuring1 = DateTime.UtcNow.AddDays(-2);
            await PostJournalEntryAsync(context, "سداد دفعة نقدية للمورد", _baghdadBranchId, dateDuring1,
                (subAccount, 3000, 0),
                (cashAcc, 0, 3000)
            );

            var dateDuring2 = DateTime.UtcNow.AddDays(-1);
            await PostJournalEntryAsync(context, "فاتورة شراء ثانية", _baghdadBranchId, dateDuring2,
                (inventoryAcc, 5000, 0),
                (subAccount, 0, 5000)
            );

            var handler = new GetSupplierLedgerQueryHandler(context, _currentUserServiceMock.Object);

            // Act
            var result = await handler.Handle(new GetSupplierLedgerQuery
            {
                SupplierId = supplier.Id,
                FromDate = DateTime.UtcNow.AddDays(-3),
                ToDate = DateTime.UtcNow,
                Page = 1,
                PageSize = 10
            }, CancellationToken.None);

            // Assert
            result.SupplierName.Should().Be("مورد العراق للمركبات");
            result.OpeningBalance.Should().Be(10000); // الشراء الأول
            result.ClosingBalance.Should().Be(12000); // 10000 - 3000 + 5000 = 12000
            result.TotalCount.Should().Be(2);

            // الحركة الأولى بالفترة (سداد دفعة): الرصيد الجاري = 10000 - 3000 = 7000
            result.Transactions[0].Debit.Should().Be(3000);
            result.Transactions[0].RunningBalance.Should().Be(7000);

            // الحركة الثانية (الشراء الثاني): الرصيد الجاري = 7000 + 5000 = 12000
            result.Transactions[1].Credit.Should().Be(5000);
            result.Transactions[1].RunningBalance.Should().Be(12000);
        }

        [Fact]
        public async Task GetSalesProfitReport_ShouldCalculateProfitsCorrectly_AndIsolateBranches()
        {
            // Arrange
            var context = GetSqliteDbContext();

            // تهيئة الحسابات
            var customerAccount = await SeedAccountAsync(context, "13010004", "ذمم زبون الأرباح", AccountType.Asset, _baghdadBranchId);
            var deferredProfitAccount = await SeedAccountAsync(context, "2301", "أرباح مؤجلة", AccountType.Liability, _baghdadBranchId);
            var recognizedProfitAccount = await SeedAccountAsync(context, "4102", "أرباح محققة", AccountType.Revenue, _baghdadBranchId);

            var customer = new Customer { Id = Guid.NewGuid(), Name = "زبون الأرباح", Phone = "123", IdNumber = "123", AccountId = customerAccount.Id, BranchId = _baghdadBranchId };
            var vehicle = new Vehicle { Id = Guid.NewGuid(), Model = "KIA Cerato", ChassisNumber = "CH-CER-22", PurchaseCost = 8000, BookValue = 8000, Status = "Sold", IsSold = true, BranchId = _baghdadBranchId };
            
            context.Customers.Add(customer);
            context.Vehicles.Add(vehicle);
            await context.SaveChangesAsync();

            var contract = new SalesContract
            {
                Id = Guid.NewGuid(),
                ContractNumber = "INV-PROFIT-01",
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 10000, // ربح مباشر = 10000 - 8000 = 2000
                NetPrice = 10000,
                SaleDate = DateTime.UtcNow,
                BranchId = _baghdadBranchId,
                Status = "Active"
            };
            context.SalesContracts.Add(contract);
            await context.SaveChangesAsync();

            // قيود اليومية لمحاكاة البيع والتحصيل لـ INV-PROFIT-01
            // 1. قيد المبيعات (فيه أرباح مؤجلة 1000)
            await PostJournalEntryAsync(context, "قيد إثبات عقد بيع سيارة رقم: INV-PROFIT-01", _baghdadBranchId, DateTime.UtcNow,
                (customerAccount, 11000, 0),
                (deferredProfitAccount, 0, 1000) // أرباح تقسيط مؤجلة
            );

            // 2. قيد تحصيل قسط (فيه اعتراف بربح 100)
            await PostJournalEntryAsync(context, "قيد تحصيل القسط رقم 1 لعقد INV-PROFIT-01", _baghdadBranchId, DateTime.UtcNow,
                (deferredProfitAccount, 100, 0),
                (recognizedProfitAccount, 0, 100) // أرباح معترف بها
            );

            var handler = new GetSalesProfitReportQueryHandler(context, _currentUserServiceMock.Object);

            // Act
            var result = await handler.Handle(new GetSalesProfitReportQuery(), CancellationToken.None);

            // Assert
            result.TotalSalePrice.Should().Be(10000);
            result.TotalBookValue.Should().Be(8000);
            result.TotalDirectProfit.Should().Be(2000);
            result.TotalDeferredProfitMarkup.Should().Be(1000);
            result.TotalRecognizedInstallmentProfit.Should().Be(100);
            result.TotalOverallProfit.Should().Be(2100); // 2000 direct + 100 recognized interest

            result.Sales.Count.Should().Be(1);
            result.Sales[0].ContractNumber.Should().Be("INV-PROFIT-01");
            result.Sales[0].DirectProfit.Should().Be(2000);
            result.Sales[0].TotalProfitMarkup.Should().Be(1000);
            result.Sales[0].RecognizedInstallmentProfit.Should().Be(100);
        }

        [Fact]
        public async Task GetTrialBalance_ShouldCalculateOpeningPeriodClosing_AndReconcileBalancedTotals()
        {
            // Arrange
            var context = GetSqliteDbContext();
            var cashAcc = await SeedAccountAsync(context, "1101", "الصندوق", AccountType.Asset, _baghdadBranchId);
            var capitalAcc = await SeedAccountAsync(context, "3101", "رأس المال", AccountType.Equity, _baghdadBranchId);

            var pastDate = DateTime.UtcNow.AddMonths(-2);
            var periodDate = DateTime.UtcNow;

            // 1. قيد افتتاح قديم (قبل بداية الفترة)
            await PostJournalEntryAsync(context, "قيد افتتاحي قديم", _baghdadBranchId, pastDate,
                (cashAcc, 500000, 0),
                (capitalAcc, 0, 500000)
            );

            // 2. قيد خلال الفترة الحالية
            await PostJournalEntryAsync(context, "قيد الفترة الحالية", _baghdadBranchId, periodDate,
                (cashAcc, 200000, 0),
                (capitalAcc, 0, 200000)
            );

            var handler = new GetTrialBalanceQueryHandler(context, _currentUserServiceMock.Object);

            // Act: استعلام للفترة الحالية (FromDate = قبل شهر)
            var result = await handler.Handle(new GetTrialBalanceQuery
            {
                FromDate = DateTime.UtcNow.AddMonths(-1),
                ToDate = DateTime.UtcNow.AddDays(1)
            }, CancellationToken.None);

            // Assert
            result.Totals.Should().NotBeNull();
            result.Totals.OpeningDebit.Should().Be(500000);
            result.Totals.OpeningCredit.Should().Be(500000);
            result.Totals.PeriodDebit.Should().Be(200000);
            result.Totals.PeriodCredit.Should().Be(200000);
            result.Totals.ClosingDebit.Should().Be(700000);
            result.Totals.ClosingCredit.Should().Be(700000);
            result.Totals.Difference.Should().Be(0);
            result.Totals.IsBalanced.Should().BeTrue();
        }

        [Fact]
        public async Task GetTrialBalance_WhenDraftJournalExists_ShouldExcludeDraftFromTotals()
        {
            // Arrange
            var context = GetSqliteDbContext();
            var cashAcc = await SeedAccountAsync(context, "1101", "الصندوق", AccountType.Asset, _baghdadBranchId);
            var capitalAcc = await SeedAccountAsync(context, "3101", "رأس المال", AccountType.Equity, _baghdadBranchId);

            // قيد مسودة غير مرحل
            var draftEntry = new JournalEntry
            {
                Id = Guid.NewGuid(),
                EntryNumber = "JV-DRAFT-99",
                Description = "مسودة غير مرحلة",
                EntryDate = DateTime.UtcNow,
                IsPosted = false, // DRAFT!
                BranchId = _baghdadBranchId,
                CreatedBy = "test-user"
            };
            draftEntry.Lines.Add(new JournalLine { Id = Guid.NewGuid(), AccountId = cashAcc.Id, Debit = 999000, Credit = 0 });
            draftEntry.Lines.Add(new JournalLine { Id = Guid.NewGuid(), AccountId = capitalAcc.Id, Debit = 0, Credit = 999000 });
            context.JournalEntries.Add(draftEntry);
            await context.SaveChangesAsync();

            var handler = new GetTrialBalanceQueryHandler(context, _currentUserServiceMock.Object);

            // Act
            var result = await handler.Handle(new GetTrialBalanceQuery(), CancellationToken.None);

            // Assert: المسودة مستبعدة تماماً
            result.Totals.PeriodDebit.Should().Be(0);
            result.Totals.PeriodCredit.Should().Be(0);
            result.Totals.ClosingDebit.Should().Be(0);
            result.Totals.ClosingCredit.Should().Be(0);
        }

        [Fact]
        public async Task GetSupplierProfitability_WithSoldAndUnsoldVehicles_ShouldReconcileTotalsAndCalculations()
        {
            // Arrange
            var context = GetSqliteDbContext();
            _currentUserServiceMock.Setup(x => x.CanSeeAllBranches).Returns(true);

            var acc = await SeedAccountAsync(context, "2101001", "حساب المورد", AccountType.Liability, _baghdadBranchId);

            var supplier = new Supplier
            {
                Id = Guid.NewGuid(),
                Name = "شركة النور للمربعات والسيارات",
                Code = "SUP-TEST-101",
                Phone = "07700000000",
                AccountId = acc.Id,
                BranchId = _baghdadBranchId,
                IsActive = true
            };
            context.Suppliers.Add(supplier);

            // 1. سيارة مباعة
            var car1 = new Vehicle
            {
                Id = Guid.NewGuid(),
                Brand = "Toyota",
                Model = "Camry",
                Year = 2025,
                ChassisNumber = "VIN-TOYOTA-001",
                PurchaseCost = 20000000,
                CustomDuties = 1000000,
                MaintenanceCost = 500000,
                BranchId = _baghdadBranchId,
                Status = "Sold",
                IsSold = true,
                Currency = "IQD"
            };
            context.Vehicles.Add(car1);

            var purchase1 = new Purchase
            {
                Id = Guid.NewGuid(),
                PurchaseNumber = "PUR-001",
                SupplierId = supplier.Id,
                VehicleId = car1.Id,
                PurchaseDate = DateTime.UtcNow.AddDays(-30),
                PurchaseCost = 20000000,
                Status = "Active",
                BranchId = _baghdadBranchId
            };
            context.Purchases.Add(purchase1);

            var customerAcc = await SeedAccountAsync(context, "1102001", "حساب العميل", AccountType.Asset, _baghdadBranchId);

            var customer = new Customer
            {
                Id = Guid.NewGuid(),
                Name = "عميل تجريبي",
                Phone = "07800000000",
                AccountId = customerAcc.Id,
                BranchId = _baghdadBranchId
            };
            context.Customers.Add(customer);

            var sale1 = new SalesContract
            {
                Id = Guid.NewGuid(),
                ContractNumber = "INV-001",
                CustomerId = customer.Id,
                VehicleId = car1.Id,
                SaleDate = DateTime.UtcNow.AddDays(-5),
                SalePrice = 26000000,
                Discount = 1000000,
                NetPrice = 25000000, // Net of discount
                Status = "Active",
                BranchId = _baghdadBranchId
            };
            context.SalesContracts.Add(sale1);

            // 2. سيارة غير مباعة
            var car2 = new Vehicle
            {
                Id = Guid.NewGuid(),
                Brand = "Toyota",
                Model = "Corolla",
                Year = 2024,
                ChassisNumber = "VIN-TOYOTA-002",
                PurchaseCost = 15000000,
                CustomDuties = 500000,
                MaintenanceCost = 0,
                BranchId = _baghdadBranchId,
                Status = "Available",
                IsSold = false,
                Currency = "IQD"
            };
            context.Vehicles.Add(car2);

            var purchase2 = new Purchase
            {
                Id = Guid.NewGuid(),
                PurchaseNumber = "PUR-002",
                SupplierId = supplier.Id,
                VehicleId = car2.Id,
                PurchaseDate = DateTime.UtcNow.AddDays(-10),
                PurchaseCost = 15000000,
                Status = "Active",
                BranchId = _baghdadBranchId
            };
            context.Purchases.Add(purchase2);

            await context.SaveChangesAsync();

            var handler = new GetSupplierProfitabilityQueryHandler(context, _currentUserServiceMock.Object);
            var query = new GetSupplierProfitabilityQuery { SupplierId = supplier.Id };

            // Act
            var report = await handler.Handle(query, CancellationToken.None);

            // Assert
            report.Supplier.Name.Should().Be("شركة النور للمربعات والسيارات");
            report.Summary.PurchasedVehicleCount.Should().Be(2);
            report.Summary.SoldVehicleCount.Should().Be(1);
            report.Summary.UnsoldVehicleCount.Should().Be(1);

            // Car1 Total Cost = 20,000,000 + 1,000,000 + 500,000 = 21,500,000
            // Car1 Net Revenue = 25,000,000
            // Realized Profit = 25,000,000 - 21,500,000 = 3,500,000
            report.Summary.CostOfSoldVehicles.Should().Be(21500000);
            report.Summary.RealizedRevenue.Should().Be(25000000);
            report.Summary.RealizedGrossProfit.Should().Be(3500000);
            report.Summary.UnsoldInventoryCost.Should().Be(15500000);
            report.Summary.PurchaseValue.Should().Be(21500000 + 15500000);

            // Automatic reconciliation check
            report.Summary.RealizedGrossProfit.Should().Be(report.Summary.RealizedRevenue - report.Summary.CostOfSoldVehicles);
            report.Summary.PurchaseValue.Should().Be(report.Summary.CostOfSoldVehicles + report.Summary.UnsoldInventoryCost);
        }

        [Fact]
        public async Task GetSupplierProfitability_WithCancelledSale_ShouldExcludeCancelledSaleFromProfit()
        {
            // Arrange
            var context = GetSqliteDbContext();
            _currentUserServiceMock.Setup(x => x.CanSeeAllBranches).Returns(true);

            var acc = await SeedAccountAsync(context, "2101002", "حساب مورد أربيل", AccountType.Liability, _erbilBranchId);

            var supplier = new Supplier
            {
                Id = Guid.NewGuid(),
                Name = "مورد أربيل الممتاز",
                Code = "SUP-ERBIL-01",
                AccountId = acc.Id,
                BranchId = _erbilBranchId,
                IsActive = true
            };
            context.Suppliers.Add(supplier);

            var car = new Vehicle
            {
                Id = Guid.NewGuid(),
                Brand = "Hyundai",
                Model = "Tucson",
                Year = 2025,
                ChassisNumber = "VIN-HYUNDAI-99",
                PurchaseCost = 18000000,
                BranchId = _erbilBranchId,
                Status = "Available",
                IsSold = false,
                Currency = "IQD"
            };
            context.Vehicles.Add(car);

            var purchase = new Purchase
            {
                Id = Guid.NewGuid(),
                PurchaseNumber = "PUR-ERB-01",
                SupplierId = supplier.Id,
                VehicleId = car.Id,
                PurchaseDate = DateTime.UtcNow.AddDays(-20),
                PurchaseCost = 18000000,
                Status = "Active",
                BranchId = _erbilBranchId
            };
            context.Purchases.Add(purchase);

            var customerAcc = await SeedAccountAsync(context, "1102002", "حساب عميل أربيل", AccountType.Asset, _erbilBranchId);

            var customer = new Customer
            {
                Id = Guid.NewGuid(),
                Name = "عميل أربيل",
                Phone = "07500000000",
                AccountId = customerAcc.Id,
                BranchId = _erbilBranchId
            };
            context.Customers.Add(customer);

            // عقد ملغى (Cancelled)
            var cancelledSale = new SalesContract
            {
                Id = Guid.NewGuid(),
                ContractNumber = "INV-CANCELLED-99",
                CustomerId = customer.Id,
                VehicleId = car.Id,
                SaleDate = DateTime.UtcNow.AddDays(-2),
                SalePrice = 22000000,
                NetPrice = 22000000,
                Status = "Cancelled", // CANCELLED!
                BranchId = _erbilBranchId
            };
            context.SalesContracts.Add(cancelledSale);

            await context.SaveChangesAsync();

            var handler = new GetSupplierProfitabilityQueryHandler(context, _currentUserServiceMock.Object);

            // Act
            var report = await handler.Handle(new GetSupplierProfitabilityQuery { SupplierId = supplier.Id }, CancellationToken.None);

            // Assert: العقد الملغى لا يحتسب كربح محقق
            report.Summary.SoldVehicleCount.Should().Be(0);
            report.Summary.UnsoldVehicleCount.Should().Be(1);
            report.Summary.RealizedRevenue.Should().Be(0);
            report.Summary.RealizedGrossProfit.Should().Be(0);
            report.Summary.UnsoldInventoryCost.Should().Be(18000000);
        }
    }
}
