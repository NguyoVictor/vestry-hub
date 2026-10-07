-- Phase 1 Stage 11A: push-device token hardening.
-- Registration and sending now flow through validated Edge Functions.

alter table public.device_tokens enable row level security;

drop policy if exists "device_tokens_insert" on public.device_tokens;
drop policy if exists "device_tokens_select" on public.device_tokens;
drop policy if exists "device_tokens_delete" on public.device_tokens;
drop policy if exists "device_tokens_own" on public.device_tokens;
drop policy if exists "device_tokens_tenant_rls" on public.device_tokens;
drop policy if exists "device_tokens_member_auth_insert" on public.device_tokens;
drop policy if exists "device_tokens_member_auth_read" on public.device_tokens;
drop policy if exists "device_tokens_member_auth_update" on public.device_tokens;
drop policy if exists "device_tokens_member_auth_delete" on public.device_tokens;

revoke all on table public.device_tokens from public, anon, authenticated;
grant select, insert, update, delete on table public.device_tokens to service_role;
