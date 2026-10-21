
-- ============================================================
-- Monthly Credits Cron Security
-- Migration: 20260831174526
-- ============================================================
--
-- Do not schedule production Edge Function endpoints
-- from a staging database.
--
-- Disable the legacy reset job.
-- Reconfigure it separately with environment-specific
-- endpoint and Vault credentials after verification.
-- ============================================================

DO $migration$
DECLARE
    v_job RECORD;
BEGIN
    IF to_regclass('cron.job') IS NULL THEN
        RAISE NOTICE
            'pg_cron jobs table not found; no credit reset job to disable';
        RETURN;
    END IF;

    FOR v_job IN
        SELECT jobid
        FROM cron.job
        WHERE jobname = 'reset-monthly-credits'
    LOOP
        PERFORM cron.unschedule(v_job.jobid);

        RAISE NOTICE
            'Disabled legacy monthly credits cron job %',
            v_job.jobid;
    END LOOP;

    RAISE NOTICE
        'Monthly credits cron remains disabled pending secure staging configuration';
END;
$migration$;
