
create or replace function private.reserve_ai_credit(p_tenant_id text)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  reserved boolean := false;
begin
  update public.tenant_subscriptions
  set ai_used = coalesce(ai_used, 0) + 1,
      updated_at = now()
  where tenant_id = p_tenant_id::uuid
    and lower(coalesce(status, '')) = 'active'
    and coalesce(ai_used, 0) < (coalesce(ai_credits, 0) + coalesce(ai_addons, 0))
  returning true into reserved;

  return coalesce(reserved, false);
exception
  when invalid_text_representation then
    return false;
end;
$$;

create or replace function private.release_ai_credit(p_tenant_id text)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  update public.tenant_subscriptions
  set ai_used = greatest(coalesce(ai_used, 0) - 1, 0),
      updated_at = now()
  where tenant_id = p_tenant_id::uuid;
exception
  when invalid_text_representation then
    null;
end;
$$;

revoke all on function private.reserve_ai_credit(text) from public, anon, authenticated;
revoke all on function private.release_ai_credit(text) from public, anon, authenticated;
grant execute on function private.reserve_ai_credit(text) to service_role;
grant execute on function private.release_ai_credit(text) to service_role;
