using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarShowroomManagementV2.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPreviousSaleContractIdAndCostBasis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CostBasis",
                table: "SalesContracts",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "PreviousSaleContractId",
                table: "Purchases",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Purchases_PreviousSaleContractId",
                table: "Purchases",
                column: "PreviousSaleContractId");

            migrationBuilder.AddForeignKey(
                name: "FK_Purchases_SalesContracts_PreviousSaleContractId",
                table: "Purchases",
                column: "PreviousSaleContractId",
                principalTable: "SalesContracts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Purchases_SalesContracts_PreviousSaleContractId",
                table: "Purchases");

            migrationBuilder.DropIndex(
                name: "IX_Purchases_PreviousSaleContractId",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "PreviousSaleContractId",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "CostBasis",
                table: "SalesContracts");
        }
    }
}
