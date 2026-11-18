-- READ-ONLY: use ONLY in the Vestry Hub STAGING SQL editor.
-- The two existing test tenants share the live staging database; they are NOT
-- disposable Supabase infrastructure. Do not execute broad deletes or resets.
select t.id, t.name, t.slug,
  (select count(*) from public.users u where u.tenant_id = t.id) as staff_profiles,
  (select count(*) from public.members m where m.tenant_id = t.id) as members
from public.tenants t
where t.id in (
  '20d06ab3-5183-4b0b-b1af-ca009480503b', -- Vestry Staging Church A
  'db75d0c0-ec9c-406e-a386-a690725b654f'  -- Vestry Staging Church B
)
order by t.id;
