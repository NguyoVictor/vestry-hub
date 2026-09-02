begin;

drop policy if exists login_events_insert on public.login_events;
drop policy if exists security_alerts_insert on public.security_alerts;
revoke insert on public.login_events from anon, authenticated;
revoke insert on public.security_alerts from anon, authenticated;
grant insert on public.login_events to service_role;
grant insert on public.security_alerts to service_role;

drop policy if exists tenants_member_payhero_read on public.tenants;

commit;;
