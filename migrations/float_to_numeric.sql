-- ══════════════════════════════════════════════════════════════════════════
--  Float → NUMERIC Migration
--  DO NOT RUN this file automatically. Execute only after:
--    1. Creating a full database backup
--    2. Verifying the backup restores successfully
--    3. Running validate_numeric.sql BEFORE (pre-check)
--    4. Scheduling a maintenance window (no active connections)
-- ══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Phase 1: Exchange Rates ────────────────────────────────────────────────
ALTER TABLE exchange_rate
    ALTER COLUMN rate TYPE NUMERIC(15,6) USING rate::NUMERIC;

-- ── Phase 2: Cars ──────────────────────────────────────────────────────────
ALTER TABLE car
    ALTER COLUMN purchase_price TYPE NUMERIC(15,2) USING purchase_price::NUMERIC,
    ALTER COLUMN selling_price  TYPE NUMERIC(15,2) USING selling_price::NUMERIC;

-- ── Phase 3: Sales ─────────────────────────────────────────────────────────
ALTER TABLE sale
    ALTER COLUMN selling_price    TYPE NUMERIC(15,2) USING selling_price::NUMERIC,
    ALTER COLUMN discount         TYPE NUMERIC(15,2) USING discount::NUMERIC,
    ALTER COLUMN paid_amount      TYPE NUMERIC(15,2) USING paid_amount::NUMERIC,
    ALTER COLUMN remaining_amount TYPE NUMERIC(15,2) USING remaining_amount::NUMERIC;

-- ── Phase 4: Installment Plans & Schedules ────────────────────────────────
ALTER TABLE installment_plan
    ALTER COLUMN total_amount      TYPE NUMERIC(15,2) USING total_amount::NUMERIC,
    ALTER COLUMN paid_amount       TYPE NUMERIC(15,2) USING paid_amount::NUMERIC,
    ALTER COLUMN remaining_amount  TYPE NUMERIC(15,2) USING remaining_amount::NUMERIC,
    ALTER COLUMN installment_amount TYPE NUMERIC(15,2) USING installment_amount::NUMERIC;

ALTER TABLE installment_schedule
    ALTER COLUMN amount           TYPE NUMERIC(15,2) USING amount::NUMERIC,
    ALTER COLUMN paid_amount      TYPE NUMERIC(15,2) USING paid_amount::NUMERIC,
    ALTER COLUMN remaining_amount TYPE NUMERIC(15,2) USING remaining_amount::NUMERIC;

-- ── Phase 5: Purchases & Payments ─────────────────────────────────────────
ALTER TABLE purchase
    ALTER COLUMN purchase_price   TYPE NUMERIC(15,2) USING purchase_price::NUMERIC,
    ALTER COLUMN paid_amount      TYPE NUMERIC(15,2) USING paid_amount::NUMERIC,
    ALTER COLUMN remaining_amount TYPE NUMERIC(15,2) USING remaining_amount::NUMERIC;

ALTER TABLE payment
    ALTER COLUMN amount TYPE NUMERIC(15,2) USING amount::NUMERIC;

-- ── Phase 6: Expenses, Transactions, Vouchers, VehicleCosts ──────────────
ALTER TABLE expense
    ALTER COLUMN amount TYPE NUMERIC(15,2) USING amount::NUMERIC;

ALTER TABLE transaction
    ALTER COLUMN amount TYPE NUMERIC(15,2) USING amount::NUMERIC;

ALTER TABLE voucher
    ALTER COLUMN amount TYPE NUMERIC(15,2) USING amount::NUMERIC;

ALTER TABLE vehicle_cost
    ALTER COLUMN amount TYPE NUMERIC(15,2) USING amount::NUMERIC;

-- ── Phase 7: Accounting (ledger precision) ────────────────────────────────
ALTER TABLE account
    ALTER COLUMN balance TYPE NUMERIC(15,4) USING balance::NUMERIC;

ALTER TABLE journal_entry_line
    ALTER COLUMN debit  TYPE NUMERIC(15,4) USING debit::NUMERIC,
    ALTER COLUMN credit TYPE NUMERIC(15,4) USING credit::NUMERIC;

ALTER TABLE cashbox_close
    ALTER COLUMN system_balance TYPE NUMERIC(15,4) USING system_balance::NUMERIC,
    ALTER COLUMN actual_balance TYPE NUMERIC(15,4) USING actual_balance::NUMERIC,
    ALTER COLUMN difference     TYPE NUMERIC(15,4) USING difference::NUMERIC;

-- ── Phase 8: Employee Targets & Commissions ───────────────────────────────
ALTER TABLE employee_target
    ALTER COLUMN target_revenue TYPE NUMERIC(15,2) USING target_revenue::NUMERIC,
    ALTER COLUMN target_profit  TYPE NUMERIC(15,2) USING target_profit::NUMERIC;

ALTER TABLE employee_commission
    ALTER COLUMN commission_rate   TYPE NUMERIC(8,4)  USING commission_rate::NUMERIC,
    ALTER COLUMN commission_amount TYPE NUMERIC(15,2) USING commission_amount::NUMERIC;

-- ── Phase 9: Pipeline Deals ───────────────────────────────────────────────
ALTER TABLE pipeline_deal
    ALTER COLUMN expected_price TYPE NUMERIC(15,2) USING expected_price::NUMERIC;

COMMIT;

-- After running this file, execute validate_numeric.sql to confirm all types.
