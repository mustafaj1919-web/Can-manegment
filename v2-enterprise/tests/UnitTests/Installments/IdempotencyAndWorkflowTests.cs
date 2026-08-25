using System;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Installments.Commands;
using CarShowroomManagementV2.Application.Payments.Commands;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;
using CarShowroomManagementV2.Infrastructure.Persistence;

namespace CarShowroomManagementV2.UnitTests.Installments
{
    public class IdempotencyAndWorkflowTests
    {
        private class TestCurrentUserService : ICurrentUserService
        {
            public string? UserId => "test-user-1";
            public Guid BranchId => Guid.Parse("11111111-1111-1111-1111-111111111111");
            public string? Roles => "Admin";
            public bool CanSeeAllBranches => true;
        }

        private ApplicationDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            var currentUserService = new TestCurrentUserService();
            var interceptor = new CarShowroomManagementV2.Infrastructure.Persistence.Interceptors.AuditableEntitySaveChangesInterceptor(currentUserService);
            return new ApplicationDbContext(options, currentUserService, interceptor);
        }

        [Fact]
        public void CanonicalRequestHash_ShouldBeInvariantForDecimalFormats()
        {
            // Arrange
            var scheduleId = Guid.NewGuid();
            var accountId = Guid.NewGuid();
            var branchId = Guid.NewGuid();

            decimal amount1 = 1000m;
            decimal amount2 = 1000.0m;
            decimal amount3 = 1000.000m;

            // Act
            string hash1 = ComputeHash(scheduleId, amount1, PaymentMethod.Cash, accountId, branchId);
            string hash2 = ComputeHash(scheduleId, amount2, PaymentMethod.Cash, accountId, branchId);
            string hash3 = ComputeHash(scheduleId, amount3, PaymentMethod.Cash, accountId, branchId);

            // Assert
            hash1.Should().Be(hash2);
            hash2.Should().Be(hash3);
        }

        [Fact]
        public async Task DuplicateIdempotencyKey_SamePayload_ShouldReturnExistingPaymentResult()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var currentUserService = new TestCurrentUserService();
            var branchId = currentUserService.BranchId;
            var idempotencyKey = "idemp-key-test-100";

            var existingPayment = new Payment
            {
                Id = Guid.NewGuid(),
                ReferenceNumber = "REC-20260723-00001",
                Amount = 500000,
                Status = "Posted",
                Currency = "IQD",
                BranchId = branchId
            };
            context.Payments.Add(existingPayment);

            var existingIdempotency = new IdempotencyRecord
            {
                Id = Guid.NewGuid(),
                BranchId = branchId,
                OperationType = "InstallmentPayment",
                IdempotencyKey = idempotencyKey,
                RequestHash = ComputeHash(Guid.Empty, 500000m, PaymentMethod.Cash, null, branchId),
                Status = "Completed",
                PaymentId = existingPayment.Id,
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            };
            context.IdempotencyRecords.Add(existingIdempotency);
            await context.SaveChangesAsync();

            var handler = new PayInstallmentCommandHandler(context, currentUserService);
            var command = new PayInstallmentCommand
            {
                InstallmentId = Guid.Empty,
                Amount = 500000m,
                PaymentMethod = PaymentMethod.Cash,
                IdempotencyKey = idempotencyKey
            };

            // Act
            var result = await handler.Handle(command, CancellationToken.None);

            // Assert
            result.Should().NotBeNull();
            result.PaymentId.Should().Be(existingPayment.Id);
            result.ReceiptNumber.Should().Be("REC-20260723-00001");
        }

        [Fact]
        public async Task DuplicateIdempotencyKey_DifferentPayload_ShouldThrowPayloadConflict()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var currentUserService = new TestCurrentUserService();
            var branchId = currentUserService.BranchId;
            var idempotencyKey = "idemp-key-test-200";

            var existingIdempotency = new IdempotencyRecord
            {
                Id = Guid.NewGuid(),
                BranchId = branchId,
                OperationType = "InstallmentPayment",
                IdempotencyKey = idempotencyKey,
                RequestHash = ComputeHash(Guid.Empty, 500000m, PaymentMethod.Cash, null, branchId),
                Status = "Completed",
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            };
            context.IdempotencyRecords.Add(existingIdempotency);
            await context.SaveChangesAsync();

            var handler = new PayInstallmentCommandHandler(context, currentUserService);
            var commandWithDifferentAmount = new PayInstallmentCommand
            {
                InstallmentId = Guid.Empty,
                Amount = 750000m, // Different amount!
                PaymentMethod = PaymentMethod.Cash,
                IdempotencyKey = idempotencyKey
            };

            // Act
            Func<Task> act = async () => await handler.Handle(commandWithDifferentAmount, CancellationToken.None);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*IDEMPOTENCY_PAYLOAD_CONFLICT*");
        }

        [Fact]
        public async Task ArchiveReceiptCommand_ShouldPersistArchiveRecord()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var currentUserService = new TestCurrentUserService();
            var branchId = currentUserService.BranchId;

            var payment = new Payment
            {
                Id = Guid.NewGuid(),
                ReferenceNumber = "REC-20260723-00005",
                Amount = 250000,
                BranchId = branchId
            };
            context.Payments.Add(payment);
            await context.SaveChangesAsync();

            var handler = new ArchiveReceiptCommandHandler(context, currentUserService);
            var command = new ArchiveReceiptCommand
            {
                PaymentId = payment.Id,
                ArchiveMethod = "ManuallyConfirmed",
                Notes = "تمت الأرشفة اليدوية"
            };

            // Act
            var result = await handler.Handle(command, CancellationToken.None);

            // Assert
            result.Should().NotBeNull();
            result.PaymentId.Should().Be(payment.Id);
            result.ArchiveStatus.Should().Be("ManuallyConfirmed");

            var dbRecord = await context.ReceiptArchiveRecords.FirstOrDefaultAsync(r => r.PaymentId == payment.Id);
            dbRecord.Should().NotBeNull();
            dbRecord!.ArchiveMethod.Should().Be("ManuallyConfirmed");
        }

        private static string ComputeHash(Guid scheduleId, decimal amount, PaymentMethod method, Guid? accountId, Guid branchId)
        {
            var canonicalAmount = amount.ToString("F4", CultureInfo.InvariantCulture);
            var accountIdStr = accountId.HasValue ? accountId.Value.ToString() : "";
            var rawHashInput = $"ScheduleId={scheduleId}|Amount={canonicalAmount}|Method={method}|AccountId={accountIdStr}|BranchId={branchId}";

            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(rawHashInput));
            return Convert.ToHexString(bytes);
        }
    }
}
