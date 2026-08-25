using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarShowroomManagementV2.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class BackfillHistoricalCostBasisAndEnforceUniqueBuybackIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Backfill SalesContracts.CostBasis for historical contracts using immutable sources:
            // Priority 1: Credit amount on Inventory Account (1201) in posted COGS JournalLines
            // Priority 2: Vehicle.PurchaseCost if contract.CostBasis is 0
            migrationBuilder.Sql(@"
                UPDATE ""SalesContracts"" sc
                SET ""CostBasis"" = COALESCE(
                    (
                        SELECT jl.""Credit""
                        FROM ""JournalLines"" jl
                        INNER JOIN ""JournalEntries"" je ON jl.""JournalEntryId"" = je.""Id""
                        INNER JOIN ""Accounts"" a ON jl.""AccountId"" = a.""Id""
                        WHERE (je.""Description"" LIKE '%' || sc.""ContractNumber"" || '%' OR jl.""Description"" LIKE '%' || sc.""ContractNumber"" || '%')
                          AND a.""AccountCode"" = '1201'
                          AND jl.""Credit"" > 0
                        LIMIT 1
                    ),
                    (
                        SELECT v.""PurchaseCost""
                        FROM ""Vehicles"" v
                        WHERE v.""Id"" = sc.""VehicleId"" AND v.""PurchaseCost"" > 0
                    ),
                    GREATEST(0, sc.""SalePrice"" - sc.""Profit"")
                )
                WHERE sc.""CostBasis"" = 0;
            ");

            // 2. Backfill PreviousSaleContractId for historical Customer purchases (SourceType = 2)
            migrationBuilder.Sql(@"
                UPDATE ""Purchases"" p
                SET ""PreviousSaleContractId"" = (
                    SELECT sc.""Id""
                    FROM ""SalesContracts"" sc
                    WHERE sc.""VehicleId"" = p.""VehicleId""
                      AND sc.""CustomerId"" = p.""CustomerId""
                      AND sc.""SaleDate"" <= p.""PurchaseDate""
                      AND sc.""Status"" <> 'Cancelled'
                    ORDER BY sc.""SaleDate"" DESC
                    LIMIT 1
                )
                WHERE p.""SourceType"" = 2 AND p.""PreviousSaleContractId"" IS NULL;
            ");

            // 3. Drop non-unique index and enforce database-level unique index on active PreviousSaleContractId
            migrationBuilder.DropIndex(
                name: "IX_Purchases_PreviousSaleContractId",
                table: "Purchases");

            migrationBuilder.CreateIndex(
                name: "IX_Purchases_PreviousSaleContractId",
                table: "Purchases",
                column: "PreviousSaleContractId",
                unique: true,
                filter: "\"PreviousSaleContractId\" IS NOT NULL AND \"Status\" <> 'Cancelled'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Purchases_PreviousSaleContractId",
                table: "Purchases");

            migrationBuilder.CreateIndex(
                name: "IX_Purchases_PreviousSaleContractId",
                table: "Purchases",
                column: "PreviousSaleContractId");
        }
    }
}
