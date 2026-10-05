-- P2 B2/B3 final queue-worker authentication.
-- Cron holds a random worker token in Vault. Only its SHA-256 hash is stored in a locked table.

create table if not exists public.internal_worker_auth (
  worker_name text primary key,
  token_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.internal_worker_auth enable row level security;
drop policy if exists internal_worker_auth_no_client_access on public.internal_worker_auth;
create policy internal_worker_auth_no_client_access
  on public.internal_worker_auth as restrictive for all to anon, authenticated
  using (false) with check (false);
revoke all on public.internal_worker_auth from public, anon, authenticated;
grant select, insert, update, delete on public.internal_worker_auth to service_role;

do $$
declare
  v_token text;
  v_secret_id uuid;
begin
  select id into v_secret_id from vault.secrets where name = 'vestry_queue_worker_token' limit 1;
  if v_secret_id is null then
    v_token := encode(extensions.gen_random_bytes(32), 'hex');
    perform vault.create_secret(v_token, 'vestry_queue_worker_token', 'Random token used only for protected communication queue worker cron calls');
  else
    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where name = 'vestry_queue_worker_token'
    limit 1;
  end if;

  if v_token is null or length(v_token) < 40 then
    raise exception 'Could not establish a secure queue worker token';
  end if;

  insert into public.internal_worker_auth(worker_name, token_hash, updated_at)
  values ('communication_queue', encode(extensions.digest(v_token, 'sha256'), 'hex'), now())
  on conflict (worker_name) do update
    set token_hash = excluded.token_hash,
        updated_at = now();

  perform cron.unschedule('process-email-queue') where exists (select 1 from cron.job where jobname = 'process-email-queue');
  perform cron.unschedule('process-sms-queue') where exists (select 1 from cron.job where jobname = 'process-sms-queue');

  perform cron.schedule(
    'process-email-queue', '* * * * *',
    $cron$
      select net.http_post(
        url := 'https://crjdsxxkspvdwknrmijs.supabase.co/functions/v1/process-email-queue',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-vestry-worker-token', (select decrypted_secret from vault.decrypted_secrets where name = 'vestry_queue_worker_token' limit 1)
        ),
        body := '{}'::jsonb
      );
    $cron$
  );

  perform cron.schedule(
    'process-sms-queue', '* * * * *',
    $cron$
      select net.http_post(
        url := 'https://crjdsxxkspvdwknrmijs.supabase.co/functions/v1/process-sms-queue',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-vestry-worker-token', (select decrypted_secret from vault.decrypted_secrets where name = 'vestry_queue_worker_token' limit 1)
        ),
        body := '{}'::jsonb
      );
    $cron$
  );
end $$;
