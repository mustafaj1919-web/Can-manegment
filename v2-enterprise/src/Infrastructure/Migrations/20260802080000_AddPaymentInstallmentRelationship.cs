using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarShowroomManagementV2.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentInstallmentRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "InstallmentId",
                table: "Payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payments_InstallmentId",
                table: "Payments",
                column: "InstallmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_Installments_InstallmentId",
                table: "Payments",
                column: "InstallmentId",
                principalTable: "Installments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Deterministic historical backfill using IdempotencyRecords ScheduleId
            migrationBuilder.Sql(@"
                UPDATE ""Payments"" p
                SET ""InstallmentId"" = CAST(
                  substring(i.""RequestHash"" FROM 'ScheduleId=([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})')
                  AS uuid
                )
                FROM ""IdempotencyRecords"" i
                WHERE i.""PaymentId"" = p.""Id""
                  AND i.""RequestHash"" LIKE '%ScheduleId=%'
                  AND EXISTS (
                    SELECT 1 FROM ""Installments"" inst 
                    WHERE inst.""Id"" = CAST(
                      substring(i.""RequestHash"" FROM 'ScheduleId=([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})')
                      AS uuid
                    )
                  );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payments_Installments_InstallmentId",
                table: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_Payments_InstallmentId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "InstallmentId",
                table: "Payments");
        }
    }
}
