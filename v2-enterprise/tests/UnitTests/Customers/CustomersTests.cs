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
using CarShowroomManagementV2.Application.Customers.Queries;
using CarShowroomManagementV2.Infrastructure.Persistence;
using CarShowroomManagementV2.Infrastructure.Persistence.Interceptors;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.UnitTests.Customers
{
    public class CustomersTests : IDisposable
    {
        private readonly Mock<ICurrentUserService> _currentUserServiceMock;
        private readonly AuditableEntitySaveChangesInterceptor _interceptor;
        private readonly Guid _testBranchId = Guid.NewGuid();
        private readonly Microsoft.Data.Sqlite.SqliteConnection _connection;

        public CustomersTests()
        {
            _currentUserServiceMock = new Mock<ICurrentUserService>();
            _currentUserServiceMock.Setup(x => x.UserId).Returns("test-user-01");
            _currentUserServiceMock.Setup(x => x.BranchId).Returns(_testBranchId);

            _interceptor = new AuditableEntitySaveChangesInterceptor(_currentUserServiceMock.Object);

            // إعداد وفتح اتصال SQLite في الذاكرة
            _connection = new Microsoft.Data.Sqlite.SqliteConnection("DataSource=:memory:");
            _connection.Open();
        }

        private ApplicationDbContext GetSqliteDbContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .Options;

            var context = new ApplicationDbContext(options, _currentUserServiceMock.Object, _interceptor);
            context.Database.EnsureCreated(); // إنشاء الجداول برمجياً بناءً على الكيانات
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

        private async Task<Account> SeedAccountAsync(ApplicationDbContext context, Guid accountId, string code, string name, AccountType type, Guid branchId, Guid? parentId = null)
        {
            var account = new Account
            {
                Id = accountId,
                AccountCode = code,
                Name = name,
                Type = type,
                BranchId = branchId,
                ParentAccountId = parentId,
                IsActive = true
            };
            context.Accounts.Add(account);
            await context.SaveChangesAsync();
            return account;
        }

        private async Task<Customer> SeedCustomerWithAccountAsync(ApplicationDbContext context, Guid customerId, string name, string idNumber, Guid branchId)
        {
            // التأكد من وجود الفرع
            var branchExists = await context.Branches.IgnoreQueryFilters().AnyAsync(b => b.Id == branchId);
            if (!branchExists)
            {
                await SeedBranchAsync(context, branchId, $"فرع {name}", $"BR-{Guid.NewGuid().ToString("N").Substring(0, 4).ToUpper()}");
            }

            // التأكد من وجود الحساب الأب (ذمم المدينين - 1301)
            var parentAccount = await context.Accounts.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.AccountCode == "1301");
            if (parentAccount == null)
            {
                parentAccount = await SeedAccountAsync(context, Guid.NewGuid(), "1301", "Accounts Receivable", AccountType.Asset, branchId);
            }

            // توليد كود حساب فرعي فريد
            var randomSuffix = Guid.NewGuid().ToString("N").Substring(0, 4);
            var accountCode = $"1301{randomSuffix}";

            var customerAccount = await SeedAccountAsync(context, Guid.NewGuid(), accountCode, $"حساب العميل - {name}", AccountType.Asset, branchId, parentAccount.Id);

            var customer = new Customer
            {
                Id = customerId,
                Name = name,
                Phone = "07700000000",
                IdNumber = idNumber,
                AccountId = customerAccount.Id,
                BranchId = branchId
            };
            context.Customers.Add(customer);
            await context.SaveChangesAsync();
            return customer;
        }

        // ── اختبارات الوحدة (Unit Tests) ──────────────────────────────────────────────────────

        // اختبار: إنشاء حساب مالي تلقائي للعميل تحت حساب ذمم المدينين (1301)
        [Fact]
        public async Task CreateCustomer_ShouldGenerateFinancialAccountAutomatically()
        {
            // Arrange
            var context = GetSqliteDbContext();
            
            // تهيئة الفرع والحساب الأب
            await SeedBranchAsync(context, _testBranchId, "الفرع الرئيسي", "HQ-01");
            var parentAccount = await SeedAccountAsync(context, Guid.NewGuid(), "1301", "Accounts Receivable", AccountType.Asset, _testBranchId);

            var handler = new CreateCustomerCommandHandler(context, _currentUserServiceMock.Object);

            var command = new CreateCustomerCommand
            {
                Name = "مصطفى الجبوري",
                Phone = "07700000000",
                IdNumber = "NID-9991212",
                CustomerType = "Individual"
            };

            // Act
            var customerId = await handler.Handle(command, CancellationToken.None);

            // Assert
            customerId.Should().NotBeEmpty();

            var customer = await context.Customers.Include(c => c.Account).FirstOrDefaultAsync(c => c.Id == customerId);
            customer.Should().NotBeNull();
            customer!.Name.Should().Be("مصطفى الجبوري");
            customer.AccountId.Should().NotBeEmpty();
            
            // التحقق من إنشاء الحساب الفرعي وتوليد الكود
            customer.Account.Should().NotBeNull();
            customer.Account!.AccountCode.Should().Be("13010001");
            customer.Account.ParentAccountId.Should().Be(parentAccount.Id);
            customer.Account.BranchId.Should().Be(_testBranchId);
        }

        // اختبار: منع تكرار رقم الهوية داخل نفس الفرع
        [Fact]
        public async Task CreateCustomer_WithDuplicateIdNumberInSameBranch_ShouldThrowException()
        {
            // Arrange
            var context = GetSqliteDbContext();
            
            // تهيئة العميل الأول وحسابه وفرعه بطريقة صحيحة عبر البذور (Seeding Helpers)
            await SeedCustomerWithAccountAsync(context, Guid.NewGuid(), "العميل الأول", "NID-DUPLICATE", _testBranchId);

            var handler = new CreateCustomerCommandHandler(context, _currentUserServiceMock.Object);
            var command = new CreateCustomerCommand
            {
                Name = "العميل الثاني",
                Phone = "077002",
                IdNumber = "NID-DUPLICATE",
                CustomerType = "Individual"
            };

            // Act & Assert
            Func<Task> act = async () => await handler.Handle(command, CancellationToken.None);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*مسجل بالفعل لعميل آخر في هذا الفرع*");
        }

        // اختبار: منع تغيير AccountId بعد إنشاء العميل (التحقق من إخفاقه بالـ Business Rule وليس الـ FK)
        [Fact]
        public async Task UpdateCustomer_AttemptingToChangeAccountId_ShouldThrowException()
        {
            // Arrange
            var context = GetSqliteDbContext();
            
            // 1. تهيئة العميل الأول وحسابه وفرعه بطريقة صحيحة
            var customer = await SeedCustomerWithAccountAsync(context, Guid.NewGuid(), "عميل تجريبي", "NID-1234", _testBranchId);

            // 2. تهيئة حساب مالي آخر موجود وصالح (لضمان عدم حدوث خطأ FK عند محاولة التعيين)
            var anotherAccount = await SeedAccountAsync(context, Guid.NewGuid(), "13019999", "حساب عميل بديل", AccountType.Asset, _testBranchId);

            // Act & Assert
            customer.AccountId = anotherAccount.Id; // محاولة استبدال الحساب بحساب آخر موجود فعلياً
            
            Func<Task> act = async () => await context.SaveChangesAsync();
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*لا يمكن تغيير الحساب المالي المرتبط بالعميل بعد إنشائه*");
        }

        // اختبار: منع الوصول لبيانات فرع آخر (عزل الفروع بـ Global Query Filter)
        [Fact]
        public async Task QueryCustomers_ShouldFilterByBranchAutomatically()
        {
            // Arrange
            var context = GetSqliteDbContext();
            
            var otherBranchId = Guid.NewGuid();
            
            // تهيئة عميل للفرع الحالي وعميل لفرع آخر مع توليد حساباتهم بشكل صحيح
            var customerThisBranch = await SeedCustomerWithAccountAsync(context, Guid.NewGuid(), "عميل فرعي", "1", _testBranchId);
            var customerOtherBranch = await SeedCustomerWithAccountAsync(context, Guid.NewGuid(), "عميل فرع آخر", "2", otherBranchId);

            // Act
            var customers = await context.Customers.ToListAsync();

            // Assert
            customers.Should().ContainSingle();
            customers.First().Id.Should().Be(customerThisBranch.Id);
            customers.Any(c => c.Id == customerOtherBranch.Id).Should().BeFalse();
        }
    }
}
