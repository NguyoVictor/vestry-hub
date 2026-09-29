begin;
-- P1 permission policy cleanup
drop policy if exists "admins_manage_permissions" on public.user_fine_permissions;
drop policy if exists "users_read_own_permissions" on public.user_fine_permissions;
commit;