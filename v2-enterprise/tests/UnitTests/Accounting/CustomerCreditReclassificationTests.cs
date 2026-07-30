using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using Moq;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Accounting.Queries;
using CarShowroomManagementV2.Application.Customers.Queries;
using CarShowroomManagementV2.Infrastructure.Persistence;
using CarShowroomManagementV2.Infrastructure.Persistence.Interceptors;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.UnitTests.Accounting
{
    public class CustomerCreditReclassificationTests : IDisposable
    {
        private readonly Mock<ICurrentUserService> _currentUserServiceMock;
        private readonly AuditableEntitySaveChangesInterceptor _interceptor;
        private readonly Guid _branchAId = Guid.NewGuid();
        private readonly Guid _branchBId = Guid.NewGuid();
        private readonly Microsoft.Data.Sqlite.SqliteConnection _connection;

        public CustomerCreditReclassificationTests()
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

        private async Task<(Customer customer, Account account)> SeedCustomerWithAccountAsync(ApplicationDbContext context, string name, string code, Guid branchId)
        {
            var arParent = await context.Accounts.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.AccountCode == "1301" && a.BranchId == branchId);
            if (arParent == null)
            {
                arParent = new Account { Id = Guid.NewGuid(), AccountCode = "1301", Name = "ذمم المدينين", Type = AccountType.Asset, BranchId = branchId, IsActive = true };
                context.Accounts.Add(arParent);
                await context.SaveChangesAsync();
            }

            var subAccount = new Account
            {
                Id = Guid.NewGuid(),
                AccountCode = code,
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
                Phone = "07700000000",
                IdNumber = $"ID-{code}",
                CustomerType = "Individual",
                AccountId = subAccount.Id,
                BranchId = branchId
            };
            context.Customers.Add(customer);
            await context.SaveChangesAsync();

            return (customer, subAccount);
        }

        private async Task PostJournalEntryAsync(ApplicationDbContext context, string entryNum, Guid branchId, Guid debitAccId, Guid creditAccId, decimal amount, DateTime date)
        {
            var entry = new JournalEntry
            {
                Id = Guid.NewGuid(),
                EntryNumber = entryNum,
                EntryDate = date,
                Description = $"قيد تجريبي {entryNum}",
                IsPosted = true,
                BranchId = branchId,
                Lines =
                {
                    new JournalLine { Id = Guid.NewGuid(), AccountId = debitAccId, Debit = amount, Credit = 0 },
                    new JournalLine { Id = Guid.NewGuid(), AccountId = creditAccId, Debit = 0, Credit = amount }
                }
            };
            context.JournalEntries.Add(entry);
            await context.SaveChangesAsync();
        }

        // 1. Customer with debit balance only
        [Fact]
        public async Task Test1_CustomerWithDebitBalanceOnly_StaysInAssets()
        {
            var context = GetSqliteDbContext();
            var (cust, acc) = await SeedCustomerWithAccountAsync(context, "الزبون 1", "13010001", _branchAId);
            var revAcc = new Account { Id = Guid.NewGuid(), AccountCode = "4101", Name = "إيرادات", Type = AccountType.Revenue, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(revAcc);
            await context.SaveChangesAsync();

            await PostJournalEntryAsync(context, "JV-1", _branchAId, acc.Id, revAcc.Id, 15000000, DateTime.UtcNow);

            var handler = new GetBalanceSheetQueryHandler(context, _currentUserServiceMock.Object);
            var bs = await handler.Handle(new GetBalanceSheetQuery(), CancellationToken.None);

            bs.Assets.Should().ContainSingle(a => a.AccountCode == "13010001" && a.Amount == 15000000);
            bs.Liabilities.Should().NotContain(l => l.AccountCode == "2109");
            bs.TotalAssets.Should().Be(15000000);
            bs.TotalLiabilitiesAndEquity.Should().Be(15000000);
        }

        // 2. Customer with credit balance only
        [Fact]
        public async Task Test2_CustomerWithCreditBalanceOnly_ReclassifiesToLiabilities()
        {
            var context = GetSqliteDbContext();
            var (cust, acc) = await SeedCustomerWithAccountAsync(context, "الزبون 2", "13010002", _branchAId);
            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(invAcc);
            await context.SaveChangesAsync();

            await PostJournalEntryAsync(context, "JV-2", _branchAId, invAcc.Id, acc.Id, 25000000, DateTime.UtcNow);

            var handler = new GetBalanceSheetQueryHandler(context, _currentUserServiceMock.Object);
            var bs = await handler.Handle(new GetBalanceSheetQuery(), CancellationToken.None);

            bs.Assets.Should().NotContain(a => a.AccountCode == "13010002");
            bs.Liabilities.Should().ContainSingle(l => l.AccountCode == "2109" && l.Amount == 25000000);
            bs.TotalAssets.Should().Be(25000000); // Inventory = 25M
            bs.TotalLiabilities.Should().Be(25000000); // Customer credit balance = 25M
            bs.TotalLiabilitiesAndEquity.Should().Be(25000000);
        }

        // 3. Multiple customers: Customer A debit 20M, Customer B credit 12M (Mandatory Example)
        [Fact]
        public async Task Test3_MultipleCustomers_DebitAndCredit_PresentsSeparatelyWithoutNetting()
        {
            var context = GetSqliteDbContext();
            var (custA, accA) = await SeedCustomerWithAccountAsync(context, "الزبون أ", "13010001", _branchAId);
            var (custB, accB) = await SeedCustomerWithAccountAsync(context, "الزبون ب", "13010002", _branchAId);

            var cashAcc = new Account { Id = Guid.NewGuid(), AccountCode = "111001", Name = "صندوق", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            var revAcc = new Account { Id = Guid.NewGuid(), AccountCode = "4101", Name = "إيرادات", Type = AccountType.Revenue, BranchId = _branchAId, IsActive = true };
            context.Accounts.AddRange(cashAcc, invAcc, revAcc);
            await context.SaveChangesAsync();

            // Customer A: Debit 20,000,000 IQD
            await PostJournalEntryAsync(context, "JV-A", _branchAId, accA.Id, revAcc.Id, 20000000, DateTime.UtcNow);

            // Customer B: Credit 12,000,000 IQD (Purchased car from Customer B for 30M, paid 18M)
            await PostJournalEntryAsync(context, "JV-B1", _branchAId, invAcc.Id, accB.Id, 30000000, DateTime.UtcNow);
            await PostJournalEntryAsync(context, "JV-B2", _branchAId, accB.Id, cashAcc.Id, 18000000, DateTime.UtcNow);

            var handler = new GetBalanceSheetQueryHandler(context, _currentUserServiceMock.Object);
            var bs = await handler.Handle(new GetBalanceSheetQuery(), CancellationToken.None);

            // Verified Requirements:
            // Assets: Accounts Receivable (Customer A) = 20,000,000 (NOT 8,000,000!)
            bs.Assets.First(a => a.AccountCode == "13010001").Amount.Should().Be(20000000);
            bs.Assets.Should().NotContain(a => a.AccountCode == "13010002");

            // Liabilities: Customer Credit Balances (أرصدة دائنة للعملاء) = 12,000,000
            bs.Liabilities.First(l => l.AccountCode == "2109").Amount.Should().Be(12000000);

            // Balance Sheet remains balanced!
            var diff = Math.Abs(bs.TotalAssets - bs.TotalLiabilitiesAndEquity);
            diff.Should().Be(0);
        }

        // 4. Customer changing from debit to credit during the period
        [Fact]
        public async Task Test4_CustomerChangingFromDebitToCredit_ReclassifiesCorrectly()
        {
            var context = GetSqliteDbContext();
            var (cust, acc) = await SeedCustomerWithAccountAsync(context, "الزبون ج", "13010003", _branchAId);
            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            var revAcc = new Account { Id = Guid.NewGuid(), AccountCode = "4101", Name = "إيرادات", Type = AccountType.Revenue, BranchId = _branchAId, IsActive = true };
            context.Accounts.AddRange(invAcc, revAcc);
            await context.SaveChangesAsync();

            // Day 1: Debit 10M
            await PostJournalEntryAsync(context, "JV-1", _branchAId, acc.Id, revAcc.Id, 10000000, DateTime.UtcNow.AddDays(-2));
            // Day 2: Vehicle purchase for 30M => Net balance becomes -20M Credit
            await PostJournalEntryAsync(context, "JV-2", _branchAId, invAcc.Id, acc.Id, 30000000, DateTime.UtcNow.AddDays(-1));

            var handler = new GetBalanceSheetQueryHandler(context, _currentUserServiceMock.Object);
            var bs = await handler.Handle(new GetBalanceSheetQuery(), CancellationToken.None);

            bs.Assets.Should().NotContain(a => a.AccountCode == "13010003");
            bs.Liabilities.Should().ContainSingle(l => l.AccountCode == "2109" && l.Amount == 20000000);
        }

        // 5. Customer changing from credit to debit
        [Fact]
        public async Task Test5_CustomerChangingFromCreditToDebit_ReclassifiesBackToAssets()
        {
            var context = GetSqliteDbContext();
            var (cust, acc) = await SeedCustomerWithAccountAsync(context, "الزبون د", "13010004", _branchAId);
            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            var revAcc = new Account { Id = Guid.NewGuid(), AccountCode = "4101", Name = "إيرادات", Type = AccountType.Revenue, BranchId = _branchAId, IsActive = true };
            context.Accounts.AddRange(invAcc, revAcc);
            await context.SaveChangesAsync();

            // Day 1: Credit 15M (Vehicle purchase)
            await PostJournalEntryAsync(context, "JV-1", _branchAId, invAcc.Id, acc.Id, 15000000, DateTime.UtcNow.AddDays(-3));
            // Day 2: Sale contract for 40M => Net balance becomes +25M Debit
            await PostJournalEntryAsync(context, "JV-2", _branchAId, acc.Id, revAcc.Id, 40000000, DateTime.UtcNow.AddDays(-1));

            var handler = new GetBalanceSheetQueryHandler(context, _currentUserServiceMock.Object);
            var bs = await handler.Handle(new GetBalanceSheetQuery(), CancellationToken.None);

            bs.Assets.Should().ContainSingle(a => a.AccountCode == "13010004" && a.Amount == 25000000);
            bs.Liabilities.Should().NotContain(l => l.AccountCode == "2109");
        }

        // 6. Branch isolation
        [Fact]
        public async Task Test6_BranchIsolation_MaintainsBranchScopedReclassification()
        {
            var context = GetSqliteDbContext();
            var (custA, accA) = await SeedCustomerWithAccountAsync(context, "زبون فرع أ", "13010001", _branchAId);
            var (custB, accB) = await SeedCustomerWithAccountAsync(context, "زبون فرع ب", "13010001", _branchBId);

            var invA = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون أ", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            var invB = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون ب", Type = AccountType.Asset, BranchId = _branchBId, IsActive = true };
            context.Accounts.AddRange(invA, invB);
            await context.SaveChangesAsync();

            await PostJournalEntryAsync(context, "JV-A", _branchAId, invA.Id, accA.Id, 10000000, DateTime.UtcNow);
            await PostJournalEntryAsync(context, "JV-B", _branchBId, invB.Id, accB.Id, 50000000, DateTime.UtcNow);

            // Query for Branch A only
            _currentUserServiceMock.Setup(x => x.BranchId).Returns(_branchAId);
            var handler = new GetBalanceSheetQueryHandler(context, _currentUserServiceMock.Object);
            var bs = await handler.Handle(new GetBalanceSheetQuery(), CancellationToken.None);

            bs.Liabilities.First(l => l.AccountCode == "2109").Amount.Should().Be(10000000);
        }

        // 7. Period filtering (ToDate)
        [Fact]
        public async Task Test7_PeriodFiltering_RespectsToDateBoundary()
        {
            var context = GetSqliteDbContext();
            var (cust, acc) = await SeedCustomerWithAccountAsync(context, "الزبون هـ", "13010005", _branchAId);
            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(invAcc);
            await context.SaveChangesAsync();

            var pastDate = new DateTime(2026, 1, 15, 0, 0, 0, DateTimeKind.Utc);
            var futureDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);

            await PostJournalEntryAsync(context, "JV-PAST", _branchAId, invAcc.Id, acc.Id, 8000000, pastDate);
            await PostJournalEntryAsync(context, "JV-FUTURE", _branchAId, invAcc.Id, acc.Id, 12000000, futureDate);

            var handler = new GetBalanceSheetQueryHandler(context, _currentUserServiceMock.Object);
            var bsPast = await handler.Handle(new GetBalanceSheetQuery { ToDate = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc) }, CancellationToken.None);

            bsPast.Liabilities.First(l => l.AccountCode == "2109").Amount.Should().Be(8000000);
        }

        // 8. AR Aging excludes customer credits & summarizes Gross AR and Credit Balances
        [Fact]
        public async Task Test8_ARAging_ExcludesCustomerCredits_AndExposesGrossAndCreditTotals()
        {
            var context = GetSqliteDbContext();
            var (custA, accA) = await SeedCustomerWithAccountAsync(context, "زبون أ", "13010001", _branchAId);
            var (custB, accB) = await SeedCustomerWithAccountAsync(context, "زبون ب", "13010002", _branchAId);
            var revAcc = new Account { Id = Guid.NewGuid(), AccountCode = "4101", Name = "إيرادات", Type = AccountType.Revenue, BranchId = _branchAId, IsActive = true };
            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.AddRange(revAcc, invAcc);
            await context.SaveChangesAsync();

            // Cust A: Debit 20M
            await PostJournalEntryAsync(context, "JV-1", _branchAId, accA.Id, revAcc.Id, 20000000, DateTime.UtcNow);
            // Cust B: Credit 12M
            await PostJournalEntryAsync(context, "JV-2", _branchAId, invAcc.Id, accB.Id, 12000000, DateTime.UtcNow);

            var handler = new GetInstallmentsAgingQueryHandler(context, _currentUserServiceMock.Object);
            var aging = await handler.Handle(new GetInstallmentsAgingQuery(), CancellationToken.None);

            aging.GrossAccountsReceivable.Should().Be(20000000);
            aging.CustomerCreditBalances.Should().Be(12000000);
            aging.NetCustomerPosition.Should().Be(8000000);
        }

        // 9. Customer Statement shows PositionLabel and PositionStatus
        [Fact]
        public async Task Test9_CustomerStatement_ShowsExplicitPositionLabel()
        {
            var context = GetSqliteDbContext();
            var (cust, acc) = await SeedCustomerWithAccountAsync(context, "محمد البغدادي", "13010006", _branchAId);
            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(invAcc);
            await context.SaveChangesAsync();

            await PostJournalEntryAsync(context, "JV-PUR", _branchAId, invAcc.Id, acc.Id, 14000000, DateTime.UtcNow);

            var handler = new GetCustomerStatementQueryHandler(context);
            var statement = await handler.Handle(new GetCustomerStatementQuery { CustomerId = cust.Id }, CancellationToken.None);

            statement.Summary.PositionStatus.Should().Be("Credit");
            statement.Summary.PositionLabel.Should().Be("المعرض مدين للزبون");
            statement.Summary.AccountBalance.Should().Be(-14000000);
        }

        // 10. Balance Sheet remains 100% balanced across all test runs
        [Fact]
        public async Task Test10_BalanceSheet_RemainsBalanced()
        {
            var context = GetSqliteDbContext();
            var (cust, acc) = await SeedCustomerWithAccountAsync(context, "سليم", "13010007", _branchAId);
            var invAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون", Type = AccountType.Asset, BranchId = _branchAId, IsActive = true };
            context.Accounts.Add(invAcc);
            await context.SaveChangesAsync();

            await PostJournalEntryAsync(context, "JV-1", _branchAId, invAcc.Id, acc.Id, 9000000, DateTime.UtcNow);

            var handler = new GetBalanceSheetQueryHandler(context, _currentUserServiceMock.Object);
            var bs = await handler.Handle(new GetBalanceSheetQuery(), CancellationToken.None);

            bs.TotalAssets.Should().Be(9000000);
            bs.TotalLiabilitiesAndEquity.Should().Be(9000000);
            Math.Abs(bs.TotalAssets - bs.TotalLiabilitiesAndEquity).Should().Be(0);
        }
    }
}
