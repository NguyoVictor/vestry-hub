do $$
begin
  perform cron.unschedule('reset-monthly-credits');
  perform cron.schedule(
    'reset-monthly-credits',
    '0 0 1 * *',
    $cron$
      select net.http_post(
        url := 'https://crjdsxxkspvdwknrmijs.supabase.co/functions/v1/reset-monthly-credits',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'vestry_internal_service_role_jwt'
            limit 1
          )
        ),
        body := '{}'::jsonb
      );
    $cron$
  );
end $$;;
