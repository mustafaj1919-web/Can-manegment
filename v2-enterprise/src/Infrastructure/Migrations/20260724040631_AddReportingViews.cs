using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarShowroomManagementV2.Infrastructure.Migrations
{
    /// <summary>
    /// Moves the three read-only reporting views (vw_OverdueInstallments, vw_VehicleSummary,
    /// vw_CustomerSummary) out of the ad-hoc CREATE VIEW block in Program.cs and into a
    /// proper, version-controlled migration.
    ///
    /// vw_VehicleSummary previously referenced "v"."TotalCost" as if it were a physical
    /// column. It never was one — Vehicle.TotalCost is a computed C# property
    /// (PurchaseCost + CustomDuties + MaintenanceCost, see Domain/Entities/Vehicle.cs) with
    /// no backing column in any prior migration, so every CREATE OR REPLACE VIEW attempt at
    /// startup failed with "column v.TotalCost does not exist". Because Program.cs issued
    /// all three CREATE VIEW statements as one batch, that single failure rolled back all
    /// three — none of these views has ever actually existed in the database.
    ///
    /// This migration fixes vw_VehicleSummary by inlining the same expression the computed
    /// property uses, and leaves the other two views' definitions unchanged (just relocated).
    /// </summary>
    /// <inheritdoc />
    public partial class AddReportingViews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE OR REPLACE VIEW ""vw_OverdueInstallments"" AS
                SELECT
                    i.""Id"",
                    i.""DueDate"",
                    i.""Amount"",
                    i.""Status"",
                    i.""BranchId"",
                    ip.""SalesContractId"",
                    ip.""PurchaseId"",
                    c.""Name""          AS ""CustomerName"",
                    c.""Phone""         AS ""CustomerPhone"",
                    c.""IsBlacklisted"" AS ""CustomerIsBlacklisted"",
                    c.""CreditRating""  AS ""CustomerCreditRating""
                FROM ""Installments"" i
                JOIN ""InstallmentPlans"" ip ON ip.""Id"" = i.""InstallmentPlanId""
                LEFT JOIN ""SalesContracts"" sc ON sc.""Id"" = ip.""SalesContractId""
                LEFT JOIN ""Customers"" c  ON c.""Id"" = sc.""CustomerId""
                WHERE i.""Status"" != 'Paid'
                  AND i.""DueDate"" < NOW();
            ");

            migrationBuilder.Sql(@"
                CREATE OR REPLACE VIEW ""vw_VehicleSummary"" AS
                SELECT
                    v.""Id"",
                    v.""Brand"",
                    v.""Model"",
                    v.""Year"",
                    v.""PlateNumber"",
                    v.""Status"",
                    v.""Color"",
                    (v.""PurchaseCost"" + v.""CustomDuties"" + v.""MaintenanceCost"") AS ""TotalCost"",
                    v.""BookValue"",
                    v.""TargetSellingPrice"",
                    v.""BranchId"",
                    v.""IsDeleted"",
                    (v.""TargetSellingPrice"" - (v.""PurchaseCost"" + v.""CustomDuties"" + v.""MaintenanceCost"")) AS ""ExpectedProfit""
                FROM ""Vehicles"" v;
            ");

            migrationBuilder.Sql(@"
                CREATE OR REPLACE VIEW ""vw_CustomerSummary"" AS
                SELECT
                    c.""Id"",
                    c.""Name"",
                    c.""Phone"",
                    c.""CustomerType"",
                    c.""CreditRating"",
                    c.""IsBlacklisted"",
                    c.""BranchId"",
                    c.""IsDeleted"",
                    COUNT(DISTINCT sc.""Id"")   AS ""ContractsCount"",
                    COALESCE(SUM(sc.""NetPrice""), 0) AS ""TotalContractsValue""
                FROM ""Customers"" c
                LEFT JOIN ""SalesContracts"" sc ON sc.""CustomerId"" = c.""Id""
                GROUP BY c.""Id"", c.""Name"", c.""Phone"", c.""CustomerType"",
                         c.""CreditRating"", c.""IsBlacklisted"", c.""BranchId"", c.""IsDeleted"";
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Views hold no data of their own — dropping them is non-destructive to the
            // underlying tables.
            migrationBuilder.Sql(@"DROP VIEW IF EXISTS ""vw_CustomerSummary"";");
            migrationBuilder.Sql(@"DROP VIEW IF EXISTS ""vw_VehicleSummary"";");
            migrationBuilder.Sql(@"DROP VIEW IF EXISTS ""vw_OverdueInstallments"";");
        }
    }
}
