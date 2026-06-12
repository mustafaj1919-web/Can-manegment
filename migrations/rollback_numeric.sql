-- ══════════════════════════════════════════════════════════════════════════
--  Rollback: NUMERIC → Float
--  Use only if the Float → NUMERIC migration caused production issues and
--  a restore from backup is not viable.
--  WARNING: NUMERIC → DOUBLE PRECISION is lossy if values exceed float64
--  precision, but for typical monetary amounts (< 10^13) it is safe.
-- ══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE exchange_rate
    ALTER COLUMN rate TYPE DOUBLE PRECISION USING rate::DOUBLE PRECISION;

ALTER TABLE car
    ALTER COLUMN purchase_price TYPE DOUBLE PRECISION USING purchase_price::DOUBLE PRECISION,
    ALTER COLUMN selling_price  TYPE DOUBLE PRECISION USING selling_price::DOUBLE PRECISION;

ALTER TABLE sale
    ALTER COLUMN selling_price    TYPE DOUBLE PRECISION USING selling_price::DOUBLE PRECISION,
    ALTER COLUMN discount         TYPE DOUBLE PRECISION USING discount::DOUBLE PRECISION,
    ALTER COLUMN paid_amount      TYPE DOUBLE PRECISION USING paid_amount::DOUBLE PRECISION,
    ALTER COLUMN remaining_amount TYPE DOUBLE PRECISION USING remaining_amount::DOUBLE PRECISION;

ALTER TABLE installment_plan
    ALTER COLUMN total_amount       TYPE DOUBLE PRECISION USING total_amount::DOUBLE PRECISION,
    ALTER COLUMN paid_amount        TYPE DOUBLE PRECISION USING paid_amount::DOUBLE PRECISION,
    ALTER COLUMN remaining_amount   TYPE DOUBLE PRECISION USING remaining_amount::DOUBLE PRECISION,
    ALTER COLUMN installment_amount TYPE DOUBLE PRECISION USING installment_amount::DOUBLE PRECISION;

ALTER TABLE installment_schedule
    ALTER COLUMN amount           TYPE DOUBLE PRECISION USING amount::DOUBLE PRECISION,
    ALTER COLUMN paid_amount      TYPE DOUBLE PRECISION USING paid_amount::DOUBLE PRECISION,
    ALTER COLUMN remaining_amount TYPE DOUBLE PRECISION USING remaining_amount::DOUBLE PRECISION;

ALTER TABLE purchase
    ALTER COLUMN purchase_price   TYPE DOUBLE PRECISION USING purchase_price::DOUBLE PRECISION,
    ALTER COLUMN paid_amount      TYPE DOUBLE PRECISION USING paid_amount::DOUBLE PRECISION,
    ALTER COLUMN remaining_amount TYPE DOUBLE PRECISION USING remaining_amount::DOUBLE PRECISION;

ALTER TABLE payment
    ALTER COLUMN amount TYPE DOUBLE PRECISION USING amount::DOUBLE PRECISION;

ALTER TABLE expense
    ALTER COLUMN amount TYPE DOUBLE PRECISION USING amount::DOUBLE PRECISION;

ALTER TABLE transaction
    ALTER COLUMN amount TYPE DOUBLE PRECISION USING amount::DOUBLE PRECISION;

ALTER TABLE voucher
    ALTER COLUMN amount TYPE DOUBLE PRECISION USING amount::DOUBLE PRECISION;

ALTER TABLE vehicle_cost
    ALTER COLUMN amount TYPE DOUBLE PRECISION USING amount::DOUBLE PRECISION;

ALTER TABLE account
    ALTER COLUMN balance TYPE DOUBLE PRECISION USING balance::DOUBLE PRECISION;

ALTER TABLE journal_entry_line
    ALTER COLUMN debit  TYPE DOUBLE PRECISION USING debit::DOUBLE PRECISION,
    ALTER COLUMN credit TYPE DOUBLE PRECISION USING credit::DOUBLE PRECISION;

ALTER TABLE cashbox_close
    ALTER COLUMN system_balance TYPE DOUBLE PRECISION USING system_balance::DOUBLE PRECISION,
    ALTER COLUMN actual_balance TYPE DOUBLE PRECISION USING actual_balance::DOUBLE PRECISION,
    ALTER COLUMN difference     TYPE DOUBLE PRECISION USING difference::DOUBLE PRECISION;

ALTER TABLE employee_target
    ALTER COLUMN target_revenue TYPE DOUBLE PRECISION USING target_revenue::DOUBLE PRECISION,
    ALTER COLUMN target_profit  TYPE DOUBLE PRECISION USING target_profit::DOUBLE PRECISION;

ALTER TABLE employee_commission
    ALTER COLUMN commission_rate   TYPE DOUBLE PRECISION USING commission_rate::DOUBLE PRECISION,
    ALTER COLUMN commission_amount TYPE DOUBLE PRECISION USING commission_amount::DOUBLE PRECISION;

ALTER TABLE sale_pipeline
    ALTER COLUMN expected_price TYPE DOUBLE PRECISION USING expected_price::DOUBLE PRECISION;

COMMIT;
