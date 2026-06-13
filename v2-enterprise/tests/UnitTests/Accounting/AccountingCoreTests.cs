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
using CarShowroomManagementV2.Application.Accounting.Commands;
using CarShowroomManagementV2.Infrastructure.Persistence;
using CarShowroomManagementV2.Infrastructure.Persistence.Interceptors;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;
using FluentValidation;

namespace CarShowroomManagementV2.UnitTests.Accounting
{
    public class AccountingCoreTests
    {
        private readonly Mock<ICurrentUserService> _currentUserServiceMock;
        private readonly AuditableEntitySaveChangesInterceptor _interceptor;
        private readonly Guid _testBranchId = Guid.NewGuid();

        public AccountingCoreTests()
        {
            _currentUserServiceMock = new Mock<ICurrentUserService>();
            _currentUserServiceMock.Setup(x => x.UserId).Returns("test-user-01");
            _currentUserServiceMock.Setup(x => x.BranchId).Returns(_testBranchId);

            _interceptor = new AuditableEntitySaveChangesInterceptor(_currentUserServiceMock.Object);
        }

        // إعداد سياق قاعدة بيانات InMemory نظيف لكل اختبار
        private ApplicationDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new ApplicationDbContext(options, _currentUserServiceMock.Object, _interceptor);
        }

        [Fact]
        public async Task CreateJournalEntry_WhenBalanced_ShouldSucceed()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            
            // تهيئة الحسابات المبدئية
            var accDebit = new Account { Id = Guid.NewGuid(), AccountCode = "1101", Name = "Cash", Type = AccountType.Asset, BranchId = _testBranchId };
            var accCredit = new Account { Id = Guid.NewGuid(), AccountCode = "3101", Name = "Capital", Type = AccountType.Equity, BranchId = _testBranchId };
            context.Accounts.AddRange(accDebit, accCredit);
            await context.SaveChangesAsync();

            var handler = new CreateJournalEntryCommandHandler(context, _currentUserServiceMock.Object);

            var command = new CreateJournalEntryCommand
            {
                Description = "قيد رأس المال المبدئي متوازن",
                Lines = new List<JournalLineDto>
                {
                    new JournalLineDto { AccountId = accDebit.Id, Debit = 10000, Credit = 0, Description = "مدين" },
                    new JournalLineDto { AccountId = accCredit.Id, Debit = 0, Credit = 10000, Description = "دائن" }
                }
            };

            // Act
            var entryId = await handler.Handle(command, CancellationToken.None);

            // Assert
            entryId.Should().NotBeEmpty();
            var entry = await context.JournalEntries.Include(j => j.Lines).FirstOrDefaultAsync(j => j.Id == entryId);
            entry.Should().NotBeNull();
            entry!.IsBalanced.Should().BeTrue();
            entry.TotalDebit.Should().Be(10000);
            entry.TotalCredit.Should().Be(10000);
        }

        [Fact]
        public void ValidateJournalEntry_WhenUnbalanced_ShouldThrowValidationError()
        {
            // Arrange
            var validator = new CreateJournalEntryCommandValidator();
            var command = new CreateJournalEntryCommand
            {
                Description = "قيد غير متوازن عمداً",
                Lines = new List<JournalLineDto>
                {
                    new JournalLineDto { AccountId = Guid.NewGuid(), Debit = 10000, Credit = 0, Description = "مدين" },
                    new JournalLineDto { AccountId = Guid.NewGuid(), Debit = 0, Credit = 9000, Description = "دائن ناقص" }
                }
            };

            // Act
            var result = validator.Validate(command);

            // Assert
            result.IsValid.Should().BeFalse();
            result.Errors.Any(e => e.ErrorMessage.Contains("القيد غير متوازن مالياً")).Should().BeTrue();
        }

        [Fact]
        public async Task EnforceFinancialRules_WhenModifyingSavedJournal_ShouldThrowInvalidOperationException()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var journalEntry = new JournalEntry
            {
                EntryNumber = "JV-TEST-001",
                Description = "قيد محفوظ",
                BranchId = _testBranchId,
                Lines = new List<JournalLine>
                {
                    new JournalLine { AccountId = Guid.NewGuid(), Debit = 500, Credit = 0 },
                    new JournalLine { AccountId = Guid.NewGuid(), Debit = 0, Credit = 500 }
                }
            };

            context.JournalEntries.Add(journalEntry);
            await context.SaveChangesAsync();

            // Act & Assert
            // محاولة تعديل الوصف للقيد المحفوظ
            journalEntry.Description = "محاولة تعديل الوصف للقيد المحفوظ";
            
            Func<Task> actUpdate = async () => await context.SaveChangesAsync();
            await actUpdate.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*يُمنع تماماً تعديل أو حذف قيود اليومية التاريخية*");

            // محاولة حذف القيد المحفوظ
            context.JournalEntries.Remove(journalEntry);
            
            Func<Task> actDelete = async () => await context.SaveChangesAsync();
            await actDelete.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*يُمنع تماماً تعديل أو حذف قيود اليومية التاريخية*");
        }
    }
}
