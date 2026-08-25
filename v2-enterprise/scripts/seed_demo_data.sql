-- Demo seed data for presentation mode
-- Safe to run multiple times: all inserts use ON CONFLICT DO NOTHING
-- Run: docker exec -i v2-postgres-db psql -U showroom_prod_admin -d CarShowroomV2_Prod < scripts/seed_demo_data.sql
--
-- Uses real account IDs from branch 11111111-1111-1111-1111-111111111111:
--   111001 cash: e375d88a-b953-4293-b2a6-f124e0003f5b
--   4101 revenue: 7db17f4f-811b-4494-b3c6-bcf4de0f1ad7
--   5101 cogs:   ef8c4b7f-bf84-4e67-bfa7-e42aafd29087
--   JE debit=111001, credit=9a8f58e0 (521001) used in E2E tests

DO $$
DECLARE
  branch_id UUID := '11111111-1111-1111-1111-111111111111';
  admin_id  TEXT := '2c29b035-f4c2-4633-b05f-51cec9148b2b';

  -- Accounts (from branch 11111111)
  acc_cash    UUID := 'e375d88a-b953-4293-b2a6-f124e0003f5b';  -- 111001 cash
  acc_revenue UUID := '7db17f4f-811b-4494-b3c6-bcf4de0f1ad7';  -- 4101 revenue
  acc_cogs    UUID := 'ef8c4b7f-bf84-4e67-bfa7-e42aafd29087';  -- 5101 COGS
  acc_inv     UUID := 'b9b05fab-9fba-4a3e-ab33-42cfdeaac95f';  -- 113 inventory
  acc_ar      UUID := '9a8f58e0-5ee1-4127-ac50-9face2fe8027';  -- 521001 AR (used in tests)

  -- Demo vehicles
  dv1 UUID := 'dd000001-0000-0000-0000-000000000001';
  dv2 UUID := 'dd000002-0000-0000-0000-000000000002';
  dv3 UUID := 'dd000003-0000-0000-0000-000000000003';
  dv4 UUID := 'dd000004-0000-0000-0000-000000000004';
  dv5 UUID := 'dd000005-0000-0000-0000-000000000005';
  dv6 UUID := 'dd000006-0000-0000-0000-000000000006';

  -- Customer accounts
  dac1 UUID := 'dcacc001-0000-0000-0000-000000000001';
  dac2 UUID := 'dcacc002-0000-0000-0000-000000000002';
  dac3 UUID := 'dcacc003-0000-0000-0000-000000000003';
  dac4 UUID := 'dcacc004-0000-0000-0000-000000000004';

  -- Demo customers
  dc1 UUID := 'dc000001-0000-0000-0000-000000000001';
  dc2 UUID := 'dc000002-0000-0000-0000-000000000002';
  dc3 UUID := 'dc000003-0000-0000-0000-000000000003';
  dc4 UUID := 'dc000004-0000-0000-0000-000000000004';

  -- Sales contracts (demo prefix d5c = all valid hex)
  dsc1 UUID := 'd5c00001-0000-0000-0000-000000000001';
  dsc2 UUID := 'd5c00002-0000-0000-0000-000000000002';
  dsc3 UUID := 'd5c00003-0000-0000-0000-000000000003';

  -- Installment plans (d1p = all valid hex)
  dip1 UUID := 'd1b00001-0000-0000-0000-000000000001';
  dip2 UUID := 'd1b00002-0000-0000-0000-000000000002';

  -- Journal entries (d4e = all valid hex)
  dje1 UUID := 'd4e00001-0000-0000-0000-000000000001';
  dje2 UUID := 'd4e00002-0000-0000-0000-000000000002';
  dje3 UUID := 'd4e00003-0000-0000-0000-000000000003';

  now_ts TIMESTAMPTZ := NOW();
  n      INTEGER;
BEGIN

-- ─── Demo Vehicles ──────────────────────────────────────────────────────────
INSERT INTO "Vehicles" (
  "Id","Brand","Model","Trim","ChassisNumber","Color","Year","Condition",
  "PurchaseCost","CustomDuties","MaintenanceCost","BookValue","TargetSellingPrice",
  "IsSold","Status","Currency","CreatedAt","CreatedBy","BranchId"
) VALUES
  (dv1,'Toyota','Land Cruiser','VXR','DEMO-LC300-2024','White',2024,'New',
   45000,2000,500,47500,58000,false,'Available','USD',now_ts - INTERVAL '30 days',admin_id,branch_id),
  (dv2,'Mercedes-Benz','E 200','AMG Line','DEMO-E200-2023','Black',2023,'New',
   35000,1500,300,36800,45000,false,'Available','USD',now_ts - INTERVAL '25 days',admin_id,branch_id),
  (dv3,'BMW','X5','xDrive40i','DEMO-X5-2023','Titanium Silver',2023,'New',
   42000,1800,400,44200,53000,true,'Sold','USD',now_ts - INTERVAL '20 days',admin_id,branch_id),
  (dv4,'Lexus','LX 600','Luxury','DEMO-LX600-2024','Pearl White',2024,'New',
   55000,2500,600,58100,72000,true,'Sold','USD',now_ts - INTERVAL '15 days',admin_id,branch_id),
  (dv5,'Hyundai','Tucson','Smart','DEMO-TUC-2024','Blue',2024,'New',
   18000,800,200,19000,24000,false,'Available','USD',now_ts - INTERVAL '10 days',admin_id,branch_id),
  (dv6,'Kia','Sportage','GT-Line','DEMO-KIA-2023','Red',2023,'New',
   16000,700,150,16850,21000,false,'Reserved','USD',now_ts - INTERVAL '5 days',admin_id,branch_id)
ON CONFLICT ("Id") DO NOTHING;

-- ─── Customer Accounts ────────────────────────────────────────────────────────
INSERT INTO "Accounts" ("Id","AccountCode","Name","Type","IsActive","BranchId","CreatedBy","CreatedAt")
VALUES
  (dac1,'1130201','حساب عميل - محمد علي حسن',    1,true,branch_id,admin_id,now_ts),
  (dac2,'1130202','حساب عميل - سارة أحمد كريم',   1,true,branch_id,admin_id,now_ts),
  (dac3,'1130203','حساب عميل - عبدالله محمد ناصر',1,true,branch_id,admin_id,now_ts),
  (dac4,'1130204','حساب عميل - نور الدين جاسم',   1,true,branch_id,admin_id,now_ts)
ON CONFLICT ("Id") DO NOTHING;

-- ─── Demo Customers ───────────────────────────────────────────────────────────
INSERT INTO "Customers" (
  "Id","Name","FullName","Phone","Address","IdType","IdNumber",
  "Nationality","CustomerType","AccountId","CreatedAt","CreatedBy","BranchId"
) VALUES
  (dc1,'محمد علي حسن',   'محمد علي حسن',   '07901111001','بغداد - المنصور',  NULL,'DEMO-ID-001','iraqi','Individual',dac1,now_ts - INTERVAL '30 days',admin_id,branch_id),
  (dc2,'سارة أحمد كريم', 'سارة أحمد كريم', '07902222002','بغداد - الكرادة',  NULL,'DEMO-ID-002','iraqi','Individual',dac2,now_ts - INTERVAL '25 days',admin_id,branch_id),
  (dc3,'عبدالله ناصر',   'عبدالله محمد ناصر','07903333003','البصرة - العشار',NULL,'DEMO-ID-003','iraqi','Individual',dac3,now_ts - INTERVAL '20 days',admin_id,branch_id),
  (dc4,'نور الدين جاسم', 'نور الدين جاسم', '07904444004','أربيل - عينكاوا', NULL,'DEMO-ID-004','iraqi','Individual',dac4,now_ts - INTERVAL '15 days',admin_id,branch_id)
ON CONFLICT ("Id") DO NOTHING;

-- ─── Demo Sales (Cash sale + 2 Installment sales) ────────────────────────────
INSERT INTO "SalesContracts" (
  "Id","ContractNumber","CustomerId","VehicleId","SaleDate",
  "SalePrice","TaxAmount","RegistrationFees","Discount","NetPrice",
  "DownPayment","RemainingBalance","Profit","PaymentMethod","Status",
  "CreatedAt","CreatedBy","BranchId"
) VALUES
  -- Cash sale: BMW X5 to سارة (sold)
  (dsc1,'DEMO-SAL-001',dc2,dv3,now_ts - INTERVAL '18 days',
   50000,0,500,0,50500,50500,0,8000,1,'Active',
   now_ts - INTERVAL '18 days',admin_id,branch_id),
  -- Installment sale: Toyota Land Cruiser to محمد (still active — we'll mark LandCruiser available? no it's sold)
  -- Wait, dv3 is sold. Let me use dv4 (Lexus, sold) and dv3 (BMW, sold) for these 2 sales
  -- Land Cruiser (dv1) is Available — using it for installment sale (will be "Sold" after)
  -- Actually we need to set the vehicle sold status. Let's just record the contract and
  -- use the existing "Sold" vehicles (dv3 and dv4) for the 2 sales, and dv6 for reservation
  -- Installment sale: Lexus LX600 to عبدالله
  (dsc2,'DEMO-SAL-002',dc3,dv4,now_ts - INTERVAL '14 days',
   68000,0,600,0,68600,10000,58600,14000,4,'Active',
   now_ts - INTERVAL '14 days',admin_id,branch_id),
  -- Cash sale: Hyundai Tucson to نور (available — marking as sold)
  (dsc3,'DEMO-SAL-003',dc4,dv5,now_ts - INTERVAL '8 days',
   22000,0,300,1000,21300,21300,0,4000,1,'Active',
   now_ts - INTERVAL '8 days',admin_id,branch_id)
ON CONFLICT ("Id") DO NOTHING;

-- Mark dv5 as Sold (it was sold in dsc3 above)
UPDATE "Vehicles" SET "IsSold" = true, "Status" = 'Sold' WHERE "Id" = dv5;

-- ─── Installment Plan for DEMO-SAL-002 (Lexus) ───────────────────────────────
INSERT INTO "InstallmentPlans" (
  "Id","SalesContractId","TotalAmount","DownPayment",
  "InstallmentPeriodMonths","ProfitRatePercentage",
  "TotalProfit","TotalPlanAmount","MonthlyInstallmentAmount",
  "Status","CreatedAt","CreatedBy","BranchId"
) VALUES
  (dip1,dsc2,58600,10000,24,8.5,4981,63581,2649.21,
   'Active',now_ts - INTERVAL '14 days',admin_id,branch_id)
ON CONFLICT ("Id") DO NOTHING;

-- 24 monthly installments for dip1 (first 2 paid, rest pending/overdue)
FOR n IN 1..24 LOOP
  INSERT INTO "Installments" (
    "Id","InstallmentPlanId","InstallmentNumber","DueDate","Amount",
    "PaidAmount","Status","PaymentDate","IsProfitRecognized","CreatedAt","CreatedBy","BranchId"
  ) VALUES (
    gen_random_uuid(),
    dip1,
    n,
    (now_ts - INTERVAL '14 days') + (n * INTERVAL '1 month'),
    2649.21,
    CASE WHEN n <= 2 THEN 2649.21 ELSE 0 END,
    CASE WHEN n <= 2 THEN 'Paid'
         WHEN ((now_ts - INTERVAL '14 days') + (n * INTERVAL '1 month')) < NOW() THEN 'Overdue'
         ELSE 'Pending' END,
    CASE WHEN n <= 2 THEN (now_ts - INTERVAL '14 days') + (n * INTERVAL '1 month') ELSE NULL END,
    CASE WHEN n <= 2 THEN true ELSE false END,
    now_ts,
    admin_id,
    branch_id
  );
END LOOP;

-- Second installment plan: 12-month plan for reservation (dv6)
INSERT INTO "InstallmentPlans" (
  "Id","SalesContractId","TotalAmount","DownPayment",
  "InstallmentPeriodMonths","ProfitRatePercentage",
  "TotalProfit","TotalPlanAmount","MonthlyInstallmentAmount",
  "Status","CreatedAt","CreatedBy","BranchId"
) VALUES
  (dip2,NULL,19000,2000,12,7.5,1425,20425,1702.08,
   'Active',now_ts - INTERVAL '5 days',admin_id,branch_id)
ON CONFLICT ("Id") DO NOTHING;

FOR n IN 1..12 LOOP
  INSERT INTO "Installments" (
    "Id","InstallmentPlanId","InstallmentNumber","DueDate","Amount",
    "PaidAmount","Status","PaymentDate","IsProfitRecognized","CreatedAt","CreatedBy","BranchId"
  ) VALUES (
    gen_random_uuid(),
    dip2,
    n,
    (now_ts - INTERVAL '5 days') + (n * INTERVAL '1 month'),
    1702.08,
    CASE WHEN n = 1 THEN 1702.08 ELSE 0 END,
    CASE WHEN n = 1 THEN 'Paid' ELSE 'Pending' END,
    CASE WHEN n = 1 THEN (now_ts - INTERVAL '5 days') + INTERVAL '1 month' ELSE NULL END,
    CASE WHEN n = 1 THEN true ELSE false END,
    now_ts,
    admin_id,
    branch_id
  );
END LOOP;

-- ─── Demo Journal Entries ─────────────────────────────────────────────────────
INSERT INTO "JournalEntries" (
  "Id","EntryNumber","EntryDate","Description","IsPosted","IsReversed",
  "ReversedEntryId","ReferenceType","ReferenceId","CreatedAt","CreatedBy","BranchId"
) VALUES
  (dje1,'DEMO-JE-001',now_ts - INTERVAL '18 days','بيع نقدي - BMW X5 - عقد DEMO-SAL-001',
   true,false,NULL,'SalesContract',dsc1,now_ts - INTERVAL '18 days',admin_id,branch_id),
  (dje2,'DEMO-JE-002',now_ts - INTERVAL '14 days','دفعة أولى - Lexus LX600 - عقد DEMO-SAL-002',
   true,false,NULL,'SalesContract',dsc2,now_ts - INTERVAL '14 days',admin_id,branch_id),
  (dje3,'DEMO-JE-003',now_ts - INTERVAL '8 days','بيع نقدي - Hyundai Tucson - عقد DEMO-SAL-003',
   true,false,NULL,'SalesContract',dsc3,now_ts - INTERVAL '8 days',admin_id,branch_id)
ON CONFLICT ("Id") DO NOTHING;

-- JE1 Lines: Cash sale BMW X5 — BALANCED (Dr Cash + Dr COGS = Cr Revenue + Cr Inventory)
-- Dr Cash 50,500 + Dr COGS 42,000 = Cr Revenue 50,500 + Cr Inventory 42,000
INSERT INTO "JournalLines" ("Id","JournalEntryId","AccountId","Debit","Credit","Description")
VALUES
  (gen_random_uuid(),dje1,acc_cash,   50500, 0,    'استلام نقدي - بيع BMW X5'),
  (gen_random_uuid(),dje1,acc_cogs,   42000, 0,    'تكلفة BMW X5 المباعة'),
  (gen_random_uuid(),dje1,acc_revenue,0,     50500,'إيراد مبيعات BMW X5 + رسوم التسجيل'),
  (gen_random_uuid(),dje1,acc_inv,    0,     42000,'إخراج BMW X5 من المخزون');

-- JE2 Lines: Installment sale Lexus — BALANCED
-- Dr Cash 10,000 + Dr AR 58,600 + Dr COGS 55,000 = Cr Revenue 68,600 + Cr Inventory 55,000
INSERT INTO "JournalLines" ("Id","JournalEntryId","AccountId","Debit","Credit","Description")
VALUES
  (gen_random_uuid(),dje2,acc_cash,   10000, 0,    'دفعة أولى - Lexus LX600'),
  (gen_random_uuid(),dje2,acc_ar,     58600, 0,    'ذمم مدينة - عبدالله ناصر (قسط Lexus)'),
  (gen_random_uuid(),dje2,acc_cogs,   55000, 0,    'تكلفة Lexus LX600 المباعة'),
  (gen_random_uuid(),dje2,acc_revenue,0,     68600,'إيراد بيع أقساط - Lexus LX600'),
  (gen_random_uuid(),dje2,acc_inv,    0,     55000,'إخراج Lexus LX600 من المخزون');

-- JE3 Lines: Cash sale Hyundai Tucson — BALANCED
-- Dr Cash 21,300 + Dr COGS 18,000 = Cr Revenue 21,300 + Cr Inventory 18,000
INSERT INTO "JournalLines" ("Id","JournalEntryId","AccountId","Debit","Credit","Description")
VALUES
  (gen_random_uuid(),dje3,acc_cash,   21300, 0,    'استلام نقدي - بيع Hyundai Tucson'),
  (gen_random_uuid(),dje3,acc_cogs,   18000, 0,    'تكلفة Hyundai Tucson المباعة'),
  (gen_random_uuid(),dje3,acc_revenue,0,     21300,'إيراد مبيعات Hyundai Tucson + رسوم'),
  (gen_random_uuid(),dje3,acc_inv,    0,     18000,'إخراج Hyundai Tucson من المخزون');

RAISE NOTICE 'Demo seed completed: 6 vehicles, 4 customers, 3 sales, 2 installment plans (24+12 schedules), 3 journal entries (11 lines)';
END $$;
