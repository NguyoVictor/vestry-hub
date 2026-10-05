-- pg_cron is managed by Supabase, no need to create extension

-- Unschedule existing job if it exists (idempotency)
DO $$
BEGIN
  PERFORM cron.unschedule('reset-monthly-credits');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- Schedule monthly credits reset on 1st of every month at midnight UTC
SELECT cron.schedule(
  'reset-monthly-credits',
  '0 0 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://crjdsxxkspvdwknrmijs.supabase.co/functions/v1/reset-monthly-credits',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer REDACTED_LEGACY_SERVICE_ROLE_KEY_ROTATE_REQUIRED"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Verify
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'reset-monthly-credits';