
-- ============================================================
-- Email Automation Cron Security
-- Migration: 20260831174447
-- ============================================================
--
-- The original migration attempted to extract a service-role
-- token from an existing cron command and rescheduled a
-- production Edge Function URL.
--
-- Credentials must be provisioned independently per environment.
-- Do not copy tokens from an existing cron job.
-- Do not schedule production URLs from staging.
--
-- Disable the legacy job until secure environment-specific
-- configuration is completed.
-- ============================================================

DO $migration$
DECLARE
    v_job RECORD;
BEGIN
    IF to_regclass('cron.job') IS NULL THEN
        RAISE NOTICE
            'pg_cron jobs table not found; no email job to disable';
        RETURN;
    END IF;

    FOR v_job IN
        SELECT jobid
        FROM cron.job
        WHERE jobname = 'process-email-automations'
    LOOP
        PERFORM cron.unschedule(v_job.jobid);

        RAISE NOTICE
            'Disabled legacy email automation cron job %',
            v_job.jobid;
    END LOOP;

    RAISE NOTICE
        'Email automation cron remains disabled pending secure staging configuration';
END;
$migration$;
