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
using CarShowroomManagementV2.Application.Accounting.Queries;
using CarShowroomManagementV2.Application.Customers.Queries;
using CarShowroomManagementV2.Infrastructure.Persistence;
using CarShowroomManagementV2.Infrastructure.Persistence.Interceptors;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.UnitTests.Purchases
{
    public class FinancialValidationTests : IDisposable
    {
        private readonly Mock<ICurrentUserService> _currentUserServiceMock;
        private readonly AuditableEntitySaveChangesInterceptor _interceptor;
        private readonly Guid _testBranchId = Guid.NewGuid();
        private readonly Microsoft.Data.Sqlite.SqliteConnection _connection;

        public FinancialValidationTests()
        {
            _currentUserServiceMock = new Mock<ICurrentUserService>();
            _currentUserServiceMock.Setup(x => x.UserId).Returns("test-user-01");
            _currentUserServiceMock.Setup(x => x.BranchId).Returns(_testBranchId);
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

        [Fact]
        public async Task ValidateCustomerPurchaseScenario_FullFinancialValidation()
        {
            var context = GetSqliteDbContext();

            // 1. Seed Branch
            var branch = new Branch { Id = _testBranchId, Name = "الفرع الرئيسي", Code = "BR-MAIN", IsActive = true };
            context.Branches.Add(branch);
            await context.SaveChangesAsync();

            // 2. Seed Control Accounts (1201 Inventory, 1301 AR, 111001 Cash, 4101 Sales Revenue)
            var inventoryAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون السيارات", Type = AccountType.Asset, BranchId = _testBranchId, IsActive = true };
            var arParentAcc = new Account { Id = Guid.NewGuid(), AccountCode = "1301", Name = "ذمم المدينين (الزبائن)", Type = AccountType.Asset, BranchId = _testBranchId, IsActive = true };
            var cashAcc = new Account { Id = Guid.NewGuid(), AccountCode = "111001", Name = "صندوق النقدية", Type = AccountType.Asset, BranchId = _testBranchId, IsActive = true };
            var salesRevAcc = new Account { Id = Guid.NewGuid(), AccountCode = "4101", Name = "إيرادات المبيعات", Type = AccountType.Revenue, BranchId = _testBranchId, IsActive = true };

            context.Accounts.AddRange(inventoryAcc, arParentAcc, cashAcc, salesRevAcc);
            await context.SaveChangesAsync();

            // Seed initial Cash balance so cash box isn't negative
            var initCashEntry = new JournalEntry
            {
                Id = Guid.NewGuid(),
                EntryNumber = "JV-INIT-CASH",
                EntryDate = DateTime.UtcNow.AddDays(-10),
                Description = "رصيد افتتاحي للصندوق",
                IsPosted = true,
                BranchId = _testBranchId,
                Lines =
                {
                    new JournalLine { Id = Guid.NewGuid(), AccountId = cashAcc.Id, Debit = 50000000, Credit = 0 },
                    new JournalLine { Id = Guid.NewGuid(), AccountId = salesRevAcc.Id, Debit = 0, Credit = 50000000 }
                }
            };
            context.JournalEntries.Add(initCashEntry);
            await context.SaveChangesAsync();

            // 3. Seed Customer with Subledger Account (13010001)
            var customerAcc = new Account
            {
                Id = Guid.NewGuid(),
                AccountCode = "13010001",
                Name = "حساب الزبون - محمد علي",
                Type = AccountType.Asset,
                ParentAccountId = arParentAcc.Id,
                BranchId = _testBranchId,
                IsActive = true
            };
            context.Accounts.Add(customerAcc);
            await context.SaveChangesAsync();

            var customer = new Customer
            {
                Id = Guid.NewGuid(),
                Name = "محمد علي",
                Phone = "07701234567",
                IdNumber = "CUST-999",
                CustomerType = "Individual",
                AccountId = customerAcc.Id,
                BranchId = _testBranchId
            };
            context.Customers.Add(customer);
            await context.SaveChangesAsync();

            // Step 1: Initial Debt owed by Customer to Showroom = 10,000,000 IQD
            var initialSaleEntry = new JournalEntry
            {
                Id = Guid.NewGuid(),
                EntryNumber = "JV-SALE-001",
                EntryDate = DateTime.UtcNow.AddDays(-5),
                Description = "بيع آجل سابق للزبون محمد علي",
                IsPosted = true,
                BranchId = _testBranchId,
                ReferenceType = "Sale",
                Lines =
                {
                    new JournalLine { Id = Guid.NewGuid(), AccountId = customerAcc.Id, Debit = 10000000, Credit = 0, Description = "مستحقات بيع سيارة سابقة" },
                    new JournalLine { Id = Guid.NewGuid(), AccountId = salesRevAcc.Id, Debit = 0, Credit = 10000000, Description = "إيراد مبيعات" }
                }
            };
            context.JournalEntries.Add(initialSaleEntry);
            await context.SaveChangesAsync();

            // Step 2 & 3: Purchase vehicle from customer for 30,000,000 IQD and immediately pay 8,000,000 IQD
            var purchaseHandler = new CreatePurchaseCommandHandler(context, _currentUserServiceMock.Object);
            var purchaseCmd = new CreatePurchaseCommand
            {
                SourceType = PurchaseSourceType.Customer,
                CustomerId = customer.Id,
                PurchaseCost = 30000000,
                PaidAmount = 8000000,
                PaymentMethod = PaymentMethod.Cash,
                Model = "Toyota Prado",
                ChassisNumber = "CH-PRADO-2024",
                Year = 2024,
                TargetSellingPrice = 33000000
            };
            var purchaseId = await purchaseHandler.Handle(purchaseCmd, CancellationToken.None);

            // =========================================================================
            // QUERY REPORTS
            // =========================================================================

            // 1. Trial Balance
            var tbHandler = new GetTrialBalanceQueryHandler(context, _currentUserServiceMock.Object);
            var trialBalance = await tbHandler.Handle(new GetTrialBalanceQuery(), CancellationToken.None);

            // 2. Balance Sheet
            var bsHandler = new GetBalanceSheetQueryHandler(context, _currentUserServiceMock.Object);
            var balanceSheet = await bsHandler.Handle(new GetBalanceSheetQuery(), CancellationToken.None);

            // 3. Customer Statement
            var statementHandler = new GetCustomerStatementQueryHandler(context);
            var customerStatement = await statementHandler.Handle(new GetCustomerStatementQuery { CustomerId = customer.Id }, CancellationToken.None);

            // 4. Customer Ledger
            var ledgerHandler = new CarShowroomManagementV2.Application.Accounting.Queries.GetCustomerLedgerQueryHandler(context, _currentUserServiceMock.Object);
            var customerLedger = await ledgerHandler.Handle(new CarShowroomManagementV2.Application.Accounting.Queries.GetCustomerLedgerQuery { CustomerId = customer.Id }, CancellationToken.None);

            // Print report summaries for verification
            Console.WriteLine("=================== 1. TRIAL BALANCE ===================");
            Console.WriteLine($"Total Opening Debit: {trialBalance.Totals.OpeningDebit:N0} | Credit: {trialBalance.Totals.OpeningCredit:N0}");
            Console.WriteLine($"Total Period Debit: {trialBalance.Totals.PeriodDebit:N0} | Credit: {trialBalance.Totals.PeriodCredit:N0}");
            Console.WriteLine($"Total Closing Debit: {trialBalance.Totals.ClosingDebit:N0} | Credit: {trialBalance.Totals.ClosingCredit:N0}");
            Console.WriteLine($"Is Balanced: {trialBalance.Totals.IsBalanced} (Diff: {trialBalance.Totals.Difference:N0})");
            foreach (var row in trialBalance.Accounts)
            {
                Console.WriteLine($"  [{row.AccountCode}] {row.AccountName}: OpeningDr={row.OpeningDebit:N0}, OpeningCr={row.OpeningCredit:N0}, PeriodDr={row.PeriodDebit:N0}, PeriodCr={row.PeriodCredit:N0}, ClosingDr={row.ClosingDebit:N0}, ClosingCr={row.ClosingCredit:N0}");
            }

            Console.WriteLine("\n=================== 2. BALANCE SHEET ===================");
            Console.WriteLine($"Total Assets: {balanceSheet.TotalAssets:N0}");
            Console.WriteLine($"Total Liabilities: {balanceSheet.TotalLiabilities:N0}");
            Console.WriteLine($"Total Liabilities & Equity: {balanceSheet.TotalLiabilitiesAndEquity:N0}");
            foreach (var item in balanceSheet.Assets)
            {
                Console.WriteLine($"  Asset [{item.AccountCode}] {item.AccountName}: {item.Amount:N0}");
            }
            foreach (var item in balanceSheet.Liabilities)
            {
                Console.WriteLine($"  Liability [{item.AccountCode}] {item.AccountName}: {item.Amount:N0}");
            }

            Console.WriteLine("\n=================== 3. CUSTOMER STATEMENT ===================");
            Console.WriteLine($"Customer: {customerStatement.Customer.Name} ({customerStatement.Customer.Phone})");
            Console.WriteLine($"Sales Count: {customerStatement.Summary.SalesCount} | Total Sales: {customerStatement.Summary.TotalSalesAmount:N0}");
            Console.WriteLine($"Customer Purchases Count: {customerStatement.CustomerPurchases.Count}");
            foreach (var cp in customerStatement.CustomerPurchases)
            {
                Console.WriteLine($"  Purchase #{cp.PurchaseNumber}: Cost={cp.PurchaseCost:N0}, Paid={cp.AmountPaid:N0}, Outstanding={cp.OutstandingAmount:N0}");
            }

            Console.WriteLine("\n=================== 4. CUSTOMER LEDGER ===================");
            Console.WriteLine($"Customer: {customerLedger.CustomerName} | Account: {customerLedger.AccountCode}");
            Console.WriteLine($"Opening Balance: {customerLedger.OpeningBalance:N0}");
            foreach (var line in customerLedger.Transactions)
            {
                Console.WriteLine($"  [{line.EntryDate:yyyy-MM-dd}] JV #{line.EntryNumber}: Debit={line.Debit:N0}, Credit={line.Credit:N0}, RunningBalance={line.RunningBalance:N0} ({line.Description})");
            }
            Console.WriteLine($"Closing Balance: {customerLedger.ClosingBalance:N0}");

            // ASSERTIONS
            trialBalance.Totals.IsBalanced.Should().BeTrue();
            trialBalance.Totals.Difference.Should().Be(0);

            // Customer ledger closing balance:
            // Debit 10,000,000 (Initial debt) - Credit 30,000,000 (Purchase) + Debit 8,000,000 (Immediate Payment)
            // = -12,000,000 (Credit Balance 12,000,000)
            customerLedger.ClosingBalance.Should().Be(-12000000);
        }
    }
}
