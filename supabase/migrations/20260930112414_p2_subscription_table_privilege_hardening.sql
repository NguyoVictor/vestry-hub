-- P2 B4 live privilege hardening for tables created before the clean-source fix.
-- Browser roles receive only the SELECT privileges they actually need.

revoke all on public.subscription_catalog from anon, authenticated;
grant select on public.subscription_catalog to anon, authenticated;

revoke all on public.subscription_payment_attempts from anon, authenticated;
grant select on public.subscription_payment_attempts to authenticated;

grant select, insert, update, delete on public.subscription_catalog to service_role;
grant select, insert, update, delete on public.subscription_payment_attempts to service_role;
