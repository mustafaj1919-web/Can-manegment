-- ══════════════════════════════════════════════════════════════════════════
--  Pre / Post Migration Validation Queries
--  Run BEFORE migration to see current types.
--  Run AFTER migration to confirm all Float columns are gone.
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Show all Float columns that remain (should return 0 rows after migration)
SELECT
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type IN ('real', 'double precision')
ORDER BY table_name, column_name;

-- 2. Show all NUMERIC columns (should list all migrated columns after migration)
SELECT
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'numeric'
ORDER BY table_name, column_name;

-- 3. Verify row counts are intact (run before and after, compare)
SELECT 'car'                  AS tbl, COUNT(*) AS rows FROM car
UNION ALL
SELECT 'sale',                           COUNT(*) FROM sale
UNION ALL
SELECT 'purchase',                       COUNT(*) FROM purchase
UNION ALL
SELECT 'payment',                        COUNT(*) FROM payment
UNION ALL
SELECT 'installment_plan',               COUNT(*) FROM installment_plan
UNION ALL
SELECT 'installment_schedule',           COUNT(*) FROM installment_schedule
UNION ALL
SELECT 'expense',                        COUNT(*) FROM expense
UNION ALL
SELECT 'account',                        COUNT(*) FROM account
UNION ALL
SELECT 'journal_entry_line',             COUNT(*) FROM journal_entry_line
UNION ALL
SELECT 'voucher',                        COUNT(*) FROM voucher
UNION ALL
SELECT 'cashbox_close',                  COUNT(*) FROM cashbox_close
UNION ALL
SELECT 'vehicle_cost',                   COUNT(*) FROM vehicle_cost
UNION ALL
SELECT 'employee_commission',            COUNT(*) FROM employee_commission
UNION ALL
SELECT 'exchange_rate',                  COUNT(*) FROM exchange_rate
ORDER BY tbl;

-- 4. Verify no NULL was introduced in NOT NULL columns
SELECT COUNT(*) AS cars_with_null_price    FROM car      WHERE purchase_price IS NULL;
SELECT COUNT(*) AS sales_with_null_price   FROM sale     WHERE selling_price  IS NULL;
SELECT COUNT(*) AS pay_with_null_amount    FROM payment  WHERE amount         IS NULL;

-- 5. Spot-check a few values for rounding sanity (should be 0)
SELECT COUNT(*) AS suspicious_sale_prices
FROM sale
WHERE selling_price != ROUND(selling_price, 2);

SELECT COUNT(*) AS suspicious_account_balances
FROM account
WHERE balance != ROUND(balance, 4);
