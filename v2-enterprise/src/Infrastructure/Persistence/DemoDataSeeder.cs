using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CarShowroomManagementV2.Infrastructure.Persistence
{
    // Internal logger category for DemoDataSeeder
    internal static class DemoLog
    {
        private static readonly ILogger Logger =
            LoggerFactory.Create(b => b.AddConsole()).CreateLogger("DemoDataSeeder");

        internal static void Info(string msg)    => Logger.LogInformation("[DemoSeed] {Msg}", msg);
        internal static void Warning(string msg) => Logger.LogWarning("[DemoSeed] {Msg}", msg);
    }

    /// <summary>
    /// Inserts realistic demo business data for development and demo environments.
    /// All demo records use stable UUIDs (a1..., b2..., c3..., d4..., e5..., f6...)
    /// so that SeedAsync is idempotent and ResetAsync can surgically remove only demo rows.
    ///
    /// NEVER runs automatically in Production.
    /// Runs when ASPNETCORE_ENVIRONMENT=Development OR DEMO_SEED=true.
    /// </summary>
    public static class DemoDataSeeder
    {
        // ── Well-known branch / user ─────────────────────────────────────────
        private const string BranchId   = "11111111-1111-1111-1111-111111111111";
        private const string AdminId    = "15751db5-ff22-4a9d-a895-041da9a19453";
        private const string ExistingCustomerId = "084ef224-da5f-4d06-86a4-aea06e8ef185"; // Mustafa Jamal

        // ── Stable demo record IDs (prefix pattern makes them identifiable) ──
        public const string V1  = "a1000001-0000-0000-0000-000000000001"; // Toyota Camry   (Available)
        internal const string V2  = "a1000002-0000-0000-0000-000000000002"; // Kia Sportage   (Available, installment)
        internal const string V3  = "a1000003-0000-0000-0000-000000000003"; // Hyundai Tucson (Sold)
        internal const string V4  = "a1000004-0000-0000-0000-000000000004"; // Toyota Corolla (Available)
        internal const string V5  = "a1000005-0000-0000-0000-000000000005"; // BMW X5         (Available)

        internal const string C2  = "b2000001-0000-0000-0000-000000000001"; // Ahmed Hassan
        internal const string AC2 = "b2acc001-0000-0000-0000-000000000001"; // AR account for C2
        internal const string ACS = "b2acc002-0000-0000-0000-000000000002"; // AP account for supplier

        internal const string S1  = "c3000001-0000-0000-0000-000000000001"; // Iraq Auto Import Co

        internal const string SC1 = "d4000001-0000-0000-0000-000000000001"; // Cash sale  (V3 → C1)
        internal const string SC2 = "d4000002-0000-0000-0000-000000000002"; // Installment sale (V2 → C2)

        internal const string P1  = "e5000001-0000-0000-0000-000000000001"; // Purchase V3 (cash)
        internal const string P2  = "e5000002-0000-0000-0000-000000000002"; // Purchase V4 (bank)
        internal const string P3  = "e5000003-0000-0000-0000-000000000003"; // Purchase V5 (cash)

        internal const string IP1 = "f6000001-0000-0000-0000-000000000001"; // Installment plan for SC2

        internal const string JE1 = "01000001-0000-0000-0000-000000000001"; // Journal: cash sale
        internal const string JE2 = "01000002-0000-0000-0000-000000000002"; // Journal: down payment

        // ── Stable account codes used by the seeder ──────────────────────────
        // Cash account  : 111001  (ID 22222222-2222-2222-2222-222222222222 — seeded in Program.cs)
        // Bank account  : 112001  (seeded in Program.cs)
        // AR  account   : 1301    (ID 44444444-4444-4444-4444-444444444444 — seeded in Program.cs)
        // Revenue acct  : 4101    (ID 77777777-7777-7777-7777-777777777777)
        // COGS account  : 5101    (ID 88888888-8888-8888-8888-888888888888)

        // ── Environment gate ─────────────────────────────────────────────────

        public static bool ShouldSeed(IConfiguration config)
        {
            var env      = config["ASPNETCORE_ENVIRONMENT"] ?? "";
            var demoSeed = config["DEMO_SEED"] ?? "";

            // Never auto-seed in Production, even if DEMO_SEED is accidentally set
            if (env.Equals("Production", StringComparison.OrdinalIgnoreCase))
                return false;

            return env.Equals("Development", StringComparison.OrdinalIgnoreCase)
                || demoSeed.Equals("true", StringComparison.OrdinalIgnoreCase);
        }

        // ── Public API ───────────────────────────────────────────────────────

        public static async Task SeedAsync(ApplicationDbContext context)
        {
            // Idempotency guard — skip entirely once the first demo vehicle exists.
            // (Previously this also checked ExecuteSqlRawAsync(...) >= 0 for a SELECT,
            // which always returns -1 since SELECT doesn't affect rows — that made the
            // guard permanently false, so the full seed script re-ran on every startup.)
            var alreadySeeded = await context.Vehicles.IgnoreQueryFilters()
                .AnyAsync(v => v.Id == Guid.Parse(V1));

            if (alreadySeeded)
            {
                DemoLog.Info("Demo data already present — skipping.");
                return;
            }

            DemoLog.Info("Seeding demo business data...");
            await RunSeedSqlAsync(context);
            DemoLog.Info("Demo seed complete.");
        }

        public static async Task ResetAsync(ApplicationDbContext context)
        {
            DemoLog.Info("Resetting demo data...");
            await RunResetSqlAsync(context);
            DemoLog.Info("Re-seeding demo data...");
            await RunSeedSqlAsync(context);
            DemoLog.Info("Reset complete.");
        }

        // ── SQL helpers ──────────────────────────────────────────────────────

        private static async Task RunResetSqlAsync(ApplicationDbContext context)
        {
            // Delete in dependency order to respect FK constraints
            await context.Database.ExecuteSqlRawAsync($@"
                -- Installments first (child of InstallmentPlans)
                DELETE FROM ""Installments"" WHERE ""InstallmentPlanId"" = '{IP1}';

                -- InstallmentPlan
                DELETE FROM ""InstallmentPlans"" WHERE ""Id"" = '{IP1}';

                -- Journal lines for our journal entries
                DELETE FROM ""JournalLines"" WHERE ""JournalEntryId"" IN ('{JE1}', '{JE2}');

                -- Journal entries
                DELETE FROM ""JournalEntries"" WHERE ""Id"" IN ('{JE1}', '{JE2}');

                -- Sales contracts
                DELETE FROM ""SalesContracts"" WHERE ""Id"" IN ('{SC1}', '{SC2}');

                -- Purchases
                DELETE FROM ""Purchases"" WHERE ""Id"" IN ('{P1}', '{P2}', '{P3}');

                -- Vehicles
                DELETE FROM ""Vehicles"" WHERE ""Id"" IN ('{V1}', '{V2}', '{V3}', '{V4}', '{V5}');

                -- Supplier
                DELETE FROM ""Suppliers"" WHERE ""Id"" = '{S1}';

                -- Second customer
                DELETE FROM ""Customers"" WHERE ""Id"" = '{C2}';

                -- Accounts created for demo records
                DELETE FROM ""Accounts"" WHERE ""Id"" IN ('{AC2}', '{ACS}');
            ");
        }

        private static async Task RunSeedSqlAsync(ApplicationDbContext context)
        {
            await context.Database.ExecuteSqlRawAsync($@"
DO $$
DECLARE
  branch_id   UUID := '{BranchId}';
  admin_id    TEXT := '{AdminId}';
  existing_c1 UUID := '{ExistingCustomerId}';

  v1  UUID := '{V1}';
  v2  UUID := '{V2}';
  v3  UUID := '{V3}';
  v4  UUID := '{V4}';
  v5  UUID := '{V5}';

  c2   UUID := '{C2}';
  ac2  UUID := '{AC2}';
  acs  UUID := '{ACS}';

  s1   UUID := '{S1}';

  sc1  UUID := '{SC1}';
  sc2  UUID := '{SC2}';

  p1   UUID := '{P1}';
  p2   UUID := '{P2}';
  p3   UUID := '{P3}';

  ip1  UUID := '{IP1}';

  je1  UUID := '{JE1}';
  je2  UUID := '{JE2}';

  -- Seeded account IDs (stable, set in Program.cs SeedDefaultDataAsync)
  acc_cash    UUID := '22222222-2222-2222-2222-222222222222'; -- 111001 cash
  acc_ar      UUID := '44444444-4444-4444-4444-444444444444'; -- 1301  AR
  acc_revenue UUID := '77777777-7777-7777-7777-777777777777'; -- 4101  revenue
  acc_cogs    UUID := '88888888-8888-8888-8888-888888888888'; -- 5101  COGS

  now_ts      TIMESTAMPTZ := NOW();
  month_start TIMESTAMPTZ := date_trunc('month', NOW());
  n           INTEGER;
BEGIN

-- ── Vehicles (5 demo cars) ──────────────────────────────────────────────────
INSERT INTO ""Vehicles""
  (""Id"",""Brand"",""Model"",""Trim"",""ChassisNumber"",""EngineNumber"",""Color"",""Year"",
   ""Condition"",""PlateNumber"",""PlateStatus"",""Mileage"",""EngineSize"",""Cylinders"",
   ""Transmission"",""FuelType"",""ImportCountry"",""SeatCount"",""Currency"",
   ""PurchaseCost"",""CustomDuties"",""MaintenanceCost"",""BookValue"",
   ""TargetSellingPrice"",""IsSold"",""Status"",""CreatedAt"",""CreatedBy"",""BranchId"")
VALUES
  (v1,'Toyota','Camry','LE','DEMO-VIN-CAM-001','2AZ-FE-001','White',2024,
   'New','11-A-12345','Registered',0,'2.5',4,
   'Automatic','Gasoline','Japan',5,'IQD',
   25000000,2000000,500000,27500000,32000000,false,'Available',now_ts,admin_id,branch_id),
  (v2,'Kia','Sportage','EX','DEMO-VIN-KIA-002','G4NA-789','Black',2023,
   'Used','22-B-99876','Registered',18500,'1.6',4,
   'Automatic','Gasoline','Korea',5,'IQD',
   20000000,1500000,300000,21800000,26000000,false,'Available',now_ts-INTERVAL '10 days',admin_id,branch_id),
  (v3,'Hyundai','Tucson','Smart','DEMO-VIN-HYN-003','G4KD-456','Silver',2022,
   'Used','33-C-44567','Registered',32000,'2.0',4,
   'Automatic','Gasoline','Korea',5,'IQD',
   18000000,1200000,800000,20000000,24000000,true,'Sold',now_ts-INTERVAL '5 days',admin_id,branch_id),
  (v4,'Toyota','Corolla','SE','DEMO-VIN-COR-004','1ZR-FE-222','Red',2023,
   'New','44-D-77890','Registered',5000,'1.8',4,
   'Automatic','Gasoline','Japan',5,'IQD',
   15000000,1000000,200000,16200000,20000000,false,'Available',now_ts-INTERVAL '20 days',admin_id,branch_id),
  (v5,'BMW','X5','xDrive40i','DEMO-VIN-BMW-005','N55-001','Black',2023,
   'New','55-E-33210','Registered',8000,'3.0',6,
   'Automatic','Gasoline','Germany',7,'IQD',
   45000000,3500000,600000,49100000,58000000,false,'Available',now_ts-INTERVAL '3 days',admin_id,branch_id)
-- ChassisNumber is globally unique (IX_Vehicles_ChassisNumber) — conflict on that, not
-- Id, so a re-run never fails even if a demo vehicle was previously seeded under a
-- different Id (e.g. by an older version of this seeder).
ON CONFLICT (""ChassisNumber"") DO NOTHING;

-- Resolve each variable to whatever row actually exists for its ChassisNumber (the one
-- just inserted, or a pre-existing one under a different Id) so every later statement
-- that references v1..v5 stays consistent with the real data.
SELECT ""Id"" INTO v1 FROM ""Vehicles"" WHERE ""ChassisNumber""='DEMO-VIN-CAM-001';
SELECT ""Id"" INTO v2 FROM ""Vehicles"" WHERE ""ChassisNumber""='DEMO-VIN-KIA-002';
SELECT ""Id"" INTO v3 FROM ""Vehicles"" WHERE ""ChassisNumber""='DEMO-VIN-HYN-003';
SELECT ""Id"" INTO v4 FROM ""Vehicles"" WHERE ""ChassisNumber""='DEMO-VIN-COR-004';
SELECT ""Id"" INTO v5 FROM ""Vehicles"" WHERE ""ChassisNumber""='DEMO-VIN-BMW-005';

-- Update existing demo vehicles with spec fields (in case they were seeded before specs were added)
UPDATE ""Vehicles"" SET
  ""Brand""='Toyota',""Trim""='LE',""Condition""='New',""PlateNumber""='11-A-12345',
  ""PlateStatus""='Registered',""Mileage""=0,""EngineSize""='2.5',""Cylinders""=4,
  ""Transmission""='Automatic',""FuelType""='Gasoline',""ImportCountry""='Japan',""SeatCount""=5,""Currency""='IQD'
WHERE ""Id""=v1 AND ""Brand"" IS NULL;
UPDATE ""Vehicles"" SET
  ""Brand""='Kia',""Trim""='EX',""Condition""='Used',""PlateNumber""='22-B-99876',
  ""PlateStatus""='Registered',""Mileage""=18500,""EngineSize""='1.6',""Cylinders""=4,
  ""Transmission""='Automatic',""FuelType""='Gasoline',""ImportCountry""='Korea',""SeatCount""=5,""Currency""='IQD'
WHERE ""Id""=v2 AND ""Brand"" IS NULL;
UPDATE ""Vehicles"" SET
  ""Brand""='Hyundai',""Trim""='Smart',""Condition""='Used',""PlateNumber""='33-C-44567',
  ""PlateStatus""='Registered',""Mileage""=32000,""EngineSize""='2.0',""Cylinders""=4,
  ""Transmission""='Automatic',""FuelType""='Gasoline',""ImportCountry""='Korea',""SeatCount""=5,""Currency""='IQD'
WHERE ""Id""=v3 AND ""Brand"" IS NULL;
UPDATE ""Vehicles"" SET
  ""Brand""='Toyota',""Trim""='SE',""Condition""='New',""PlateNumber""='44-D-77890',
  ""PlateStatus""='Registered',""Mileage""=5000,""EngineSize""='1.8',""Cylinders""=4,
  ""Transmission""='Automatic',""FuelType""='Gasoline',""ImportCountry""='Japan',""SeatCount""=5,""Currency""='IQD'
WHERE ""Id""=v4 AND ""Brand"" IS NULL;
UPDATE ""Vehicles"" SET
  ""Brand""='BMW',""Trim""='xDrive40i',""Condition""='New',""PlateNumber""='55-E-33210',
  ""PlateStatus""='Registered',""Mileage""=8000,""EngineSize""='3.0',""Cylinders""=6,
  ""Transmission""='Automatic',""FuelType""='Gasoline',""ImportCountry""='Germany',""SeatCount""=7,""Currency""='IQD'
WHERE ""Id""=v5 AND ""Brand"" IS NULL;

-- ── Accounts for demo entities ───────────────────────────────────────────────
INSERT INTO ""Accounts"" (""Id"",""AccountCode"",""Name"",""Type"",""IsActive"",""BranchId"",""CreatedBy"",""CreatedAt"")
VALUES
  (ac2,'13010002','Customer Account - Ahmed Hassan', 1,true,branch_id,admin_id,now_ts),
  (acs,'21010001','Supplier Account - Iraq Auto Import',4,true,branch_id,admin_id,now_ts)
ON CONFLICT (""Id"") DO NOTHING;

-- ── Second customer ──────────────────────────────────────────────────────────
INSERT INTO ""Customers""
  (""Id"",""Name"",""FullName"",""Phone"",""Address"",""IdType"",""IdNumber"",
   ""IdIssueDate"",""IdExpiryDate"",""Nationality"",""DateOfBirth"",
   ""CustomerType"",""Notes"",""AccountId"",""CreatedAt"",""CreatedBy"",""BranchId"")
VALUES
  (c2,'Ahmed Hassan','Ahmed Hassan','07701234567','Baghdad',NULL,'12345678',
   NULL,NULL,'iraqi',NULL,'Individual',NULL,ac2,
   now_ts-INTERVAL '15 days',admin_id,branch_id)
-- IX_Customers_IdNumber_BranchId is the real natural key here, not Id.
ON CONFLICT (""IdNumber"",""BranchId"") DO NOTHING;

SELECT ""Id"" INTO c2 FROM ""Customers"" WHERE ""IdNumber""='12345678' AND ""BranchId""=branch_id;

-- ── Supplier ─────────────────────────────────────────────────────────────────
INSERT INTO ""Suppliers""
  (""Id"",""Name"",""Code"",""Phone"",""Address"",""Notes"",""IsActive"",""AccountId"",""CreatedAt"",""CreatedBy"",""BranchId"")
VALUES
  (s1,'Iraq Auto Import Co','DEMO-SUP-001','07800000001','Baghdad','Demo supplier',true,acs,now_ts,admin_id,branch_id)
-- IX_Suppliers_Code_BranchId is the real natural key here, not Id.
ON CONFLICT (""Code"",""BranchId"") DO NOTHING;

SELECT ""Id"" INTO s1 FROM ""Suppliers"" WHERE ""Code""='DEMO-SUP-001' AND ""BranchId""=branch_id;

-- ── Purchases (PaymentMethod: Cash=1, Bank=2) ────────────────────────────────
-- Status='Completed' means the purchase transaction is fully settled, so
-- AmountPaid must equal PurchaseCost for every row (see Purchase.AmountPaid /
-- PurchasesController: remaining_amount = PurchaseCost - AmountPaid).
INSERT INTO ""Purchases""
  (""Id"",""PurchaseNumber"",""SupplierId"",""VehicleId"",""PurchaseDate"",
   ""PurchaseCost"",""AmountPaid"",""PaymentMethod"",""Status"",""CreatedAt"",""CreatedBy"",""BranchId"")
VALUES
  (p1,'DEMO-PUR-001',s1,v3,month_start+INTERVAL '5 days', 20000000,20000000,1,'Completed',now_ts-INTERVAL '5 days',admin_id,branch_id),
  (p2,'DEMO-PUR-002',s1,v4,month_start+INTERVAL '3 days', 16200000,16200000,2,'Completed',now_ts-INTERVAL '3 days',admin_id,branch_id),
  (p3,'DEMO-PUR-003',s1,v5,month_start+INTERVAL '1 days', 49100000,49100000,1,'Completed',now_ts-INTERVAL '1 days',admin_id,branch_id)
-- IX_Purchases_PurchaseNumber_BranchId is the real natural key here, not Id. p1/p2/p3
-- aren't referenced by any later statement, so no resolve step is needed after this.
ON CONFLICT (""PurchaseNumber"",""BranchId"") DO NOTHING;

-- ── Sales Contracts ──────────────────────────────────────────────────────────
-- PaymentMethod: Cash=1
INSERT INTO ""SalesContracts""
  (""Id"",""ContractNumber"",""CustomerId"",""VehicleId"",""SaleDate"",""SalePrice"",
   ""TaxAmount"",""RegistrationFees"",""Discount"",""NetPrice"",""DownPayment"",
   ""RemainingBalance"",""Profit"",""PaymentMethod"",""Status"",""CreatedAt"",""CreatedBy"",""BranchId"")
VALUES
  -- Cash sale: Hyundai Tucson (already Sold)
  (sc1,'DEMO-SAL-001',existing_c1,v3,month_start+INTERVAL '8 days',
   23000000,0,200000,0,23200000,23200000,0,3000000,1,'Active',
   now_ts-INTERVAL '5 days',admin_id,branch_id),
  -- Installment sale: Kia Sportage (Active, ongoing)
  (sc2,'DEMO-SAL-002',c2,v2,month_start+INTERVAL '2 days',
   25000000,0,200000,500000,24700000,5000000,19700000,3700000,1,'Active',
   now_ts-INTERVAL '8 days',admin_id,branch_id)
-- IX_SalesContracts_ContractNumber_BranchId is the real natural key here, not Id.
ON CONFLICT (""ContractNumber"",""BranchId"") DO NOTHING;

SELECT ""Id"" INTO sc1 FROM ""SalesContracts"" WHERE ""ContractNumber""='DEMO-SAL-001' AND ""BranchId""=branch_id;
SELECT ""Id"" INTO sc2 FROM ""SalesContracts"" WHERE ""ContractNumber""='DEMO-SAL-002' AND ""BranchId""=branch_id;

-- ── Installment plan for SC2 ─────────────────────────────────────────────────
INSERT INTO ""InstallmentPlans""
  (""Id"",""SalesContractId"",""TotalAmount"",""DownPayment"",""InstallmentPeriodMonths"",
   ""ProfitRatePercentage"",""TotalProfit"",""TotalPlanAmount"",""MonthlyInstallmentAmount"",
   ""Status"",""CreatedAt"",""CreatedBy"",""BranchId"")
VALUES
  (ip1,sc2,19700000,5000000,12,5,985000,20685000,1723750,'Active',
   now_ts-INTERVAL '8 days',admin_id,branch_id)
-- IX_InstallmentPlans_SalesContractId is the real natural key here, not Id — a sales
-- contract can only ever have one plan.
ON CONFLICT (""SalesContractId"") DO NOTHING;

SELECT ""Id"" INTO ip1 FROM ""InstallmentPlans"" WHERE ""SalesContractId""=sc2;

-- ── 12 monthly installments ──────────────────────────────────────────────────
-- No unique constraint exists on (InstallmentPlanId, InstallmentNumber), so this is
-- guarded manually per-row instead of via ON CONFLICT — otherwise a re-run (or a plan
-- resolved to a pre-existing legacy row above) would keep appending duplicate
-- installments to the same plan on every restart.
FOR n IN 1..12 LOOP
  IF NOT EXISTS (
    SELECT 1 FROM ""Installments""
    WHERE ""InstallmentPlanId"" = ip1 AND ""InstallmentNumber"" = n
  ) THEN
    INSERT INTO ""Installments""
      (""Id"",""InstallmentPlanId"",""InstallmentNumber"",""DueDate"",""Amount"",""PaidAmount"",
       ""Status"",""PaymentDate"",""CreatedAt"",""CreatedBy"",""BranchId"")
    VALUES (
      gen_random_uuid(), ip1, n,
      month_start + (n * INTERVAL '1 month'),
      1723750,
      CASE WHEN n = 1 THEN 1723750 ELSE 0 END,
      CASE WHEN n = 1 THEN 'Paid'
           WHEN (month_start + (n * INTERVAL '1 month')) < NOW() THEN 'Overdue'
           ELSE 'Pending' END,
      CASE WHEN n = 1 THEN month_start + INTERVAL '1 month' ELSE NULL END,
      now_ts, admin_id, branch_id
    );
  END IF;
END LOOP;

-- ── Journal entries & lines ──────────────────────────────────────────────────
-- No unique constraint exists on EntryNumber, so ON CONFLICT has nothing to target;
-- guard manually by EntryNumber+BranchId instead. Each entry's lines are only ever
-- inserted inside the same guard as the entry itself, so a re-run can neither post a
-- duplicate journal entry nor duplicate its lines against an already-posted one.
SELECT ""Id"" INTO je1 FROM ""JournalEntries"" WHERE ""EntryNumber""='DEMO-JE-001' AND ""BranchId""=branch_id;
IF je1 IS NULL THEN
  je1 := '{JE1}'::uuid;

  INSERT INTO ""JournalEntries""
    (""Id"",""EntryNumber"",""EntryDate"",""Description"",""IsPosted"",""IsReversed"",
     ""ReversedEntryId"",""ReferenceType"",""ReferenceId"",""CreatedAt"",""CreatedBy"",""BranchId"")
  VALUES
    (je1,'DEMO-JE-001',month_start+INTERVAL '8 days','Cash sale DEMO-SAL-001',
     true,false,NULL,'SalesContract',sc1,now_ts-INTERVAL '5 days',admin_id,branch_id);

  INSERT INTO ""JournalLines"" (""Id"",""JournalEntryId"",""AccountId"",""Debit"",""Credit"",""Description"")
  VALUES
    (gen_random_uuid(),je1,acc_cash,   23200000,0,       'Cash received - DEMO-SAL-001'),
    (gen_random_uuid(),je1,acc_revenue,0,        23000000,'Vehicle sale revenue'),
    (gen_random_uuid(),je1,acc_cogs,   20000000,0,       'Cost of vehicle sold'),
    (gen_random_uuid(),je1,acc_ar,     0,        20000000,'Remove vehicle from AR/inventory');
END IF;

SELECT ""Id"" INTO je2 FROM ""JournalEntries"" WHERE ""EntryNumber""='DEMO-JE-002' AND ""BranchId""=branch_id;
IF je2 IS NULL THEN
  je2 := '{JE2}'::uuid;

  INSERT INTO ""JournalEntries""
    (""Id"",""EntryNumber"",""EntryDate"",""Description"",""IsPosted"",""IsReversed"",
     ""ReversedEntryId"",""ReferenceType"",""ReferenceId"",""CreatedAt"",""CreatedBy"",""BranchId"")
  VALUES
    (je2,'DEMO-JE-002',month_start+INTERVAL '2 days','Down payment DEMO-SAL-002',
     true,false,NULL,'SalesContract',sc2,now_ts-INTERVAL '8 days',admin_id,branch_id);

  INSERT INTO ""JournalLines"" (""Id"",""JournalEntryId"",""AccountId"",""Debit"",""Credit"",""Description"")
  VALUES
    (gen_random_uuid(),je2,acc_cash,   5000000, 0,       'Down payment - DEMO-SAL-002'),
    (gen_random_uuid(),je2,acc_ar,     19700000,0,       'AR from installment customer'),
    (gen_random_uuid(),je2,acc_revenue,0,       24700000,'Installment sale revenue');
END IF;

RAISE NOTICE '[DemoSeed] Inserted: 5 vehicles, 2 customers, 1 supplier, 3 purchases, 2 sales, 1 installment plan, 12 installments, 2 journal entries';
END $$;
");
        }
    }
}
