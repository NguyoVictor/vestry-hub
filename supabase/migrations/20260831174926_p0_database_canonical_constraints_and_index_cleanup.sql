begin;

alter table public.tenants drop constraint if exists tenants_enabled_modules_is_array;
alter table public.tenants
  add constraint tenants_enabled_modules_is_array
  check (enabled_modules is null or jsonb_typeof(enabled_modules) = 'array') not valid;
alter table public.tenants validate constraint tenants_enabled_modules_is_array;

-- Remove only proven redundant non-constraint indexes. Keep indexes backing UNIQUE/PK constraints.
drop index if exists public.idx_members_tenant_id;
drop index if exists public.idx_new_converts_tenant_id;
drop index if exists public.idx_canva_tokens_tenant_id;
drop index if exists public.idx_device_tokens_token;
drop index if exists public.idx_email_branding_tenant_id;
drop index if exists public.idx_sms_settings_tenant_id;
drop index if exists public.idx_tenant_subscriptions_tenant_id;
drop index if exists public.idx_tenants_church_code;
drop index if exists public.idx_tenants_slug;

analyze public.tenants;
analyze public.members;
analyze public.new_converts;

commit;;
