begin;

create table if not exists public.tenant_payment_credentials (
  tenant_id varchar primary key references public.tenants(id) on delete cascade,
  daraja_consumer_key text null,
  daraja_consumer_secret text null,
  daraja_passkey text null,
  daraja_transaction_type text not null default 'CustomerPayBillOnline',
  daraja_shortcode varchar null,
  mpesa_callback_secret text not null default encode(gen_random_bytes(32), 'hex'),
  c2b_callback_secret text not null default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tenant_payment_credentials enable row level security;
revoke all on table public.tenant_payment_credentials from public, anon, authenticated;
grant select, insert, update, delete on table public.tenant_payment_credentials to service_role;

insert into public.tenant_payment_credentials (tenant_id,daraja_consumer_key,daraja_consumer_secret,daraja_passkey,daraja_transaction_type,daraja_shortcode)
select t.id,t.daraja_consumer_key,t.daraja_consumer_secret,t.daraja_passkey,coalesce(t.daraja_transaction_type,'CustomerPayBillOnline'),t.payhero_channel_number
from public.tenants t
on conflict (tenant_id) do update set
  daraja_consumer_key = coalesce(excluded.daraja_consumer_key, public.tenant_payment_credentials.daraja_consumer_key),
  daraja_consumer_secret = coalesce(excluded.daraja_consumer_secret, public.tenant_payment_credentials.daraja_consumer_secret),
  daraja_passkey = coalesce(excluded.daraja_passkey, public.tenant_payment_credentials.daraja_passkey),
  daraja_transaction_type = coalesce(excluded.daraja_transaction_type, public.tenant_payment_credentials.daraja_transaction_type),
  daraja_shortcode = coalesce(excluded.daraja_shortcode, public.tenant_payment_credentials.daraja_shortcode),
  updated_at = now();

create index if not exists tenant_payment_credentials_shortcode_idx on public.tenant_payment_credentials (daraja_shortcode) where daraja_shortcode is not null;

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(), provider text not null, event_key text not null,
  tenant_id varchar null references public.tenants(id) on delete set null,
  payload_hash text null,
  processing_status text not null default 'processed' check (processing_status in ('processing','processed','ignored','failed')),
  error_message text null, created_at timestamptz not null default now(), processed_at timestamptz null,
  unique (provider,event_key)
);
alter table public.webhook_events enable row level security;
revoke all on table public.webhook_events from public, anon, authenticated;
grant select, insert, update, delete on table public.webhook_events to service_role;
create index if not exists webhook_events_tenant_created_idx on public.webhook_events (tenant_id, created_at desc);

create unique index if not exists giving_records_checkout_request_id_unique on public.giving_records (checkout_request_id) where checkout_request_id is not null;
create unique index if not exists pledge_payments_giving_record_unique on public.pledge_payments (giving_record_id) where giving_record_id is not null;

create or replace function public.apply_mpesa_stk_callback(p_checkout_request_id text,p_result_code integer,p_result_desc text default null,p_mpesa_receipt text default null,p_payload_hash text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_record public.giving_records%rowtype; v_new_status public.payment_status_enum; v_reason text;
  v_payment public.pledge_payments%rowtype; v_commitment public.pledge_commitments%rowtype; v_event_rows bigint := 0;
begin
  if p_checkout_request_id is null or length(trim(p_checkout_request_id)) < 4 then raise exception 'checkout_request_id is required'; end if;
  select * into v_record from public.giving_records where checkout_request_id=p_checkout_request_id for update;
  if not found then return jsonb_build_object('ok',false,'reason','unknown_checkout_request_id'); end if;
  insert into public.webhook_events(provider,event_key,tenant_id,payload_hash,processing_status)
  values ('mpesa_stk',p_checkout_request_id||':'||p_result_code::text,v_record.tenant_id,p_payload_hash,'processing')
  on conflict (provider,event_key) do nothing;
  get diagnostics v_event_rows = row_count;
  if v_event_rows=0 then return jsonb_build_object('ok',true,'duplicate',true,'giving_record_id',v_record.id); end if;
  if p_result_code=0 then v_new_status:='confirmed'; v_reason:=null;
  elsif p_result_code in (1032,1037) then v_new_status:='cancelled'; v_reason:=case p_result_code when 1032 then 'user_cancelled' else 'safaricom_timeout' end;
  else v_new_status:='failed'; v_reason:=coalesce(nullif(trim(p_result_desc),''),'mpesa_result_'||p_result_code::text); end if;
  if v_record.payment_status='confirmed' and v_new_status<>'confirmed' then
    update public.webhook_events set processing_status='ignored',processed_at=now(),error_message='confirmed_payment_not_downgraded'
    where provider='mpesa_stk' and event_key=p_checkout_request_id||':'||p_result_code::text;
    return jsonb_build_object('ok',true,'ignored',true,'giving_record_id',v_record.id);
  end if;
  if v_new_status='confirmed' and v_record.payment_status<>'confirmed' then
    update public.giving_records set payment_status='confirmed',mpesa_receipt=coalesce(nullif(trim(p_mpesa_receipt),''),mpesa_receipt),void_reason=null,voided_at=null where id=v_record.id;
    update public.pledge_payments set payment_status='confirmed',paid_at=coalesce(paid_at,now()) where giving_record_id=v_record.id and payment_status<>'confirmed' returning * into v_payment;
    if found and v_payment.commitment_id is not null then
      select * into v_commitment from public.pledge_commitments where id=v_payment.commitment_id for update;
      if found then
        update public.pledge_commitments set paid_amount=coalesce(paid_amount,0)+v_payment.amount,
          status=case when coalesce(paid_amount,0)+v_payment.amount>=pledged_amount then 'fulfilled' else status end,
          updated_at=now() where id=v_payment.commitment_id;
      end if;
    end if;
  elsif v_new_status<>'confirmed' and v_record.payment_status<>'confirmed' then
    update public.giving_records set payment_status=v_new_status,void_reason=v_reason,voided_at=case when v_new_status in ('cancelled','voided') then now() else voided_at end where id=v_record.id;
  elsif v_new_status='confirmed' and p_mpesa_receipt is not null and v_record.mpesa_receipt is null then
    update public.giving_records set mpesa_receipt=p_mpesa_receipt where id=v_record.id;
  end if;
  update public.webhook_events set processing_status='processed',processed_at=now() where provider='mpesa_stk' and event_key=p_checkout_request_id||':'||p_result_code::text;
  return jsonb_build_object('ok',true,'giving_record_id',v_record.id,'payment_status',v_new_status);
exception when others then
  update public.webhook_events set processing_status='failed',processed_at=now(),error_message=left(sqlerrm,500)
  where provider='mpesa_stk' and event_key=p_checkout_request_id||':'||coalesce(p_result_code::text,'unknown'); raise;
end; $$;
revoke all on function public.apply_mpesa_stk_callback(text,integer,text,text,text) from public, anon, authenticated;
grant execute on function public.apply_mpesa_stk_callback(text,integer,text,text,text) to service_role;

create or replace function public.record_mpesa_c2b_payment(p_tenant_id text,p_trans_id text,p_business_shortcode text,p_amount numeric,p_phone text default null,p_donor_name text default null,p_bill_ref text default null,p_payload_hash text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_existing_id varchar; v_giving_id varchar; v_claim_rows bigint:=0;
begin
  if p_tenant_id is null or p_trans_id is null or length(trim(p_trans_id))<4 then raise exception 'tenant_id and TransID are required'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'positive amount is required'; end if;
  if not exists (select 1 from public.tenant_payment_credentials where tenant_id=p_tenant_id and daraja_shortcode=p_business_shortcode) then
    return jsonb_build_object('ok',false,'reason','tenant_shortcode_mismatch');
  end if;
  insert into public.webhook_events(provider,event_key,tenant_id,payload_hash,processing_status)
  values ('mpesa_c2b',p_tenant_id||':'||p_trans_id,p_tenant_id,p_payload_hash,'processing') on conflict (provider,event_key) do nothing;
  get diagnostics v_claim_rows=row_count;
  if v_claim_rows=0 then
    select id into v_existing_id from public.giving_records where tenant_id=p_tenant_id and (external_reference=p_trans_id or mpesa_receipt=p_trans_id) order by created_at asc limit 1;
    return jsonb_build_object('ok',true,'duplicate',true,'giving_record_id',v_existing_id);
  end if;
  select id into v_existing_id from public.giving_records where tenant_id=p_tenant_id and (external_reference=p_trans_id or mpesa_receipt=p_trans_id) order by created_at asc limit 1;
  if v_existing_id is not null then
    update public.webhook_events set processing_status='ignored',processed_at=now(),error_message='legacy_duplicate_found' where provider='mpesa_c2b' and event_key=p_tenant_id||':'||p_trans_id;
    return jsonb_build_object('ok',true,'duplicate',true,'giving_record_id',v_existing_id);
  end if;
  insert into public.giving_records(tenant_id,member_id,donor_name,phone_number,amount,currency,payment_method,payment_status,giving_type,mpesa_receipt,external_reference,notes,given_at)
  values (p_tenant_id,null,coalesce(nullif(trim(p_donor_name),''),'Anonymous'),p_phone,p_amount,'KES','mpesa','confirmed','offering',p_trans_id,p_trans_id,nullif(trim(p_bill_ref),''),current_date)
  returning id into v_giving_id;
  update public.webhook_events set processing_status='processed',processed_at=now() where provider='mpesa_c2b' and event_key=p_tenant_id||':'||p_trans_id;
  return jsonb_build_object('ok',true,'giving_record_id',v_giving_id,'tenant_id',p_tenant_id);
exception when others then
  update public.webhook_events set processing_status='failed',processed_at=now(),error_message=left(sqlerrm,500) where provider='mpesa_c2b' and event_key=coalesce(p_tenant_id,'')||':'||coalesce(p_trans_id,''); raise;
end; $$;
revoke all on function public.record_mpesa_c2b_payment(text,text,text,numeric,text,text,text,text) from public, anon, authenticated;
grant execute on function public.record_mpesa_c2b_payment(text,text,text,numeric,text,text,text,text) to service_role;

create or replace function public.apply_verified_provider_payment_status(p_provider text,p_event_key text,p_transaction_ref text,p_payment_status public.payment_status_enum,p_payload_hash text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_record public.giving_records%rowtype; v_claim_rows bigint:=0;
begin
  if p_provider not in ('pesapal','intasend') then raise exception 'unsupported provider'; end if;
  if p_event_key is null or p_transaction_ref is null then raise exception 'event key and transaction reference are required'; end if;
  select * into v_record from public.giving_records where pesapal_transaction_id=p_transaction_ref order by created_at desc limit 1 for update;
  if not found then return jsonb_build_object('ok',false,'reason','unknown_transaction'); end if;
  insert into public.webhook_events(provider,event_key,tenant_id,payload_hash,processing_status)
  values (p_provider,p_event_key,v_record.tenant_id,p_payload_hash,'processing') on conflict (provider,event_key) do nothing;
  get diagnostics v_claim_rows=row_count;
  if v_claim_rows=0 then return jsonb_build_object('ok',true,'duplicate',true,'giving_record_id',v_record.id); end if;
  if p_payment_status='voided' then
    update public.giving_records set payment_status='voided',voided_at=now(),void_reason=p_provider||'_reversed' where id=v_record.id;
  elsif v_record.payment_status='confirmed' and p_payment_status<>'confirmed' then
    update public.webhook_events set processing_status='ignored',processed_at=now(),error_message='confirmed_payment_not_downgraded' where provider=p_provider and event_key=p_event_key;
    return jsonb_build_object('ok',true,'ignored',true,'giving_record_id',v_record.id);
  else update public.giving_records set payment_status=p_payment_status where id=v_record.id; end if;
  update public.webhook_events set processing_status='processed',processed_at=now() where provider=p_provider and event_key=p_event_key;
  return jsonb_build_object('ok',true,'giving_record_id',v_record.id,'payment_status',p_payment_status);
exception when others then
  update public.webhook_events set processing_status='failed',processed_at=now(),error_message=left(sqlerrm,500) where provider=p_provider and event_key=p_event_key; raise;
end; $$;
revoke all on function public.apply_verified_provider_payment_status(text,text,text,public.payment_status_enum,text) from public, anon, authenticated;
grant execute on function public.apply_verified_provider_payment_status(text,text,text,public.payment_status_enum,text) to service_role;

commit;;
