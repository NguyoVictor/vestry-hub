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
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyamRzeHhrc3B2ZHdrbnJtaWpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM0NTA5NSwiZXhwIjoyMDg2OTIxMDk1fQ.Ej5ApBSPWhuFYJhGJOJOtJhSVNlNNpJE-Ej5ApBSPWhuFYJhGJOJOtJhSVNlNNpJE"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Verify
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'reset-monthly-credits';