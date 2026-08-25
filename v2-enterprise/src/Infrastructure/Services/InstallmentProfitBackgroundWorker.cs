using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Infrastructure.Services
{
    public class InstallmentProfitBackgroundWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<InstallmentProfitBackgroundWorker> _logger;

        public InstallmentProfitBackgroundWorker(
            IServiceProvider serviceProvider,
            ILogger<InstallmentProfitBackgroundWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Installment Profit Recognition Background Worker started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RecognizeInstallmentProfitsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during installment profit recognition execution.");
                }

                // Run every 24 hours
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
        }

        private async Task RecognizeInstallmentProfitsAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

            var now = DateTime.UtcNow;

            // Query all un-recognized installments that are past due or due today, belonging to a sales plan
            var installments = await context.Installments
                .IgnoreQueryFilters()
                .Include(i => i.InstallmentPlan)
                    .ThenInclude(p => p!.SalesContract)
                        .ThenInclude(sc => sc!.Customer)
                .Where(i => !i.IsProfitRecognized 
                            && i.DueDate <= now 
                            && i.Status != "Cancelled" 
                            && i.InstallmentPlan != null 
                            && i.InstallmentPlan.SalesContractId != null)
                .ToListAsync(cancellationToken);

            if (!installments.Any())
            {
                return;
            }

            _logger.LogInformation("Found {Count} installments due for profit recognition.", installments.Count);

            foreach (var installment in installments)
            {
                var plan = installment.InstallmentPlan!;
                var contract = plan.SalesContract!;
                var customer = contract.Customer;
                var branchId = installment.BranchId;

                if (plan.TotalPlanAmount <= 0 || plan.TotalProfit <= 0)
                {
                    continue;
                }

                // Calculate profit portion for this installment
                decimal recognizedProfit = Math.Round(installment.Amount * (plan.TotalProfit / plan.TotalPlanAmount), 4);
                if (recognizedProfit <= 0)
                {
                    continue;
                }

                // Fetch Deferred Profit (2301) and Recognized Profit (4102) accounts for this branch
                var deferredProfitAccount = await context.Accounts
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(a => a.AccountCode == "2301" && a.BranchId == branchId, cancellationToken);

                var recognizedProfitAccount = await context.Accounts
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(a => a.AccountCode == "4102" && a.BranchId == branchId, cancellationToken);

                if (deferredProfitAccount == null || recognizedProfitAccount == null)
                {
                    _logger.LogWarning("Skipping installment {Id}: Deferred (2301) or Recognized (4102) profit accounts not found in branch {BranchId}.", installment.Id, branchId);
                    continue;
                }

                var dbContext = context as DbContext;
                if (dbContext == null) continue;

                using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    var totalEntriesCount = await context.JournalEntries.IgnoreQueryFilters().CountAsync(cancellationToken);
                    var entryNumber = $"JV-AUTO-{DateTime.UtcNow:yyyyMMdd}-{totalEntriesCount + 1:D5}";

                    var journalEntry = new JournalEntry
                    {
                        Id = Guid.NewGuid(),
                        EntryNumber = entryNumber,
                        EntryDate = DateTime.UtcNow,
                        Description = $"الاعتراف التلقائي بأرباح القسط رقم {installment.InstallmentNumber} عقد {contract.ContractNumber} (مبدأ الاستحقاق)",
                        IsPosted = true,
                        BranchId = branchId,
                        ReferenceType = "Installment",
                        ReferenceId = installment.Id
                    };

                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = journalEntry.Id,
                        AccountId = deferredProfitAccount.Id,
                        Debit = recognizedProfit,
                        Credit = 0,
                        Description = $"تخفيض أرباح التقسيط المؤجلة المستحقة للقسط {installment.InstallmentNumber}",
                        VehicleId = contract.VehicleId
                    });

                    journalEntry.Lines.Add(new JournalLine
                    {
                        Id = Guid.NewGuid(),
                        JournalEntryId = journalEntry.Id,
                        AccountId = recognizedProfitAccount.Id,
                        Debit = 0,
                        Credit = recognizedProfit,
                        Description = $"الاعتراف التلقائي بأرباح قسط مستحق للعميل {customer?.FullName ?? customer?.Name}",
                        VehicleId = contract.VehicleId
                    });

                    if (!journalEntry.IsBalanced)
                    {
                        throw new InvalidOperationException("Auto-generated installment profit recognition entry is unbalanced.");
                    }

                    context.JournalEntries.Add(journalEntry);
                    installment.IsProfitRecognized = true;
                    context.Installments.Update(installment);

                    await context.SaveChangesAsync(cancellationToken);
                    await transaction.CommitAsync(cancellationToken);

                    _logger.LogInformation("Successfully recognized profit {Amount} for installment {Id}.", recognizedProfit, installment.Id);
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    _logger.LogError(ex, "Failed to recognize profit for installment {Id}.", installment.Id);
                }
            }
        }
    }
}
