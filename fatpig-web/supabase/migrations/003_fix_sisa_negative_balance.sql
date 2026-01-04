-- ============================================================
-- SISA AMPLOP BUG FIX - NEGATIVE BALANCE CLEANUP & CONSTRAINTS
-- FATpig Application - Supabase PostgreSQL
-- Migration: 003_fix_sisa_negative_balance.sql
-- ============================================================
-- Purpose: Fix existing negative balances caused by sisa accumulation bug
--          and add database constraints to prevent future occurrences
--
-- This migration should be run AFTER updating 001_sisa_accumulation_cron.sql
-- to ensure the logic is fixed before adding constraints.
--
-- Bug Description: The sisa accumulation cron was deducting from main envelopes
-- without checking available balance, causing negative balances when envelopes
-- were empty. This migration cleans up the damage and adds safeguards.
-- ============================================================

-- ============================================================
-- STEP 1: Cleanup negative balances in main envelopes
-- ============================================================
DO $$
DECLARE
    v_affected_rows INT;
BEGIN
    -- Reset all negative balances to 0 for non-sisa envelopes
    UPDATE pos_anggaran
    SET jumlah = 0
    WHERE jumlah < 0
      AND (is_sisa_amplop = false OR is_sisa_amplop IS NULL);
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    
    RAISE NOTICE 'Fixed % envelope(s) with negative balance', v_affected_rows;
END $$;

-- ============================================================
-- STEP 2: Add constraint to prevent negative balances
-- ============================================================
-- This ensures no envelope can ever have a negative balance
-- If this fails, it means there are still negative values in the table
ALTER TABLE pos_anggaran 
ADD CONSTRAINT check_positive_balance 
CHECK (jumlah >= 0);

COMMENT ON CONSTRAINT check_positive_balance ON pos_anggaran IS 
'Prevents negative envelope balances. All balances must be >= 0.';

-- ============================================================
-- STEP 3: Add unique index for sisa accumulation log idempotency
-- ============================================================
-- Enforces that each date+user+category+limit_type can only be processed once
-- This prevents duplicate processing at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_sisa_log_unique_processing 
ON sisa_limit_log(user_id, kategori, tanggal, tipe_limit);

COMMENT ON INDEX idx_sisa_log_unique_processing IS 
'Ensures each sisa accumulation period is processed only once per user/category/limit_type';

-- ============================================================
-- STEP 4: Add index for better cron job performance
-- ============================================================
-- This index speeds up the EXISTS check in the accumulation functions
CREATE INDEX IF NOT EXISTS idx_sisa_log_lookup 
ON sisa_limit_log(user_id, kategori, tanggal, tipe_limit);

COMMENT ON INDEX idx_sisa_log_lookup IS 
'Speeds up lookup of sisa processing logs for idempotency checks';

-- ============================================================
-- STEP 5: Verification queries (for manual checking)
-- ============================================================
-- Uncomment to run these queries manually to verify the fix:

-- Check for any remaining negative balances (should return 0 rows)
-- SELECT id, user_id, kategori, jumlah, is_sisa_amplop 
-- FROM pos_anggaran 
-- WHERE jumlah < 0;

-- Count how many envelopes were affected by the bug
-- SELECT COUNT(*) as fixed_envelopes
-- FROM pos_anggaran 
-- WHERE jumlah = 0 AND is_sisa_amplop = false;

-- Check sisa accumulation log for recent activity
-- SELECT COUNT(*) as recent_logs, 
--        COUNT(DISTINCT user_id) as users_with_logs,
--        MAX(tanggal) as most_recent_date
-- FROM sisa_limit_log
-- WHERE tanggal >= CURRENT_DATE - INTERVAL '7 days';

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Next steps:
-- 1. Verify no negative balances exist: SELECT * FROM pos_anggaran WHERE jumlah < 0;
-- 2. Monitor cron job logs: SELECT * FROM cron_execution_log ORDER BY started_at DESC LIMIT 5;
-- 3. Check that sisa accumulation is working correctly
-- 4. Verify constraint is enforced by attempting: UPDATE pos_anggaran SET jumlah = -100 WHERE id = <some_id>;
--    (should fail with constraint violation)
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 003_fix_sisa_negative_balance completed successfully';
    RAISE NOTICE 'All negative balances have been reset to 0';
    RAISE NOTICE 'Constraint check_positive_balance added to pos_anggaran table';
    RAISE NOTICE 'Unique index idx_sisa_log_unique_processing added for idempotency';
END $$;
