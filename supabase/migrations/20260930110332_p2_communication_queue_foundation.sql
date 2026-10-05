-- P2 B2: durable communication queues + concurrency-safe credit reservation.
-- Queue internals stay server-only; browser clients never receive pgmq grants.

create extension if not exists pgmq;

select pgmq.create('outbound_email')
where not exists (select 1 from pgmq.meta where queue_name = 'outbound_email');

select pgmq.create('outbound_sms')
where not exists (select 1 from pgmq.meta where queue_name = 'outbound_sms');

alter table public.tenant_subscriptions
  add column if not exists email_reserved integer not null default 0,
  add column if not exists sms_reserved integer not null default 0;

alter table public.tenant_subscriptions
  drop constraint if exists tenant_subscriptions_email_reserved_nonnegative,
  add constraint tenant_subscriptions_email_reserved_nonnegative check (email_reserved >= 0),
  drop constraint if exists tenant_subscriptions_sms_reserved_nonnegative,
  add constraint tenant_subscriptions_sms_reserved_nonnegative check (sms_reserved >= 0);

create table if not exists public.communication_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  channel text not null check (channel in ('email', 'sms')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'partial', 'failed', 'cancelled')),
  payload jsonb not null default '{}'::jsonb,
  reserved_credits integer not null default 0 check (reserved_credits >= 0),
  delivered_count integer not null default 0 check (delivered_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  provider_ref text,
  last_error text,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communication_jobs_tenant_created_idx
  on public.communication_jobs (tenant_id, created_at desc);
create index if not exists communication_jobs_status_schedule_idx
  on public.communication_jobs (status, scheduled_at, created_at);

create table if not exists public.communication_job_recipients (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.communication_jobs(id) on delete cascade,
  tenant_id uuid not null,
  destination text not null,
  display_name text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  provider_ref text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, destination)
);

create index if not exists communication_job_recipients_job_status_idx
  on public.communication_job_recipients (job_id, status);

alter table public.communication_job_recipients enable row level security;
drop policy if exists communication_job_recipients_no_client_access on public.communication_job_recipients;
create policy communication_job_recipients_no_client_access on public.communication_job_recipients as restrictive for all to anon, authenticated using (false) with check (false);
revoke all on table public.communication_job_recipients from public, anon, authenticated;
grant select, insert, update, delete on table public.communication_job_recipients to service_role;


alter table public.sms_history
  add column if not exists communication_job_id uuid references public.communication_jobs(id) on delete set null;

create unique index if not exists sms_history_communication_job_uidx
  on public.sms_history (communication_job_id)
  where communication_job_id is not null;

alter table public.communication_jobs enable row level security;
drop policy if exists communication_jobs_no_client_access on public.communication_jobs;
create policy communication_jobs_no_client_access on public.communication_jobs as restrictive for all to anon, authenticated using (false) with check (false);
revoke all on table public.communication_jobs from public, anon, authenticated;
grant select, insert, update, delete on table public.communication_jobs to service_role;

create or replace function public.reserve_communication_credits(
  p_tenant_id uuid,
  p_channel text,
  p_credits integer,
  p_payload jsonb,
  p_scheduled_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pgmq, pg_temp
as $$
declare
  v_sub public.tenant_subscriptions%rowtype;
  v_limit integer;
  v_consumed integer;
  v_job_id uuid;
  v_queue text;
begin
  if p_channel not in ('email', 'sms') then
    raise exception 'unsupported communication channel';
  end if;
  if p_credits < 0 then
    raise exception 'credits cannot be negative';
  end if;

  select * into v_sub
  from public.tenant_subscriptions
  where tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception 'subscription not found';
  end if;

  if p_channel = 'email' then
    v_limit := coalesce(v_sub.email_credits, 0) + coalesce(v_sub.email_addons, 0);
    v_consumed := coalesce(v_sub.email_used, 0) + coalesce(v_sub.email_reserved, 0);
    if v_consumed + p_credits > v_limit then
      raise exception 'email credit limit reached' using errcode = 'P0001';
    end if;
    update public.tenant_subscriptions
      set email_reserved = email_reserved + p_credits, updated_at = now()
      where tenant_id = p_tenant_id;
    v_queue := 'outbound_email';
  else
    v_limit := coalesce(v_sub.sms_credits, 0) + coalesce(v_sub.sms_addons, 0);
    v_consumed := coalesce(v_sub.sms_used, 0) + coalesce(v_sub.sms_reserved, 0);
    if v_consumed + p_credits > v_limit then
      raise exception 'sms credit limit reached' using errcode = 'P0001';
    end if;
    update public.tenant_subscriptions
      set sms_reserved = sms_reserved + p_credits, updated_at = now()
      where tenant_id = p_tenant_id;
    v_queue := 'outbound_sms';
  end if;

  insert into public.communication_jobs(tenant_id, channel, payload, reserved_credits, scheduled_at)
  values (p_tenant_id, p_channel, coalesce(p_payload, '{}'::jsonb), p_credits, p_scheduled_at)
  returning id into v_job_id;

  perform pgmq.send(
    v_queue,
    jsonb_build_object('job_id', v_job_id),
    greatest(0, floor(extract(epoch from (coalesce(p_scheduled_at, now()) - now())))::integer)
  );

  return v_job_id;
end;
$$;

create or replace function public.finalize_communication_job(
  p_job_id uuid,
  p_delivered_count integer,
  p_failed_count integer,
  p_provider_ref text default null,
  p_last_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.communication_jobs%rowtype;
  v_delivered integer := greatest(coalesce(p_delivered_count, 0), 0);
  v_failed integer := greatest(coalesce(p_failed_count, 0), 0);
  v_billed integer;
  v_final_status text;
begin
  select * into v_job
  from public.communication_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'communication job not found';
  end if;

  if v_job.status in ('completed', 'partial', 'failed', 'cancelled') then
    return jsonb_build_object('id', v_job.id, 'status', v_job.status, 'idempotent', true);
  end if;

  v_billed := least(v_delivered, v_job.reserved_credits);
  if v_job.channel = 'email' then
    update public.tenant_subscriptions
      set email_reserved = greatest(email_reserved - v_job.reserved_credits, 0),
          email_used = email_used + v_billed,
          updated_at = now()
      where tenant_id = v_job.tenant_id;
  else
    update public.tenant_subscriptions
      set sms_reserved = greatest(sms_reserved - v_job.reserved_credits, 0),
          sms_used = sms_used + v_billed,
          updated_at = now()
      where tenant_id = v_job.tenant_id;
  end if;

  v_final_status := case
    when v_delivered = 0 then 'failed'
    when v_failed > 0 then 'partial'
    else 'completed'
  end;

  update public.communication_jobs
  set status = v_final_status,
      delivered_count = v_delivered,
      failed_count = v_failed,
      provider_ref = coalesce(p_provider_ref, provider_ref),
      last_error = p_last_error,
      completed_at = now(),
      updated_at = now()
  where id = p_job_id;

  return jsonb_build_object('id', p_job_id, 'status', v_final_status, 'idempotent', false);
end;
$$;

create or replace function public.release_communication_job(
  p_job_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.communication_jobs%rowtype;
begin
  select * into v_job
  from public.communication_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'communication job not found';
  end if;

  if v_job.status in ('completed', 'partial', 'failed', 'cancelled') then
    return jsonb_build_object('id', v_job.id, 'status', v_job.status, 'idempotent', true);
  end if;

  if v_job.channel = 'email' then
    update public.tenant_subscriptions
      set email_reserved = greatest(email_reserved - v_job.reserved_credits, 0), updated_at = now()
      where tenant_id = v_job.tenant_id;
  else
    update public.tenant_subscriptions
      set sms_reserved = greatest(sms_reserved - v_job.reserved_credits, 0), updated_at = now()
      where tenant_id = v_job.tenant_id;
  end if;

  update public.communication_jobs
  set status = 'cancelled', last_error = p_reason, completed_at = now(), updated_at = now()
  where id = p_job_id;

  return jsonb_build_object('id', p_job_id, 'status', 'cancelled', 'idempotent', false);
end;
$$;

create or replace function public.claim_communication_jobs(
  p_channel text,
  p_visibility_seconds integer default 120,
  p_batch_size integer default 10
)
returns table(msg_id bigint, read_ct bigint, enqueued_at timestamptz, vt timestamptz, message jsonb)
language sql
security definer
set search_path = public, pgmq, pg_temp
as $$
  select r.msg_id, r.read_ct, r.enqueued_at, r.vt, r.message
  from pgmq.read(
    case when p_channel = 'email' then 'outbound_email' else 'outbound_sms' end,
    greatest(p_visibility_seconds, 30),
    greatest(1, least(p_batch_size, 50))
  ) r
  where p_channel in ('email', 'sms');
$$;

create or replace function public.ack_communication_job(
  p_channel text,
  p_msg_id bigint
)
returns boolean
language sql
security definer
set search_path = public, pgmq, pg_temp
as $$
  select pgmq.delete(
    case when p_channel = 'email' then 'outbound_email' else 'outbound_sms' end,
    p_msg_id
  )
  where p_channel in ('email', 'sms');
$$;

revoke all on function public.reserve_communication_credits(uuid, text, integer, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.finalize_communication_job(uuid, integer, integer, text, text) from public, anon, authenticated;
revoke all on function public.release_communication_job(uuid, text) from public, anon, authenticated;
revoke all on function public.claim_communication_jobs(text, integer, integer) from public, anon, authenticated;
revoke all on function public.ack_communication_job(text, bigint) from public, anon, authenticated;

grant execute on function public.reserve_communication_credits(uuid, text, integer, jsonb, timestamptz) to service_role;
grant execute on function public.finalize_communication_job(uuid, integer, integer, text, text) to service_role;
grant execute on function public.release_communication_job(uuid, text) to service_role;
grant execute on function public.claim_communication_jobs(text, integer, integer) to service_role;
grant execute on function public.ack_communication_job(text, bigint) to service_role;
