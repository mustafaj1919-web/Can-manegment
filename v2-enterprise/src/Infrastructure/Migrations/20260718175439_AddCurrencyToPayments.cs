using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarShowroomManagementV2.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCurrencyToPayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Payments",
                type: "text",
                nullable: false,
                defaultValue: "IQD");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Payments");
        }
    }
}
