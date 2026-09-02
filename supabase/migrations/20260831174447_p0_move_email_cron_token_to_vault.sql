do $$
declare
  v_command text;
  v_token text;
  v_secret_id uuid;
begin
  select command into v_command
  from cron.job
  where jobname = 'process-email-automations'
  limit 1;

  if v_command is null then
    raise exception 'process-email-automations cron job not found';
  end if;

  select (regexp_match(v_command, 'Bearer ([A-Za-z0-9._-]+)'))[1] into v_token;
  if v_token is null or length(v_token) < 40 then
    raise exception 'Could not safely extract existing cron authorization token';
  end if;

  select id into v_secret_id from vault.secrets where name = 'vestry_internal_service_role_jwt' limit 1;
  if v_secret_id is null then
    perform vault.create_secret(v_token, 'vestry_internal_service_role_jwt', 'Privileged token used only by internal scheduled Edge Function calls');
  else
    perform vault.update_secret(v_secret_id, v_token, 'vestry_internal_service_role_jwt', 'Privileged token used only by internal scheduled Edge Function calls');
  end if;

  perform cron.unschedule('process-email-automations');
  perform cron.schedule(
    'process-email-automations',
    '0 8 * * *',
    $cron$
      select net.http_post(
        url := 'https://crjdsxxkspvdwknrmijs.supabase.co/functions/v1/process-email-automations',
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
