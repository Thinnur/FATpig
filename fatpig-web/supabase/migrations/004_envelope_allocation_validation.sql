-- ============================================================
-- ENVELOPE ALLOCATION VALIDATION - PREVENT NEGATIVE FREE BALANCE
-- FATpig Application - Supabase PostgreSQL
-- Migration: 004_envelope_allocation_validation.sql
-- ============================================================
-- Purpose: Add database-level validation to prevent envelope allocations
--          that exceed available account balances (negative free balance)
--
-- This migration adds a PostgreSQL trigger that validates total envelope
-- allocation against total account balance before INSERT or UPDATE operations.
--
-- Business Rule: Total Envelope Allocation <= Total Account Balance
-- Formula: Free Balance = Total Account Balance - Total Envelope Allocation
-- Constraint: Free Balance must be >= 0
-- ============================================================

-- ============================================================
-- STEP 1: Create validation function
-- ============================================================
CREATE OR REPLACE FUNCTION check_envelope_allocation()
RETURNS TRIGGER AS $$
DECLARE
    v_total_saldo BIGINT;
    v_total_allocation BIGINT;
    v_free_balance BIGINT;
BEGIN
    -- Get total account balance for this user (exclude deleted accounts)
    SELECT COALESCE(SUM(saldo), 0) 
    INTO v_total_saldo
    FROM multi_rekening
    WHERE user_id = NEW.user_id 
      AND (is_deleted = false OR is_deleted IS NULL);
    
    -- Get total envelope allocation (excluding current envelope if UPDATE)
    SELECT COALESCE(SUM(jumlah), 0)
    INTO v_total_allocation
    FROM pos_anggaran
    WHERE user_id = NEW.user_id;
    
    -- For UPDATE operations, subtract the old value first
    IF TG_OP = 'UPDATE' THEN
        v_total_allocation := v_total_allocation - OLD.jumlah;
    END IF;
    
    -- Add the new/updated envelope amount
    v_total_allocation := v_total_allocation + NEW.jumlah;
    
    -- Calculate free balance
    v_free_balance := v_total_saldo - v_total_allocation;
    
    -- Check if allocation exceeds available balance
    IF v_free_balance < 0 THEN
        RAISE EXCEPTION 'Envelope allocation exceeds available balance'
            USING 
                HINT = format('Total accounts: Rp %s, Total allocation would be: Rp %s, Shortage: Rp %s. Please reduce allocation or add funds to accounts.',
                    v_total_saldo,
                    v_total_allocation,
                    ABS(v_free_balance)),
                ERRCODE = '23514';  -- check_violation error code
    END IF;
    
    -- Validation passed, allow operation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_envelope_allocation() IS 
'Validates that total envelope allocation does not exceed total account balance. Prevents negative free balance.';

-- ============================================================
-- STEP 2: Attach trigger to pos_anggaran table
-- ============================================================
-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS enforce_allocation_limit ON pos_anggaran;

-- Create trigger
CREATE TRIGGER enforce_allocation_limit
    BEFORE INSERT OR UPDATE OF jumlah, user_id
    ON pos_anggaran
    FOR EACH ROW
    EXECUTE FUNCTION check_envelope_allocation();

COMMENT ON TRIGGER enforce_allocation_limit ON pos_anggaran IS 
'Enforces free balance constraint: prevents envelope allocations exceeding available funds';

-- ============================================================
-- STEP 3: Add helper view to monitor free balance per user
-- ============================================================
CREATE OR REPLACE VIEW v_user_free_balance AS
SELECT 
    p.id AS user_id,
    COALESCE(SUM(mr.saldo), 0) AS total_account_balance,
    COALESCE(SUM(pa.jumlah), 0) AS total_envelope_allocation,
    COALESCE(SUM(mr.saldo), 0) - COALESCE(SUM(pa.jumlah), 0) AS free_balance,
    COUNT(DISTINCT mr.id) AS account_count,
    COUNT(DISTINCT pa.id) AS envelope_count
FROM profiles p
LEFT JOIN multi_rekening mr ON mr.user_id = p.id AND (mr.is_deleted = false OR mr.is_deleted IS NULL)
LEFT JOIN pos_anggaran pa ON pa.user_id = p.id
GROUP BY p.id;

COMMENT ON VIEW v_user_free_balance IS 
'Aggregates account balances and envelope allocations to show free balance per user';

-- Grant access to authenticated users (optional - for admin dashboard)
GRANT SELECT ON v_user_free_balance TO authenticated;

-- ============================================================
-- STEP 4: Test trigger (uncomment to run manual tests)
-- ============================================================
-- Test 1: Try to create envelope exceeding balance (should fail)
-- Example: If user has Rp 100,000 in accounts and Rp 90,000 in envelopes,
--          trying to add Rp 20,000 envelope should fail
-- 
-- INSERT INTO pos_anggaran (user_id, kategori, jumlah, tipe_batas, batas_nominal)
-- VALUES (
--     '<your-user-id>',
--     'Test Kategori',
--     20000000,  -- Rp 20 million (assuming this exceeds your balance)
--     'Tidak Ada',
--     0
-- );
-- Expected: ERROR - Envelope allocation exceeds available balance

-- Test 2: Try to update envelope to exceed balance (should fail)
-- UPDATE pos_anggaran 
-- SET jumlah = 99999999999 
-- WHERE user_id = '<your-user-id>' 
-- LIMIT 1;
-- Expected: ERROR - Envelope allocation exceeds available balance

-- Test 3: Check your current free balance
-- SELECT * FROM v_user_free_balance WHERE user_id = '<your-user-id>';

-- ============================================================
-- STEP 5: Migration rollback script (if needed)
-- ============================================================
-- To remove this validation and revert changes:
-- 
-- DROP TRIGGER IF EXISTS enforce_allocation_limit ON pos_anggaran;
-- DROP FUNCTION IF EXISTS check_envelope_allocation();
-- DROP VIEW IF EXISTS v_user_free_balance;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '==========================================================';
    RAISE NOTICE 'Migration 004_envelope_allocation_validation completed';
    RAISE NOTICE '==========================================================';
    RAISE NOTICE 'Added: check_envelope_allocation() function';
    RAISE NOTICE 'Added: enforce_allocation_limit trigger on pos_anggaran';
    RAISE NOTICE 'Added: v_user_free_balance view for monitoring';
    RAISE NOTICE '';
    RAISE NOTICE 'Envelope allocations are now validated at database level';
    RAISE NOTICE 'Users cannot allocate more than their available balance';
    RAISE NOTICE '==========================================================';
END $$;
