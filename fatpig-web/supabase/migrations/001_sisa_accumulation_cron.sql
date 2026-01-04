-- ============================================================
-- SISA AMPLOP ACCUMULATION CRON JOB
-- FATpig Application - Supabase PostgreSQL
-- ============================================================
-- Run this in Supabase SQL Editor
-- Make sure pg_cron extension is enabled first:
-- Dashboard -> Database -> Extensions -> Search "pg_cron" -> Enable
-- ============================================================

-- ============================================================
-- 1. CREATE CRON EXECUTION LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS cron_execution_log (
    id BIGSERIAL PRIMARY KEY,
    job_name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
    users_processed INT DEFAULT 0,
    envelopes_processed INT DEFAULT 0,
    days_processed INT DEFAULT 0,
    error_message TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying recent jobs
CREATE INDEX IF NOT EXISTS idx_cron_log_job_name ON cron_execution_log(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_log_started_at ON cron_execution_log(started_at DESC);

-- Enable RLS (optional - for admin access only)
ALTER TABLE cron_execution_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (drop first if exists for idempotency)
DROP POLICY IF EXISTS "Service role only" ON cron_execution_log;
CREATE POLICY "Service role only" ON cron_execution_log
    FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE cron_execution_log IS 'Tracks execution history of scheduled cron jobs';

-- ============================================================
-- 2. HELPER FUNCTION: Get spending on a specific date
-- ============================================================
CREATE OR REPLACE FUNCTION get_spending_on_date(
    p_user_id UUID,
    p_kategori TEXT,
    p_date DATE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total INT;
BEGIN
    SELECT COALESCE(SUM(nominal), 0) INTO v_total
    FROM transaksi
    WHERE user_id = p_user_id
      AND kategori = p_kategori
      AND tipe = 'pengeluaran'
      AND created_at >= p_date::timestamptz
      AND created_at < (p_date + INTERVAL '1 day')::timestamptz;
    
    RETURN v_total;
END;
$$;

-- ============================================================
-- 3. HELPER FUNCTION: Get spending in date range (for weekly)
-- ============================================================
CREATE OR REPLACE FUNCTION get_spending_in_range(
    p_user_id UUID,
    p_kategori TEXT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total INT;
BEGIN
    SELECT COALESCE(SUM(nominal), 0) INTO v_total
    FROM transaksi
    WHERE user_id = p_user_id
      AND kategori = p_kategori
      AND tipe = 'pengeluaran'
      AND created_at >= p_start_date::timestamptz
      AND created_at < (p_end_date + INTERVAL '1 day')::timestamptz;
    
    RETURN v_total;
END;
$$;

-- ============================================================
-- 4. HELPER FUNCTION: Transfer to/from Sisa envelope
-- ============================================================
CREATE OR REPLACE FUNCTION transfer_sisa_amplop(
    p_user_id UUID,
    p_kategori TEXT,
    p_amount INT  -- positive = add to sisa, negative = deduct from sisa
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sisa_kategori TEXT;
    v_existing_id BIGINT;
    v_existing_jumlah INT;
BEGIN
    v_sisa_kategori := 'Sisa-' || p_kategori;
    
    -- Check if Sisa envelope exists
    SELECT id, jumlah INTO v_existing_id, v_existing_jumlah
    FROM pos_anggaran
    WHERE user_id = p_user_id AND kategori = v_sisa_kategori;
    
    IF v_existing_id IS NOT NULL THEN
        -- Update existing Sisa envelope
        UPDATE pos_anggaran
        SET jumlah = GREATEST(jumlah + p_amount, 0)  -- Prevent negative
        WHERE id = v_existing_id;
    ELSIF p_amount > 0 THEN
        -- Create new Sisa envelope only if adding (not deducting)
        INSERT INTO pos_anggaran (user_id, kategori, jumlah, tipe_batas, is_sisa_amplop, batas_nominal)
        VALUES (p_user_id, v_sisa_kategori, p_amount, 'Tidak Ada', true, 0);
    END IF;
END;
$$;

-- ============================================================
-- 5. MAIN FUNCTION: Process Daily/Weekday/Weekend Accumulation
-- ============================================================
CREATE OR REPLACE FUNCTION process_sisa_harian()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_user RECORD;
    r_amplop RECORD;
    v_check_date DATE;
    v_day_of_week INT;
    v_is_weekend BOOLEAN;
    v_total_spent INT;
    v_sisa INT;
    v_available_balance INT;
    v_actual_transfer INT;
    v_sisa_envelope_balance INT;
    v_actual_refund INT;
    v_users_count INT := 0;
    v_envelopes_count INT := 0;
    v_days_count INT := 0;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Loop through all users with akumulasi_sisa enabled
    FOR r_user IN 
        SELECT id FROM profiles WHERE akumulasi_sisa = true
    LOOP
        v_users_count := v_users_count + 1;
        
        -- Loop through all envelopes with daily-type limits
        FOR r_amplop IN
            SELECT * FROM pos_anggaran
            WHERE user_id = r_user.id
              AND tipe_batas IN ('Harian', 'Weekday', 'Weekend')
              AND (is_sisa_amplop = false OR is_sisa_amplop IS NULL)
        LOOP
            v_envelopes_count := v_envelopes_count + 1;
            
            -- Process last 90 days (excluding today)
            FOR i IN 1..90 LOOP
                v_check_date := v_today - i;
                v_day_of_week := EXTRACT(DOW FROM v_check_date)::INT; -- 0=Sun, 6=Sat
                v_is_weekend := v_day_of_week IN (0, 6);
                
                -- Skip if before limit_set_date
                IF r_amplop.limit_set_date IS NOT NULL 
                   AND v_check_date < r_amplop.limit_set_date::date THEN
                    CONTINUE;
                END IF;
                
                -- Skip based on limit type vs day type
                IF r_amplop.tipe_batas = 'Weekday' AND v_is_weekend THEN
                    CONTINUE;
                END IF;
                IF r_amplop.tipe_batas = 'Weekend' AND NOT v_is_weekend THEN
                    CONTINUE;
                END IF;
                
                -- Skip if already processed (idempotent)
                IF EXISTS (
                    SELECT 1 FROM sisa_limit_log
                    WHERE user_id = r_user.id
                      AND kategori = r_amplop.kategori
                      AND tanggal = v_check_date
                      AND tipe_limit = r_amplop.tipe_batas
                ) THEN
                    CONTINUE;
                END IF;
                
                -- Calculate total spent on that date
                v_total_spent := get_spending_on_date(r_user.id, r_amplop.kategori, v_check_date);
                
                -- Calculate sisa (remainder)
                v_sisa := r_amplop.batas_nominal - v_total_spent;
                
                -- Process based on sisa value
                IF v_sisa > 0 THEN
                    -- Underspent: reduce main envelope, add to Sisa envelope
                    -- Check available balance with error handling
                    BEGIN
                        SELECT jumlah INTO v_available_balance
                        FROM pos_anggaran
                        WHERE id = r_amplop.id;
                        
                        -- Calculate actual transfer (only transfer what's available)
                        v_actual_transfer := LEAST(v_sisa, GREATEST(v_available_balance, 0));
                        
                        -- Only process if there's something to transfer
                        IF v_actual_transfer > 0 THEN
                            UPDATE pos_anggaran
                            SET jumlah = jumlah - v_actual_transfer
                            WHERE id = r_amplop.id;
                            
                            PERFORM transfer_sisa_amplop(r_user.id, r_amplop.kategori, v_actual_transfer);
                        END IF;
                    EXCEPTION
                        WHEN NO_DATA_FOUND THEN
                            -- Envelope was deleted, skip processing
                            v_actual_transfer := 0;
                    END;
                    
                ELSIF v_sisa < 0 THEN
                    -- Overspent: deduct from Sisa envelope, refund to main
                    -- Check Sisa envelope balance before refunding
                    BEGIN
                        SELECT jumlah INTO v_sisa_envelope_balance
                        FROM pos_anggaran
                        WHERE user_id = r_user.id
                          AND kategori = 'Sisa-' || r_amplop.kategori;
                        
                        -- Only refund what's available in Sisa envelope
                        v_actual_refund := LEAST(ABS(v_sisa), GREATEST(v_sisa_envelope_balance, 0));
                        
                        IF v_actual_refund > 0 THEN
                            PERFORM transfer_sisa_amplop(r_user.id, r_amplop.kategori, -v_actual_refund);
                            
                            UPDATE pos_anggaran
                            SET jumlah = jumlah + v_actual_refund
                            WHERE id = r_amplop.id;
                        END IF;
                    EXCEPTION
                        WHEN NO_DATA_FOUND THEN
                            -- Sisa envelope doesn't exist, nothing to refund
                            NULL;
                    END;
                END IF;
                
                -- Log the processing with actual transferred amount
                -- For underspent: log v_actual_transfer (or v_sisa if not set)
                -- For overspent: log -v_actual_refund (or v_sisa if not set)
                INSERT INTO sisa_limit_log (user_id, kategori, tanggal, tipe_limit, batas_nominal, terpakai, sisa)
                VALUES (r_user.id, r_amplop.kategori, v_check_date, r_amplop.tipe_batas, r_amplop.batas_nominal, v_total_spent, 
                    CASE 
                        WHEN v_sisa > 0 THEN COALESCE(v_actual_transfer, 0)
                        WHEN v_sisa < 0 THEN -COALESCE(v_actual_refund, 0)
                        ELSE 0
                    END);
                
                v_days_count := v_days_count + 1;
                
            END LOOP; -- days
        END LOOP; -- envelopes
    END LOOP; -- users
    
    RETURN jsonb_build_object(
        'type', 'harian',
        'users_processed', v_users_count,
        'envelopes_processed', v_envelopes_count,
        'days_processed', v_days_count
    );
END;
$$;

-- ============================================================
-- 6. MAIN FUNCTION: Process Weekly (Mingguan) Accumulation
-- ============================================================
CREATE OR REPLACE FUNCTION process_sisa_mingguan()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_user RECORD;
    r_amplop RECORD;
    v_week_start DATE;
    v_week_end DATE;
    v_total_spent INT;
    v_sisa INT;
    v_available_balance INT;
    v_actual_transfer INT;
    v_sisa_envelope_balance INT;
    v_actual_refund INT;
    v_users_count INT := 0;
    v_envelopes_count INT := 0;
    v_weeks_count INT := 0;
    v_today DATE := CURRENT_DATE;
    v_current_week_monday DATE;
BEGIN
    -- Calculate current week's Monday
    v_current_week_monday := v_today - EXTRACT(DOW FROM v_today)::INT + 1;
    -- Adjust if today is Sunday (DOW = 0)
    IF EXTRACT(DOW FROM v_today) = 0 THEN
        v_current_week_monday := v_today - 6;
    END IF;
    
    -- Loop through all users with akumulasi_sisa enabled
    FOR r_user IN 
        SELECT id FROM profiles WHERE akumulasi_sisa = true
    LOOP
        v_users_count := v_users_count + 1;
        
        -- Loop through all envelopes with weekly limit
        FOR r_amplop IN
            SELECT * FROM pos_anggaran
            WHERE user_id = r_user.id
              AND tipe_batas = 'Mingguan'
              AND (is_sisa_amplop = false OR is_sisa_amplop IS NULL)
        LOOP
            v_envelopes_count := v_envelopes_count + 1;
            
            -- Process last 12 completed weeks (about 3 months)
            FOR i IN 1..12 LOOP
                -- Calculate the Monday of the week to process
                v_week_start := v_current_week_monday - (i * 7);
                v_week_end := v_week_start + 6; -- Sunday
                
                -- Skip if week is not completed (includes today)
                IF v_week_end >= v_today THEN
                    CONTINUE;
                END IF;
                
                -- Skip if before limit_set_date
                IF r_amplop.limit_set_date IS NOT NULL 
                   AND v_week_start < r_amplop.limit_set_date::date THEN
                    CONTINUE;
                END IF;
                
                -- Skip if already processed (use Monday as identifier)
                IF EXISTS (
                    SELECT 1 FROM sisa_limit_log
                    WHERE user_id = r_user.id
                      AND kategori = r_amplop.kategori
                      AND tanggal = v_week_start
                      AND tipe_limit = 'Mingguan'
                ) THEN
                    CONTINUE;
                END IF;
                
                -- Calculate total spent in that week
                v_total_spent := get_spending_in_range(r_user.id, r_amplop.kategori, v_week_start, v_week_end);
                
                -- Calculate sisa (remainder)
                v_sisa := r_amplop.batas_nominal - v_total_spent;
                
                -- Process based on sisa value
                IF v_sisa > 0 THEN
                    -- Underspent: reduce main envelope, add to Sisa envelope
                    -- Check available balance with error handling
                    BEGIN
                        SELECT jumlah INTO v_available_balance
                        FROM pos_anggaran
                        WHERE id = r_amplop.id;
                        
                        -- Calculate actual transfer (only transfer what's available)
                        v_actual_transfer := LEAST(v_sisa, GREATEST(v_available_balance, 0));
                        
                        -- Only process if there's something to transfer
                        IF v_actual_transfer > 0 THEN
                            UPDATE pos_anggaran
                            SET jumlah = jumlah - v_actual_transfer
                            WHERE id = r_amplop.id;
                            
                            PERFORM transfer_sisa_amplop(r_user.id, r_amplop.kategori, v_actual_transfer);
                        END IF;
                    EXCEPTION
                        WHEN NO_DATA_FOUND THEN
                            -- Envelope was deleted, skip processing
                            v_actual_transfer := 0;
                    END;
                    
                ELSIF v_sisa < 0 THEN
                    -- Overspent: deduct from Sisa envelope, refund to main
                    -- Check Sisa envelope balance before refunding
                    BEGIN
                        SELECT jumlah INTO v_sisa_envelope_balance
                        FROM pos_anggaran
                        WHERE user_id = r_user.id
                          AND kategori = 'Sisa-' || r_amplop.kategori;
                        
                        -- Only refund what's available in Sisa envelope
                        v_actual_refund := LEAST(ABS(v_sisa), GREATEST(v_sisa_envelope_balance, 0));
                        
                        IF v_actual_refund > 0 THEN
                            PERFORM transfer_sisa_amplop(r_user.id, r_amplop.kategori, -v_actual_refund);
                            
                            UPDATE pos_anggaran
                            SET jumlah = jumlah + v_actual_refund
                            WHERE id = r_amplop.id;
                        END IF;
                    EXCEPTION
                        WHEN NO_DATA_FOUND THEN
                            -- Sisa envelope doesn't exist, nothing to refund
                            NULL;
                    END;
                END IF;
                
                -- Log the processing with actual transferred amount (use Monday as tanggal)
                INSERT INTO sisa_limit_log (user_id, kategori, tanggal, tipe_limit, batas_nominal, terpakai, sisa)
                VALUES (r_user.id, r_amplop.kategori, v_week_start, 'Mingguan', r_amplop.batas_nominal, v_total_spent,
                    CASE 
                        WHEN v_sisa > 0 THEN COALESCE(v_actual_transfer, 0)
                        WHEN v_sisa < 0 THEN -COALESCE(v_actual_refund, 0)
                        ELSE 0
                    END);
                
                v_weeks_count := v_weeks_count + 1;
                
            END LOOP; -- weeks
        END LOOP; -- envelopes
    END LOOP; -- users
    
    RETURN jsonb_build_object(
        'type', 'mingguan',
        'users_processed', v_users_count,
        'envelopes_processed', v_envelopes_count,
        'weeks_processed', v_weeks_count
    );
END;
$$;

-- ============================================================
-- 7. WRAPPER FUNCTION: Main job with logging
-- ============================================================
CREATE OR REPLACE FUNCTION run_sisa_accumulation_job()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id BIGINT;
    v_harian_result JSONB;
    v_mingguan_result JSONB;
    v_total_users INT := 0;
    v_total_envelopes INT := 0;
    v_total_days INT := 0;
    v_error_msg TEXT;
BEGIN
    -- Insert initial log entry
    INSERT INTO cron_execution_log (job_name, status)
    VALUES ('sisa_accumulation', 'running')
    RETURNING id INTO v_log_id;
    
    BEGIN
        -- Process daily accumulation
        v_harian_result := process_sisa_harian();
        
        -- Process weekly accumulation
        v_mingguan_result := process_sisa_mingguan();
        
        -- Calculate totals
        v_total_users := GREATEST(
            (v_harian_result->>'users_processed')::INT,
            (v_mingguan_result->>'users_processed')::INT
        );
        v_total_envelopes := (v_harian_result->>'envelopes_processed')::INT + 
                             (v_mingguan_result->>'envelopes_processed')::INT;
        v_total_days := (v_harian_result->>'days_processed')::INT + 
                        COALESCE((v_mingguan_result->>'weeks_processed')::INT, 0);
        
        -- Update log with success
        UPDATE cron_execution_log
        SET finished_at = NOW(),
            status = 'success',
            users_processed = v_total_users,
            envelopes_processed = v_total_envelopes,
            days_processed = v_total_days,
            details = jsonb_build_object(
                'harian', v_harian_result,
                'mingguan', v_mingguan_result
            )
        WHERE id = v_log_id;
        
    EXCEPTION WHEN OTHERS THEN
        -- Get error message
        v_error_msg := SQLERRM;
        
        -- Update log with error
        UPDATE cron_execution_log
        SET finished_at = NOW(),
            status = 'error',
            error_message = v_error_msg,
            details = jsonb_build_object(
                'error_detail', SQLSTATE,
                'error_hint', v_error_msg
            )
        WHERE id = v_log_id;
        
        -- Re-raise the error
        RAISE;
    END;
END;
$$;

-- ============================================================
-- 8. MANUAL TRIGGER FUNCTION (can be called from client)
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_sisa_accumulation_manual(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_harian_result JSONB;
    v_mingguan_result JSONB;
BEGIN
    -- Check if user has feature enabled
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = p_user_id AND akumulasi_sisa = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Fitur akumulasi sisa dinonaktifkan'
        );
    END IF;
    
    -- For manual trigger, we process only this user
    -- This is a simplified version - you could create user-specific functions
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Gunakan proses otomatis harian. Manual trigger hanya untuk admin.'
    );
END;
$$;

-- ============================================================
-- 9. VIEW: Recent cron job executions
-- ============================================================
CREATE OR REPLACE VIEW v_recent_cron_jobs AS
SELECT 
    id,
    job_name,
    started_at,
    finished_at,
    EXTRACT(EPOCH FROM (finished_at - started_at))::INT AS duration_seconds,
    status,
    users_processed,
    envelopes_processed,
    days_processed,
    error_message,
    details
FROM cron_execution_log
ORDER BY started_at DESC
LIMIT 100;

-- ============================================================
-- 10. SETUP PG_CRON SCHEDULE
-- ============================================================
-- NOTE: Run this AFTER enabling pg_cron extension in Supabase Dashboard
-- Dashboard -> Database -> Extensions -> Search "pg_cron" -> Enable

-- Schedule daily at 00:05 WIB (17:05 UTC previous day for UTC+7)
-- Adjust based on your Supabase project timezone
SELECT cron.schedule(
    'daily-sisa-accumulation',           -- unique job name
    '5 17 * * *',                         -- 00:05 WIB = 17:05 UTC (previous day)
    'SELECT run_sisa_accumulation_job()'  -- function to execute
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule a job:
-- SELECT cron.unschedule('daily-sisa-accumulation');

-- ============================================================
-- 11. GRANT PERMISSIONS
-- ============================================================
-- Grant execute to authenticated users for manual trigger
GRANT EXECUTE ON FUNCTION trigger_sisa_accumulation_manual(UUID) TO authenticated;

-- Grant select on view to authenticated (for admin dashboard)
GRANT SELECT ON v_recent_cron_jobs TO authenticated;

-- ============================================================
-- TEST: Run manually to verify
-- ============================================================
-- Uncomment to test:
-- SELECT run_sisa_accumulation_job();
-- SELECT * FROM v_recent_cron_jobs;
