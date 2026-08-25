using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarShowroomManagementV2.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCurrencyToContractsAndPurchases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "SalesContracts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Purchases",
                type: "text",
                nullable: true);

            // Freeze each existing contract/purchase's currency from its vehicle's current
            // Currency — the only trustworthy signal available (Payment.Currency has never
            // been reliably derived; see AddCurrencyToContractsAndPurchases fix in
            // PayInstallmentCommand.cs for the root cause).
            migrationBuilder.Sql(@"
                UPDATE ""SalesContracts"" sc
                SET ""Currency"" = v.""Currency""
                FROM ""Vehicles"" v
                WHERE v.""Id"" = sc.""VehicleId"";
            ");

            migrationBuilder.Sql(@"
                UPDATE ""Purchases"" p
                SET ""Currency"" = v.""Currency""
                FROM ""Vehicles"" v
                WHERE v.""Id"" = p.""VehicleId"";
            ");

            // System-wide correction: Payment.Currency was never computed from a real source
            // (PayInstallmentCommand.cs was missing a Vehicle .Include, so it silently
            // defaulted every payment's currency instead of reading the true one). Overwrite
            // every payment's currency to match its parent contract/purchase's now-frozen
            // currency, via InstallmentPlans.
            migrationBuilder.Sql(@"
                UPDATE ""Payments"" p
                SET ""Currency"" = sc.""Currency""
                FROM ""Installments"" i
                JOIN ""InstallmentPlans"" ip ON ip.""Id"" = i.""InstallmentPlanId""
                JOIN ""SalesContracts"" sc ON sc.""Id"" = ip.""SalesContractId""
                WHERE i.""Id"" = p.""InstallmentId""
                  AND ip.""SalesContractId"" IS NOT NULL
                  AND sc.""Currency"" IS NOT NULL;
            ");

            migrationBuilder.Sql(@"
                UPDATE ""Payments"" p
                SET ""Currency"" = pu.""Currency""
                FROM ""Installments"" i
                JOIN ""InstallmentPlans"" ip ON ip.""Id"" = i.""InstallmentPlanId""
                JOIN ""Purchases"" pu ON pu.""Id"" = ip.""PurchaseId""
                WHERE i.""Id"" = p.""InstallmentId""
                  AND ip.""PurchaseId"" IS NOT NULL
                  AND pu.""Currency"" IS NOT NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Currency",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Purchases");
        }
    }
}
