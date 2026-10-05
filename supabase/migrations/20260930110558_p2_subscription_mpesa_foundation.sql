-- P2 B4: server-authoritative Vestry subscription catalog + M-Pesa attempts.

create table if not exists public.subscription_catalog (
  product_code text primary key,
  product_type text not null check (product_type in ('plan', 'addon')),
  plan_key text,
  addon_key text,
  name text not null,
  amount_kes integer not null check (amount_kes >= 0),
  billing_period text not null default 'monthly' check (billing_period in ('monthly', 'one_time')),
  entitlements jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((product_type = 'plan' and plan_key is not null and addon_key is null)
      or (product_type = 'addon' and addon_key is not null and plan_key is null))
);

alter table public.subscription_catalog enable row level security;
drop policy if exists subscription_catalog_public_read on public.subscription_catalog;
create policy subscription_catalog_public_read on public.subscription_catalog
  for select to anon, authenticated using (active = true);
revoke all on public.subscription_catalog from anon, authenticated;
grant select on public.subscription_catalog to anon, authenticated;
grant select, insert, update, delete on public.subscription_catalog to service_role;

insert into public.subscription_catalog(product_code, product_type, plan_key, addon_key, name, amount_kes, billing_period, entitlements, sort_order)
values
('plan_free','plan','free',null,'Free',0,'monthly', '{"member_limit":100,"staff_limit":3,"branch_limit":1,"storage_limit_gb":2,"sms_credits":0,"email_credits":100,"ai_credits":0,"mpesa_giving":false,"sermon_ai":false}'::jsonb, 0),
('plan_basic','plan','basic',null,'Basic',2499,'monthly','{"member_limit":200,"staff_limit":7,"branch_limit":3,"storage_limit_gb":10,"sms_credits":100,"email_credits":500,"ai_credits":0,"mpesa_giving":true,"sermon_ai":false}'::jsonb,10),
('plan_growth','plan','growth',null,'Growth',8999,'monthly','{"member_limit":500,"staff_limit":15,"branch_limit":10,"storage_limit_gb":20,"sms_credits":500,"email_credits":2000,"ai_credits":50,"mpesa_giving":true,"sermon_ai":true}'::jsonb,20),
('plan_pro','plan','pro',null,'Pro',12499,'monthly','{"member_limit":2000,"staff_limit":30,"branch_limit":20,"storage_limit_gb":50,"sms_credits":2000,"email_credits":8000,"ai_credits":200,"mpesa_giving":true,"sermon_ai":true}'::jsonb,30),
('addon_members_100','addon',null,'member_addons','Extra Members',500,'one_time','{"addon_key":"member_addons","amount":100}'::jsonb,100),
('addon_sms_100','addon',null,'sms_addons','Extra SMS',100,'one_time','{"addon_key":"sms_addons","amount":100}'::jsonb,110),
('addon_email_500','addon',null,'email_addons','Extra Emails',100,'one_time','{"addon_key":"email_addons","amount":500}'::jsonb,120),
('addon_ai_20','addon',null,'ai_addons','Extra AI Credits',300,'one_time','{"addon_key":"ai_addons","amount":20}'::jsonb,130),
('addon_storage_5gb','addon',null,'storage_addons_gb','Extra Storage',200,'one_time','{"addon_key":"storage_addons_gb","amount":5}'::jsonb,140)
on conflict (product_code) do update set
  product_type = excluded.product_type,
  plan_key = excluded.plan_key,
  addon_key = excluded.addon_key,
  name = excluded.name,
  amount_kes = excluded.amount_kes,
  billing_period = excluded.billing_period,
  entitlements = excluded.entitlements,
  active = true,
  sort_order = excluded.sort_order,
  updated_at = now();

alter table public.tenant_subscriptions
  add column if not exists pending_plan text,
  add column if not exists downgrade_effective_at timestamptz;

create table if not exists public.subscription_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  product_code text not null references public.subscription_catalog(product_code),
  expected_amount integer not null check (expected_amount >= 0),
  phone text not null,
  merchant_request_id text,
  checkout_request_id text unique,
  status text not null default 'pending' check (status in ('pending','success','failed','cancelled','timeout')),
  result_code integer,
  result_desc text,
  mpesa_receipt text,
  raw_callback jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists subscription_payment_attempts_tenant_created_idx
  on public.subscription_payment_attempts(tenant_id, created_at desc);
create index if not exists subscription_payment_attempts_product_code_idx
  on public.subscription_payment_attempts(product_code);

alter table public.subscription_payment_attempts enable row level security;
drop policy if exists subscription_payment_attempts_tenant_read on public.subscription_payment_attempts;
create policy subscription_payment_attempts_tenant_read on public.subscription_payment_attempts
  for select to authenticated using (tenant_id::text = get_my_tenant_id()::text);
revoke all on public.subscription_payment_attempts from anon, authenticated;
grant select on public.subscription_payment_attempts to authenticated;
grant select, insert, update, delete on public.subscription_payment_attempts to service_role;

create or replace function public.apply_subscription_payment_callback(
  p_checkout_request_id text,
  p_result_code integer,
  p_result_desc text,
  p_amount numeric default null,
  p_receipt text default null,
  p_phone text default null,
  p_raw_callback jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt public.subscription_payment_attempts%rowtype;
  v_product public.subscription_catalog%rowtype;
  v_ent jsonb;
  v_addon_key text;
  v_addon_amount numeric;
  v_status text;
begin
  select * into v_attempt
  from public.subscription_payment_attempts
  where checkout_request_id = p_checkout_request_id
  for update;

  if not found then
    return jsonb_build_object('applied', false, 'reason', 'unknown_checkout');
  end if;

  if v_attempt.status = 'success' then
    return jsonb_build_object('applied', false, 'reason', 'already_success', 'attempt_id', v_attempt.id);
  end if;

  if coalesce(p_result_code, -1) <> 0 then
    v_status := case p_result_code when 1032 then 'cancelled' when 1037 then 'timeout' else 'failed' end;
    update public.subscription_payment_attempts
      set status = v_status, result_code = p_result_code, result_desc = p_result_desc,
          raw_callback = coalesce(p_raw_callback, '{}'::jsonb), updated_at = now(), completed_at = now()
      where id = v_attempt.id and status <> 'success';
    return jsonb_build_object('applied', false, 'reason', v_status, 'attempt_id', v_attempt.id);
  end if;

  if p_amount is null or round(p_amount::numeric, 0)::integer <> v_attempt.expected_amount then
    update public.subscription_payment_attempts
      set status = 'failed', result_code = p_result_code, result_desc = 'amount_mismatch',
          raw_callback = coalesce(p_raw_callback, '{}'::jsonb), updated_at = now(), completed_at = now()
      where id = v_attempt.id;
    return jsonb_build_object('applied', false, 'reason', 'amount_mismatch', 'attempt_id', v_attempt.id);
  end if;

  select * into v_product
  from public.subscription_catalog
  where product_code = v_attempt.product_code and active = true;
  if not found then
    raise exception 'catalog product not found';
  end if;
  v_ent := v_product.entitlements;

  if v_product.product_type = 'plan' then
    update public.tenant_subscriptions
    set plan = v_product.plan_key,
        status = 'active',
        member_limit = coalesce((v_ent->>'member_limit')::integer, member_limit),
        staff_limit = coalesce((v_ent->>'staff_limit')::integer, staff_limit),
        branch_limit = coalesce((v_ent->>'branch_limit')::integer, branch_limit),
        storage_limit_gb = coalesce((v_ent->>'storage_limit_gb')::numeric, storage_limit_gb),
        sms_credits = coalesce((v_ent->>'sms_credits')::integer, sms_credits),
        email_credits = coalesce((v_ent->>'email_credits')::integer, email_credits),
        ai_credits = coalesce((v_ent->>'ai_credits')::integer, ai_credits),
        current_period_start = now(),
        current_period_end = now() + interval '1 month',
        pending_plan = null,
        downgrade_effective_at = null,
        updated_at = now()
    where tenant_id = v_attempt.tenant_id;
  else
    v_addon_key := v_ent->>'addon_key';
    v_addon_amount := coalesce((v_ent->>'amount')::numeric, 0);
    case v_addon_key
      when 'member_addons' then update public.tenant_subscriptions set member_addons = member_addons + v_addon_amount::integer, updated_at = now() where tenant_id = v_attempt.tenant_id;
      when 'sms_addons' then update public.tenant_subscriptions set sms_addons = sms_addons + v_addon_amount::integer, updated_at = now() where tenant_id = v_attempt.tenant_id;
      when 'email_addons' then update public.tenant_subscriptions set email_addons = email_addons + v_addon_amount::integer, updated_at = now() where tenant_id = v_attempt.tenant_id;
      when 'ai_addons' then update public.tenant_subscriptions set ai_addons = ai_addons + v_addon_amount::integer, updated_at = now() where tenant_id = v_attempt.tenant_id;
      when 'storage_addons_gb' then update public.tenant_subscriptions set storage_addons_gb = storage_addons_gb + v_addon_amount, updated_at = now() where tenant_id = v_attempt.tenant_id;
      else raise exception 'unsupported addon key';
    end case;
  end if;

  insert into public.billing_history(
    tenant_id, transaction_type, description, amount, currency, payment_method,
    payment_reference, payment_status, plan_purchased, addon_type, addon_quantity
  ) values (
    v_attempt.tenant_id::text,
    case when v_product.product_type = 'plan' then 'upgrade' else 'addon' end,
    v_product.name,
    v_attempt.expected_amount,
    'KES', 'mpesa', p_receipt, 'completed',
    v_product.plan_key,
    v_product.addon_key,
    case when v_product.product_type = 'addon' then (v_ent->>'amount')::integer else null end
  );

  update public.subscription_payment_attempts
    set status = 'success', result_code = 0, result_desc = p_result_desc,
        mpesa_receipt = p_receipt, phone = coalesce(p_phone, phone),
        raw_callback = coalesce(p_raw_callback, '{}'::jsonb), updated_at = now(), completed_at = now()
    where id = v_attempt.id;

  return jsonb_build_object('applied', true, 'reason', 'success', 'attempt_id', v_attempt.id, 'product_code', v_attempt.product_code);
end;
$$;

revoke all on function public.apply_subscription_payment_callback(text, integer, text, numeric, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_subscription_payment_callback(text, integer, text, numeric, text, text, jsonb) to service_role;
