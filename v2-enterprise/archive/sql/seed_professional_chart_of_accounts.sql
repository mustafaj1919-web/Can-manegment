-- Reset and Seed Professional Chart of Accounts for Car Showroom Management
-- Run: docker exec -i v2-postgres-db psql -U postgres -d CarShowroomV2 < seed_professional_chart_of_accounts.sql

DO $$
DECLARE
  b RECORD;
  
  -- Root account IDs for each branch
  root_assets_id UUID;
  root_liabilities_id UUID;
  root_equity_id UUID;
  root_revenue_id UUID;
  root_expenses_id UUID;
  
  -- Level 2 parent IDs
  current_assets_id UUID;
  fixed_assets_id UUID;
  current_liabs_id UUID;
  long_term_liabs_id UUID;
  share_capital_id UUID;
  operating_revenue_id UUID;
  other_revenue_id UUID;
  cogs_id UUID;
  admin_expenses_id UUID;
  
  -- Level 3 parent IDs
  cash_equiv_id UUID;
  ar_id UUID;
  inventory_id UUID;
  prepayments_id UUID;
  ap_id UUID;
  accruals_id UUID;
  
BEGIN
  -- Truncate all accounts first
  TRUNCATE TABLE "Accounts" CASCADE;

  -- Loop through each branch and insert the chart of accounts
  FOR b IN SELECT "Id" FROM "Branches" LOOP
  
    -- 1. ROOT LEVEL ACCOUNTS (Level 1)
    root_assets_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "IsActive", "BranchId", "CreatedAt")
    VALUES (root_assets_id, '1', 'الأصول', 1, true, b."Id", NOW());

    root_liabilities_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "IsActive", "BranchId", "CreatedAt")
    VALUES (root_liabilities_id, '2', 'الالتزامات', 2, true, b."Id", NOW());

    root_equity_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "IsActive", "BranchId", "CreatedAt")
    VALUES (root_equity_id, '3', 'حقوق الملكية', 3, true, b."Id", NOW());

    root_revenue_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "IsActive", "BranchId", "CreatedAt")
    VALUES (root_revenue_id, '4', 'الإيرادات', 4, true, b."Id", NOW());

    root_expenses_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "IsActive", "BranchId", "CreatedAt")
    VALUES (root_expenses_id, '5', 'المصاريف', 5, true, b."Id", NOW());


    -- 2. LEVEL 2 ACCOUNTS
    -- Under Assets (1)
    current_assets_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (current_assets_id, '11', 'الأصول المتداولة', 1, root_assets_id, true, b."Id", NOW());

    fixed_assets_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (fixed_assets_id, '12', 'الأصول غير المتداولة (الثابتة)', 1, root_assets_id, true, b."Id", NOW());

    -- Under Liabilities (2)
    current_liabs_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (current_liabs_id, '21', 'الالتزامات المتداولة', 2, root_liabilities_id, true, b."Id", NOW());

    long_term_liabs_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (long_term_liabs_id, '22', 'الالتزامات غير المتداولة', 2, root_liabilities_id, true, b."Id", NOW());

    -- Under Equity (3)
    share_capital_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (share_capital_id, '31', 'رأس المال والاحتياطيات', 3, root_equity_id, true, b."Id", NOW());

    -- Under Revenues (4)
    operating_revenue_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (operating_revenue_id, '41', 'الإيرادات التشغيلية', 4, root_revenue_id, true, b."Id", NOW());

    other_revenue_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (other_revenue_id, '42', 'الإيرادات الأخرى', 4, root_revenue_id, true, b."Id", NOW());

    -- Under Expenses (5)
    cogs_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (cogs_id, '51', 'تكلفة المبيعات (COGS)', 5, root_expenses_id, true, b."Id", NOW());

    admin_expenses_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (admin_expenses_id, '52', 'المصاريف التشغيلية والإدارية', 5, root_expenses_id, true, b."Id", NOW());


    -- 3. LEVEL 3 ACCOUNTS (Sub-groups)
    -- Under Current Assets (11)
    cash_equiv_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (cash_equiv_id, '111', 'النقدية وما يعادلها', 1, current_assets_id, true, b."Id", NOW());

    ar_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (ar_id, '112', 'الذمم المدينة والعملاء', 1, current_assets_id, true, b."Id", NOW());

    inventory_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (inventory_id, '113', 'المخزون', 1, current_assets_id, true, b."Id", NOW());

    prepayments_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (prepayments_id, '114', 'أرصدة مدينة أخرى ودفعات مقدمة', 1, current_assets_id, true, b."Id", NOW());

    -- Under Current Liabilities (21)
    ap_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (ap_id, '211', 'الذمم الدائنة والموردين', 2, current_liabs_id, true, b."Id", NOW());

    accruals_id := gen_random_uuid();
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (accruals_id, '212', 'مصاريف مستحقة والتزامات أخرى', 2, current_liabs_id, true, b."Id", NOW());


    -- 4. ANALYTICAL/LEAF ACCOUNTS (Level 4/Leafs)
    -- Under Cash & Cash Equivalents (111)
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '111001', 'صندوق النقدية الرئيسي - بالدينار', 1, cash_equiv_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '111002', 'صندوق النقدية الرئيسي - بالدولار', 1, cash_equiv_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '111003', 'صندوق النثرية والعهد اليومية', 1, cash_equiv_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '112001', 'حساب البنك المركزي - بالدينار', 1, cash_equiv_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '112002', 'حساب البنك المركزي - بالدولار', 1, cash_equiv_id, true, b."Id", NOW());

    -- Under Accounts Receivable (112)
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '1301', 'ذمم العملاء (المدينين)', 1, ar_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '112101', 'ذمم العملاء (مبيعات الأقساط)', 1, ar_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '112102', 'أوراق القبض (الشيكات المؤجلة)', 1, ar_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '112103', 'سلف ورواتب مقدمة للموظفين', 1, ar_id, true, b."Id", NOW());

    -- Under Inventory (113)
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '1201', 'مخزون السيارات للمعرض', 1, inventory_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '113002', 'سيارات قيد الشحن والتخليص الجمركي', 1, inventory_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '113003', 'مخزن قطع الغيار والإكسسوارات', 1, inventory_id, true, b."Id", NOW());

    -- Under Prepayments (114)
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '114001', 'دفعات مقدمة للموردين', 1, prepayments_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '114002', 'مصاريف مدفوعة مقدماً (إيجارات/تأمين)', 1, prepayments_id, true, b."Id", NOW());

    -- Under Fixed Assets (12)
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '121001', 'العقارات والإنشاءات صالات العرض', 1, fixed_assets_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '121002', 'ديكورات وأثاث صالات العرض', 1, fixed_assets_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '121003', 'سيارات الخدمة وسحب المركبات للشركة', 1, fixed_assets_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '122001', 'مجمع الاهتلاك التراكمي للأصول الثابتة', 1, fixed_assets_id, true, b."Id", NOW());

    -- Under Accounts Payable (211)
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '2101', 'ذمم الدائنين (الموردين)', 2, ap_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '211002', 'ذمم شركات الشحن والتخليص الجمركي', 2, ap_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '211003', 'دفعات مقدمة من العملاء (أمانات وعربون)', 2, ap_id, true, b."Id", NOW());

    -- Under Accruals & Deferred (212)
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '212001', 'رواتب وأجور مستحقة الدفع', 2, accruals_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '212002', 'عمولات مبيعات مستحقة للموظفين', 2, accruals_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '2202', 'ضريبة المبيعات والقيمة المضافة المستحقة', 2, accruals_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '2203', 'أمانات رسوم التسجيل واللوحات للسيارات', 2, accruals_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '2301', 'إيرادات أقساط مؤجلة (أرباح غير محققة)', 2, accruals_id, true, b."Id", NOW());

    -- Under Share Capital (31)
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '3101', 'رأس المال المدفوع والشراكات', 3, share_capital_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '312001', 'الاحتياطيات والأرباح المحتجزة المدورة', 3, share_capital_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '312002', 'أرباح وخسائر العام المالي الحالي', 3, share_capital_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '312003', 'حساب مسحوبات الشركاء الجاري', 3, share_capital_id, true, b."Id", NOW());

    -- Under Operating Revenues (41)
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '4101', 'إيرادات مبيعات السيارات للمعرض', 4, operating_revenue_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '4102', 'إيرادات أرباح أقساط محققة ومستلمة', 4, operating_revenue_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '411003', 'مبيعات قطع الغيار والإكسسوارات للسيارات', 4, operating_revenue_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '411004', 'إيرادات ورشة الصيانة والخدمات للزبائن', 4, operating_revenue_id, true, b."Id", NOW());

    -- Under Other Revenues (42)
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '421001', 'أرباح فروقات أسعار صرف العملات الأجنبية', 4, other_revenue_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '421002', 'إيرادات وعمولات تمويل وتأمين السيارات', 4, other_revenue_id, true, b."Id", NOW());

    -- Under Cost of Goods Sold (51)
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '5101', 'تكلفة السيارات المباعة للمعرض', 5, cogs_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '510102', 'مصاريف تجهيز وتنظيف وتصليح السيارات المباشرة', 5, cogs_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '510103', 'تكاليف الشحن والتخليص الجمركي المباشرة للسيارات', 5, cogs_id, true, b."Id", NOW());

    -- Under Operating & Admin Expenses (52)
    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '5102', 'مصاريف صيانة وتشغيل المعرض العامة', 5, admin_expenses_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '521001', 'رواتب وأجور موظفي المعرض والإدارة', 5, admin_expenses_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '521002', 'عمولات مبيعات موظفي المعرض', 5, admin_expenses_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '521003', 'إيجار صالات العرض والمكاتب الإدارية', 5, admin_expenses_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '521004', 'فواتير المياه والكهرباء والإنترنت والاتصالات', 5, admin_expenses_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '521005', 'مصاريف الدعاية والإعلان والتسويق الرقمي', 5, admin_expenses_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '521006', 'عمولات تحويل بنكية ومصاريف البنك', 5, admin_expenses_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '521007', 'خسائر فروقات أسعار صرف العملات الأجنبية', 5, admin_expenses_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '521008', 'مصاريف اهتلاك الأصول الثابتة السنوية', 5, admin_expenses_id, true, b."Id", NOW());

    INSERT INTO "Accounts" ("Id", "AccountCode", "Name", "Type", "ParentAccountId", "IsActive", "BranchId", "CreatedAt")
    VALUES (gen_random_uuid(), '521009', 'قرطاسية ومطبوعات مكاتب ومستندات ورقية', 5, admin_expenses_id, true, b."Id", NOW());

  END LOOP;
END $$;
