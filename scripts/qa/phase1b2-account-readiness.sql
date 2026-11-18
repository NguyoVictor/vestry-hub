-- Phase 1B.2: SELECT-only QA readiness. Target project: xwbajophstetbnnemsyq
-- No DML/DDL, no email addresses or tokens returned, no credential creation.
-- Execute in the staging Supabase SQL Editor, never in production.

WITH scoped AS (
  SELECT id, name, registration_enabled FROM public.tenants
  WHERE id IN (
    '20d06ab3-5183-4b0b-b1af-ca009480503b',
    'db75d0c0-ec9c-406e-a386-a690725b654f',
    'cf36ddf8-ec05-4378-845a-64dc3c23df1e'
  )
)
SELECT t.name AS tenant,
       t.registration_enabled,
       (SELECT count(*)::int FROM public.users u WHERE u.tenant_id=t.id AND u.status='active' AND u.role <> 'member') AS active_staff,
       (SELECT string_agg(DISTINCT u.role, ',') FROM public.users u WHERE u.tenant_id=t.id) AS existing_roles,
       (SELECT count(*)::int FROM public.members m WHERE m.tenant_id=t.id) AS member_records,
       (SELECT count(*)::int FROM public.members m WHERE m.tenant_id=t.id
          AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.tenant_id=t.id AND u.id=m.id)) AS member_only_records,
       (SELECT count(*)::int FROM public.staff_invitations i WHERE i.tenant_id=t.id AND i.consumed_at IS NULL AND i.expires_at > now()) AS open_staff_invites,
       (SELECT count(*)::int FROM public.member_login_challenges c WHERE c.tenant_id=t.id AND c.consumed_at IS NULL AND c.expires_at > now()) AS open_member_challenges
FROM scoped t ORDER BY t.name;

-- Effective quotas use a default of 3 if no explicit staff limit exists.
SELECT t.name AS tenant,
       coalesce(s.staff_limit,3) AS effective_staff_limit,
       count(u.id) FILTER (WHERE u.role <> 'member' AND u.status='active')::int AS active_staff,
       coalesce(s.staff_limit,3)::int - count(u.id) FILTER (WHERE u.role <> 'member' AND u.status='active')::int AS remaining_staff_slots
FROM public.tenants t
LEFT JOIN public.tenant_subscriptions s ON s.tenant_id::text=t.id
LEFT JOIN public.users u ON u.tenant_id=t.id
WHERE t.id IN ('20d06ab3-5183-4b0b-b1af-ca009480503b','db75d0c0-ec9c-406e-a386-a690725b654f')
GROUP BY t.name,s.staff_limit ORDER BY t.name;

-- Check existing staff Auth linkage and confirmation, without revealing emails.
SELECT t.name AS tenant,
       count(u.id)::int AS staff_profiles,
       count(u.id) FILTER (WHERE a.id IS NOT NULL)::int AS linked_to_auth,
       count(u.id) FILTER (WHERE a.email_confirmed_at IS NOT NULL)::int AS auth_email_confirmed,
       count(u.id) FILTER (WHERE u.email_verified=true)::int AS public_profile_email_verified
FROM public.tenants t
LEFT JOIN public.users u ON u.tenant_id=t.id AND u.role <> 'member'
LEFT JOIN auth.users a ON a.id::text=u.id
WHERE t.id IN ('20d06ab3-5183-4b0b-b1af-ca009480503b','db75d0c0-ec9c-406e-a386-a690725b654f')
GROUP BY t.name ORDER BY t.name;

-- Metadata only: relevant Auth signup and staff profile security triggers.
SELECT n.nspname AS schema, c.relname AS table_name, tgname AS trigger_name,
       p.proname AS function_name
FROM pg_trigger tr
JOIN pg_class c ON c.oid=tr.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_proc p ON p.oid=tr.tgfoid
WHERE NOT tr.tgisinternal
  AND ((n.nspname='auth' AND c.relname='users')
    OR (n.nspname='public' AND c.relname='users'))
ORDER BY n.nspname,c.relname,tgname;
