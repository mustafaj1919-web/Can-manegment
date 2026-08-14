using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarShowroomManagementV2.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleSaleContractRevisionsAndSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SalesContracts_ContractNumber_BranchId",
                table: "SalesContracts");

            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"BuyerAddressSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"BuyerIdNumberSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"BuyerNameSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"BuyerPhoneSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"BuyerVatNumberSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"CancelledAt\" timestamp without time zone;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"CompanyNameSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"CompanyRegistrationReference\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"CostBasis\" numeric(18,4) NOT NULL DEFAULT 0.0;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"Currency\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"DocumentNotes\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"DocumentNumber\" text NOT NULL DEFAULT '';");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"DocumentRevision\" integer NOT NULL DEFAULT 0;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"DocumentStatus\" integer NOT NULL DEFAULT 1;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"EngineNumberSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"FinalizedAt\" timestamp without time zone;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"FinalizedByUserId\" uuid;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"FirstDueDateSnapshot\" timestamp without time zone;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"ImportCountrySnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"InstallmentCountSnapshot\" integer;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"MonthlyInstallmentAmountSnapshot\" numeric(18,4);");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"OwnerNotes\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"OwnerPersonId\" uuid;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"OwnerPersonIdNumberSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"OwnerPersonNameSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"OwnerPersonPhoneSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"OwnershipType\" integer NOT NULL DEFAULT 0;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"PaidAmountAtIssue\" numeric(18,4) NOT NULL DEFAULT 0.0;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"PlateNumberSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"PreparedByNameSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"PreparedByRoleSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"PreparedByUserId\" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"ReceiptNumber\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"ReissuedFromDocumentId\" uuid;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"RemainingAmountAtIssue\" numeric(18,4) NOT NULL DEFAULT 0.0;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"SalespersonNameSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"SupplierId\" uuid;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"SupplierNameSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"SupplierReference\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"SupplyDate\" timestamp without time zone;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"TermsContentSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"TermsTemplateId\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"TermsTemplateVersion\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"VehicleBrandSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"VehicleColorSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"VehicleModelSnapshot\" text;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"VehicleYearSnapshot\" integer;");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"VerificationCode\" text NOT NULL DEFAULT '';");
            migrationBuilder.Sql("ALTER TABLE \"SalesContracts\" ADD COLUMN IF NOT EXISTS \"VinSnapshot\" text;");

            migrationBuilder.Sql("ALTER TABLE \"Purchases\" ALTER COLUMN \"SupplierId\" DROP NOT NULL;");
            migrationBuilder.Sql("ALTER TABLE \"Purchases\" ADD COLUMN IF NOT EXISTS \"Currency\" text;");
            migrationBuilder.Sql("ALTER TABLE \"Purchases\" ADD COLUMN IF NOT EXISTS \"CustomerId\" uuid;");
            migrationBuilder.Sql("ALTER TABLE \"Purchases\" ADD COLUMN IF NOT EXISTS \"PreviousSaleContractId\" uuid;");
            migrationBuilder.Sql("ALTER TABLE \"Purchases\" ADD COLUMN IF NOT EXISTS \"SourceType\" integer NOT NULL DEFAULT 0;");

            migrationBuilder.Sql("ALTER TABLE \"Payments\" ADD COLUMN IF NOT EXISTS \"InstallmentId\" uuid;");

            migrationBuilder.Sql(@"
                CREATE EXTENSION IF NOT EXISTS pgcrypto;

                UPDATE ""SalesContracts""
                SET 
                    ""PreparedByUserId"" = (SELECT ""Id"" FROM ""Users"" ORDER BY ""CreatedAt"" ASC LIMIT 1)
                WHERE ""PreparedByUserId"" IS NULL OR ""PreparedByUserId"" = '00000000-0000-0000-0000-000000000000';

                UPDATE ""SalesContracts""
                SET 
                    ""DocumentRevision"" = CASE WHEN ""DocumentRevision"" <= 0 THEN 1 ELSE ""DocumentRevision"" END,
                    ""DocumentStatus"" = CASE WHEN ""DocumentStatus"" <= 0 THEN 2 ELSE ""DocumentStatus"" END,
                    ""OwnershipType"" = CASE WHEN ""OwnershipType"" < 0 THEN 0 ELSE ""OwnershipType"" END,
                    ""DocumentNumber"" = CASE WHEN ""DocumentNumber"" IS NULL OR ""DocumentNumber"" = '' THEN 'SALE-' || TO_CHAR(COALESCE(""SaleDate"", ""CreatedAt""), 'YYYY') || '-' || SUBSTRING(REPLACE(""Id""::text, '-', '') FROM 1 FOR 8) || '-R1' ELSE ""DocumentNumber"" END,
                    ""VerificationCode"" = CASE WHEN ""VerificationCode"" IS NULL OR ""VerificationCode"" = '' THEN 'vsc_' || ENCODE(GEN_RANDOM_BYTES(16), 'hex') ELSE ""VerificationCode"" END
                WHERE ""DocumentNumber"" IS NULL OR ""DocumentNumber"" = '' OR ""VerificationCode"" IS NULL OR ""VerificationCode"" = '' OR ""DocumentRevision"" <= 0;

                DO $$
                DECLARE
                    doc_collisions INT;
                    vsc_collisions INT;
                BEGIN
                    SELECT COUNT(*) - COUNT(DISTINCT ""DocumentNumber"") INTO doc_collisions FROM ""SalesContracts"";
                    IF doc_collisions > 0 THEN
                        RAISE EXCEPTION 'Collision detected in DocumentNumber during backfill!';
                    END IF;

                    SELECT COUNT(*) - COUNT(DISTINCT ""VerificationCode"") INTO vsc_collisions FROM ""SalesContracts"";
                    IF vsc_collisions > 0 THEN
                        RAISE EXCEPTION 'Collision detected in VerificationCode during backfill!';
                    END IF;
                END $$;
            ");

            migrationBuilder.Sql("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CK_SalesContracts_DocumentStatus') THEN ALTER TABLE \"SalesContracts\" ADD CONSTRAINT \"CK_SalesContracts_DocumentStatus\" CHECK (\"DocumentStatus\" IN (1, 2, 3, 4)); END IF; END $$;");
            migrationBuilder.Sql("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CK_SalesContracts_OwnershipType') THEN ALTER TABLE \"SalesContracts\" ADD CONSTRAINT \"CK_SalesContracts_OwnershipType\" CHECK (\"OwnershipType\" IN (0, 1, 2, 3)); END IF; END $$;");

            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_SalesContracts_ContractNumber_DocumentRevision\" ON \"SalesContracts\" (\"ContractNumber\", \"DocumentRevision\");");
            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_SalesContracts_DocumentNumber\" ON \"SalesContracts\" (\"DocumentNumber\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_SalesContracts_DocumentStatus\" ON \"SalesContracts\" (\"DocumentStatus\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_SalesContracts_OwnershipType\" ON \"SalesContracts\" (\"OwnershipType\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_SalesContracts_PreparedByUserId\" ON \"SalesContracts\" (\"PreparedByUserId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_SalesContracts_ReissuedFromDocumentId\" ON \"SalesContracts\" (\"ReissuedFromDocumentId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_SalesContracts_SupplierId\" ON \"SalesContracts\" (\"SupplierId\");");
            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_SalesContracts_VerificationCode\" ON \"SalesContracts\" (\"VerificationCode\");");

            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Purchases_CustomerId\" ON \"Purchases\" (\"CustomerId\");");
            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_Purchases_PreviousSaleContractId\" ON \"Purchases\" (\"PreviousSaleContractId\") WHERE \"PreviousSaleContractId\" IS NOT NULL AND \"Status\" <> 'Cancelled';");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Purchases_SourceType\" ON \"Purchases\" (\"SourceType\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Purchases_SourceType_CustomerId\" ON \"Purchases\" (\"SourceType\", \"CustomerId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Purchases_SourceType_SupplierId\" ON \"Purchases\" (\"SourceType\", \"SupplierId\");");

            migrationBuilder.Sql("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CK_Purchases_SourceIntegrity') THEN ALTER TABLE \"Purchases\" ADD CONSTRAINT \"CK_Purchases_SourceIntegrity\" CHECK ((\"SourceType\" = 1 AND \"SupplierId\" IS NOT NULL AND \"CustomerId\" IS NULL) OR (\"SourceType\" = 2 AND \"CustomerId\" IS NOT NULL AND \"SupplierId\" IS NULL)); END IF; END $$;");

            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Payments_InstallmentId\" ON \"Payments\" (\"InstallmentId\");");

            migrationBuilder.Sql("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_Payments_Installments_InstallmentId') THEN ALTER TABLE \"Payments\" ADD CONSTRAINT \"FK_Payments_Installments_InstallmentId\" FOREIGN KEY (\"InstallmentId\") REFERENCES \"Installments\" (\"Id\") ON DELETE RESTRICT; END IF; END $$;");
            migrationBuilder.Sql("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_Purchases_Customers_CustomerId') THEN ALTER TABLE \"Purchases\" ADD CONSTRAINT \"FK_Purchases_Customers_CustomerId\" FOREIGN KEY (\"CustomerId\") REFERENCES \"Customers\" (\"Id\") ON DELETE RESTRICT; END IF; END $$;");
            migrationBuilder.Sql("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_Purchases_SalesContracts_PreviousSaleContractId') THEN ALTER TABLE \"Purchases\" ADD CONSTRAINT \"FK_Purchases_SalesContracts_PreviousSaleContractId\" FOREIGN KEY (\"PreviousSaleContractId\") REFERENCES \"SalesContracts\" (\"Id\") ON DELETE RESTRICT; END IF; END $$;");
            migrationBuilder.Sql("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_SalesContracts_SalesContracts_ReissuedFromDocumentId') THEN ALTER TABLE \"SalesContracts\" ADD CONSTRAINT \"FK_SalesContracts_SalesContracts_ReissuedFromDocumentId\" FOREIGN KEY (\"ReissuedFromDocumentId\") REFERENCES \"SalesContracts\" (\"Id\") ON DELETE RESTRICT; END IF; END $$;");
            migrationBuilder.Sql("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_SalesContracts_Suppliers_SupplierId') THEN ALTER TABLE \"SalesContracts\" ADD CONSTRAINT \"FK_SalesContracts_Suppliers_SupplierId\" FOREIGN KEY (\"SupplierId\") REFERENCES \"Suppliers\" (\"Id\") ON DELETE RESTRICT; END IF; END $$;");
            migrationBuilder.Sql("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_SalesContracts_Users_PreparedByUserId') THEN ALTER TABLE \"SalesContracts\" ADD CONSTRAINT \"FK_SalesContracts_Users_PreparedByUserId\" FOREIGN KEY (\"PreparedByUserId\") REFERENCES \"Users\" (\"Id\") ON DELETE RESTRICT; END IF; END $$;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payments_Installments_InstallmentId",
                table: "Payments");

            migrationBuilder.DropForeignKey(
                name: "FK_Purchases_Customers_CustomerId",
                table: "Purchases");

            migrationBuilder.DropForeignKey(
                name: "FK_Purchases_SalesContracts_PreviousSaleContractId",
                table: "Purchases");

            migrationBuilder.DropForeignKey(
                name: "FK_SalesContracts_SalesContracts_ReissuedFromDocumentId",
                table: "SalesContracts");

            migrationBuilder.DropForeignKey(
                name: "FK_SalesContracts_Suppliers_SupplierId",
                table: "SalesContracts");

            migrationBuilder.DropForeignKey(
                name: "FK_SalesContracts_Users_PreparedByUserId",
                table: "SalesContracts");

            migrationBuilder.DropIndex(
                name: "IX_SalesContracts_ContractNumber_DocumentRevision",
                table: "SalesContracts");

            migrationBuilder.DropIndex(
                name: "IX_SalesContracts_DocumentNumber",
                table: "SalesContracts");

            migrationBuilder.DropIndex(
                name: "IX_SalesContracts_DocumentStatus",
                table: "SalesContracts");

            migrationBuilder.DropIndex(
                name: "IX_SalesContracts_OwnershipType",
                table: "SalesContracts");

            migrationBuilder.DropIndex(
                name: "IX_SalesContracts_PreparedByUserId",
                table: "SalesContracts");

            migrationBuilder.DropIndex(
                name: "IX_SalesContracts_ReissuedFromDocumentId",
                table: "SalesContracts");

            migrationBuilder.DropIndex(
                name: "IX_SalesContracts_SupplierId",
                table: "SalesContracts");

            migrationBuilder.DropIndex(
                name: "IX_SalesContracts_VerificationCode",
                table: "SalesContracts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_SalesContracts_DocumentStatus",
                table: "SalesContracts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_SalesContracts_OwnershipType",
                table: "SalesContracts");

            migrationBuilder.DropIndex(
                name: "IX_Purchases_CustomerId",
                table: "Purchases");

            migrationBuilder.DropIndex(
                name: "IX_Purchases_PreviousSaleContractId",
                table: "Purchases");

            migrationBuilder.DropIndex(
                name: "IX_Purchases_SourceType",
                table: "Purchases");

            migrationBuilder.DropIndex(
                name: "IX_Purchases_SourceType_CustomerId",
                table: "Purchases");

            migrationBuilder.DropIndex(
                name: "IX_Purchases_SourceType_SupplierId",
                table: "Purchases");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Purchases_SourceIntegrity",
                table: "Purchases");

            migrationBuilder.DropIndex(
                name: "IX_Payments_InstallmentId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "BuyerAddressSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "BuyerIdNumberSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "BuyerNameSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "BuyerPhoneSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "BuyerVatNumberSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "CancelledAt",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "CompanyNameSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "CompanyRegistrationReference",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "CostBasis",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "DocumentNotes",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "DocumentNumber",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "DocumentRevision",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "DocumentStatus",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "EngineNumberSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "FinalizedAt",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "FinalizedByUserId",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "FirstDueDateSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "ImportCountrySnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "InstallmentCountSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "MonthlyInstallmentAmountSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "OwnerNotes",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "OwnerPersonId",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "OwnerPersonIdNumberSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "OwnerPersonNameSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "OwnerPersonPhoneSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "OwnershipType",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "PaidAmountAtIssue",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "PlateNumberSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "PreparedByNameSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "PreparedByRoleSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "PreparedByUserId",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "ReceiptNumber",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "ReissuedFromDocumentId",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "RemainingAmountAtIssue",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "SalespersonNameSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "SupplierId",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "SupplierNameSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "SupplierReference",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "SupplyDate",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "TermsContentSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "TermsTemplateId",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "TermsTemplateVersion",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "VehicleBrandSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "VehicleColorSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "VehicleModelSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "VehicleYearSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "VerificationCode",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "VinSnapshot",
                table: "SalesContracts");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "CustomerId",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "PreviousSaleContractId",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "SourceType",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "InstallmentId",
                table: "Payments");

            migrationBuilder.AlterColumn<Guid>(
                name: "SupplierId",
                table: "Purchases",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SalesContracts_ContractNumber_BranchId",
                table: "SalesContracts",
                columns: new[] { "ContractNumber", "BranchId" },
                unique: true);
        }
    }
}
