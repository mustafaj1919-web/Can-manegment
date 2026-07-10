-- Seed business data for v2-enterprise PostgreSQL
-- Run: docker exec -i v2-postgres-db psql -U postgres -d CarShowroomV2 < seed_v2_data.sql

DO $$
DECLARE
  branch_id UUID := '11111111-1111-1111-1111-111111111111';
  admin_id  TEXT := '15751db5-ff22-4a9d-a895-041da9a19453';

  v1 UUID := 'a1000001-0000-0000-0000-000000000001';
  v2 UUID := 'a1000002-0000-0000-0000-000000000002';
  v3 UUID := 'a1000003-0000-0000-0000-000000000003';
  v4 UUID := 'a1000004-0000-0000-0000-000000000004';

  c1 UUID := 'bb000010-0000-0000-0000-000000000010';
  c2 UUID := 'b2000001-0000-0000-0000-000000000001';

  s1      UUID := 'c3000001-0000-0000-0000-000000000001';
  acc_c1  UUID := 'b2acc003-0000-0000-0000-000000000003';
  acc_c2  UUID := 'b2acc001-0000-0000-0000-000000000001';
  acc_sup UUID := 'b2acc002-0000-0000-0000-000000000002';

  sc1 UUID := 'd4000001-0000-0000-0000-000000000001';
  sc2 UUID := 'd4000002-0000-0000-0000-000000000002';

  p1 UUID := 'e5000001-0000-0000-0000-000000000001';
  p2 UUID := 'e5000002-0000-0000-0000-000000000002';

  ip1 UUID := 'f6000001-0000-0000-0000-000000000001';

  je1 UUID := '01000001-0000-0000-0000-000000000001';
  je2 UUID := '01000002-0000-0000-0000-000000000002';

  acc_cash    UUID := '22222222-2222-2222-2222-222222222222';
  acc_cars    UUID := '33333333-3333-3333-3333-333333333333';
  acc_ar      UUID := '44444444-4444-4444-4444-444444444444';
  acc_revenue UUID := '77777777-7777-7777-7777-777777777777';
  acc_cogs    UUID := '88888888-8888-8888-8888-888888888888';

  now_ts      TIMESTAMPTZ := NOW();
  month_start TIMESTAMPTZ := date_trunc('month', NOW());
  n           INTEGER;
BEGIN

-- Core Accounts for seed data
INSERT INTO "Accounts" ("Id","AccountCode","Name","Type","IsActive","BranchId","CreatedBy","CreatedAt") VALUES
  ('22222222-2222-2222-2222-222222222222', '11010001', 'صندوق النقدية الرئيسي', 1, true, branch_id, admin_id, now_ts),
  ('33333333-3333-3333-3333-333333333333', '12010001', 'مخزون السيارات', 1, true, branch_id, admin_id, now_ts),
  ('44444444-4444-4444-4444-444444444444', '13010001', 'حسابات العملاء المدينين', 1, true, branch_id, admin_id, now_ts),
  ('77777777-7777-7777-7777-777777777777', '41010001', 'إيرادات المبيعات والفوائد', 4, true, branch_id, admin_id, now_ts),
  ('88888888-8888-8888-8888-888888888888', '51010001', 'تكلفة السيارات المباعة', 5, true, branch_id, admin_id, now_ts)
ON CONFLICT ("Id") DO NOTHING;

-- Vehicles
INSERT INTO "Vehicles" ("Id","Model","ChassisNumber","EngineNumber","Color","Year","PurchaseCost","CustomDuties","MaintenanceCost","BookValue","TargetSellingPrice","IsSold","Status","CreatedAt","CreatedBy","BranchId","Currency")
VALUES
  (v1,'Toyota Camry 2024','1HGCM82633A004352','2AZ-FE-001','White',2024,25000000,2000000,500000,27500000,32000000,false,'Available',now_ts,admin_id,branch_id,'IQD'),
  (v2,'Kia Sportage 2023','KNDPC3A21H7231456','G4NA-789','Black',2023,20000000,1500000,300000,21800000,26000000,false,'Available',now_ts - INTERVAL '10 days',admin_id,branch_id,'IQD'),
  (v3,'Hyundai Tucson 2022','5NPE34AF1JH693418','G4KD-456','Silver',2022,18000000,1200000,800000,20000000,24000000,true,'Sold',now_ts - INTERVAL '5 days',admin_id,branch_id,'IQD'),
  (v4,'Toyota Corolla 2023','2T1BURHE0JC045231','1ZR-FE-222','Red',2023,15000000,1000000,200000,16200000,20000000,false,'Available',now_ts - INTERVAL '20 days',admin_id,branch_id,'IQD')
ON CONFLICT ("Id") DO NOTHING;

-- Account for first customer
INSERT INTO "Accounts" ("Id","AccountCode","Name","Type","IsActive","BranchId","CreatedBy","CreatedAt")
VALUES (acc_c1,'13010001','Customer Account - First Customer',1,true,branch_id,admin_id,now_ts)
ON CONFLICT ("Id") DO NOTHING;

-- First customer (re-insert / ensure c1 exists)
INSERT INTO "Customers" ("Id","Name","FullName","Phone","Address","IdType","IdNumber","IdIssueDate","IdExpiryDate","Nationality","DateOfBirth","CustomerType","Notes","AccountId","CreatedAt","CreatedBy","BranchId")
VALUES
  (c1,'First Customer','First Customer','07901234501','Baghdad',NULL,'IQ-10010001',NULL,NULL,'iraqi',NULL,'Individual',NULL,acc_c1,now_ts - INTERVAL '15 days',admin_id,branch_id)
ON CONFLICT ("Id") DO NOTHING;

-- Account for second customer
INSERT INTO "Accounts" ("Id","AccountCode","Name","Type","IsActive","BranchId","CreatedBy","CreatedAt")
VALUES (acc_c2,'13010002','Customer Account - Ahmed Hassan',1,true,branch_id,admin_id,now_ts)
ON CONFLICT ("Id") DO NOTHING;

-- Second customer
INSERT INTO "Customers" ("Id","Name","FullName","Phone","Address","IdType","IdNumber","IdIssueDate","IdExpiryDate","Nationality","DateOfBirth","CustomerType","Notes","AccountId","CreatedAt","CreatedBy","BranchId")
VALUES
  (c2,'Ahmed Hassan','Ahmed Hassan','07701234567','Baghdad',NULL,'12345678',NULL,NULL,'iraqi',NULL,'Individual',NULL,acc_c2,now_ts - INTERVAL '15 days',admin_id,branch_id)
ON CONFLICT ("Id") DO NOTHING;

-- Supplier account
INSERT INTO "Accounts" ("Id","AccountCode","Name","Type","IsActive","BranchId","CreatedBy","CreatedAt")
VALUES (acc_sup,'21010001','Supplier Account - Iraq Auto Import',4,true,branch_id,admin_id,now_ts)
ON CONFLICT ("Id") DO NOTHING;

-- Supplier
INSERT INTO "Suppliers" ("Id","Name","Code","Phone","Address","Notes","IsActive","AccountId","CreatedAt","CreatedBy","BranchId")
VALUES
  (s1,'Iraq Auto Import Co','SUP-001','07800000001','Baghdad','Main vehicle supplier',true,acc_sup,now_ts,admin_id,branch_id)
ON CONFLICT ("Id") DO NOTHING;

-- Purchases (PaymentMethod: Cash=1, Bank=2)
INSERT INTO "Purchases" ("Id","PurchaseNumber","SupplierId","VehicleId","PurchaseDate","PurchaseCost","PaymentMethod","Status","CreatedAt","CreatedBy","BranchId")
VALUES
  (p1,'PUR-2026-001',s1,v3,month_start + INTERVAL '5 days',20000000,1,'Completed',now_ts - INTERVAL '5 days',admin_id,branch_id),
  (p2,'PUR-2026-002',s1,v4,month_start + INTERVAL '3 days',16200000,2,'Completed',now_ts - INTERVAL '3 days',admin_id,branch_id)
ON CONFLICT ("Id") DO NOTHING;

-- Sales Contracts
INSERT INTO "SalesContracts" ("Id","ContractNumber","CustomerId","VehicleId","SaleDate","SalePrice","TaxAmount","RegistrationFees","Discount","NetPrice","DownPayment","RemainingBalance","Profit","PaymentMethod","Status","CreatedAt","CreatedBy","BranchId")
VALUES
  (sc1,'SAL-2026-001',c1,v3,month_start + INTERVAL '8 days',23000000,0,200000,0,23200000,23200000,0,3000000,1,'Active',now_ts - INTERVAL '5 days',admin_id,branch_id),
  (sc2,'SAL-2026-002',c2,v2,month_start + INTERVAL '2 days',25000000,0,200000,500000,24700000,5000000,19700000,3700000,1,'Active',now_ts - INTERVAL '8 days',admin_id,branch_id)
ON CONFLICT ("Id") DO NOTHING;

-- Installment Plan for sc2
INSERT INTO "InstallmentPlans" ("Id","SalesContractId","TotalAmount","DownPayment","InstallmentPeriodMonths","ProfitRatePercentage","TotalProfit","TotalPlanAmount","MonthlyInstallmentAmount","Status","CreatedAt","CreatedBy","BranchId")
VALUES
  (ip1,sc2,19700000,5000000,12,5,985000,20685000,1723750,'Active',now_ts - INTERVAL '8 days',admin_id,branch_id)
ON CONFLICT ("Id") DO NOTHING;

-- 12 monthly installments
FOR n IN 1..12 LOOP
  INSERT INTO "Installments" ("Id","InstallmentPlanId","InstallmentNumber","DueDate","Amount","PaidAmount","Status","PaymentDate","CreatedAt","CreatedBy","BranchId")
  VALUES (
    gen_random_uuid(),
    ip1,
    n,
    month_start + (n * INTERVAL '1 month'),
    1723750,
    CASE WHEN n = 1 THEN 1723750 ELSE 0 END,
    CASE WHEN n = 1 THEN 'Paid'
         WHEN (month_start + (n * INTERVAL '1 month')) < NOW() THEN 'Overdue'
         ELSE 'Pending' END,
    CASE WHEN n = 1 THEN month_start + INTERVAL '1 month' ELSE NULL END,
    now_ts,
    admin_id,
    branch_id
  );
END LOOP;

-- Journal Entry 1: cash sale (SAL-2026-001)
INSERT INTO "JournalEntries" ("Id","EntryNumber","EntryDate","Description","IsPosted","IsReversed","ReversedEntryId","ReferenceType","ReferenceId","CreatedAt","CreatedBy","BranchId")
VALUES
  (je1,'JE-2026-001',month_start + INTERVAL '8 days','Cash sale SAL-2026-001',true,false,NULL,'SalesContract',sc1,now_ts - INTERVAL '5 days',admin_id,branch_id),
  (je2,'JE-2026-002',month_start + INTERVAL '2 days','Down payment SAL-2026-002',true,false,NULL,'SalesContract',sc2,now_ts - INTERVAL '8 days',admin_id,branch_id)
ON CONFLICT ("Id") DO NOTHING;

-- Journal Lines for JE1
INSERT INTO "JournalLines" ("Id","JournalEntryId","AccountId","Debit","Credit","Description")
VALUES
  (gen_random_uuid(),je1,acc_cash,23200000,0,'Cash received from sale'),
  (gen_random_uuid(),je1,acc_revenue,0,23000000,'Vehicle sale revenue'),
  (gen_random_uuid(),je1,acc_cogs,20000000,0,'Cost of vehicle sold'),
  (gen_random_uuid(),je1,acc_cars,0,20000000,'Remove from inventory');

-- Journal Lines for JE2
INSERT INTO "JournalLines" ("Id","JournalEntryId","AccountId","Debit","Credit","Description")
VALUES
  (gen_random_uuid(),je2,acc_cash,5000000,0,'Down payment received'),
  (gen_random_uuid(),je2,acc_ar,19700000,0,'Receivable from customer'),
  (gen_random_uuid(),je2,acc_revenue,0,24700000,'Installment sale revenue');

RAISE NOTICE 'Seed completed: 4 vehicles, 2 customers, 1 supplier, 2 purchases, 2 sales, 1 installment plan, 12 installments, 2 journal entries';
END $$;
