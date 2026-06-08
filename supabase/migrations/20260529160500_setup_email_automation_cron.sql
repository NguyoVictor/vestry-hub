-- Setup cron job for email automations
-- This will run the process-email-automations function daily at 8:00 AM UTC

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing cron job if it exists
SELECT cron.unschedule('process-email-automations') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-email-automations'
);

-- Schedule the email automation processing to run daily at 8:00 AM UTC
SELECT cron.schedule(
  'process-email-automations',
  '0 8 * * *', -- Daily at 8:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://crjdsxxkspvdwknrmijs.supabase.co/functions/v1/process-email-automations',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Grant necessary permissions for the cron job
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;