-- T4 optional backfill (PRODUCT DECISION, not run automatically).
-- Creates the member-portal staff-directory thread for every EXISTING active
-- staff member who does not have one, by re-firing the trigger from
-- migration 20261121120000 (no-op UPDATE of status). After this, members of
-- each church can see and message all active staff of their church.
-- Run once per environment after approval. Optionally limit to one church by
-- uncommenting the tenant filter. Idempotent (the trigger skips existing threads).

-- Preview (read-only): who would get a thread
SELECT u.tenant_id, count(*) AS staff_without_thread
FROM public.users u
WHERE u.status = 'active' AND u.tenant_id IS NOT NULL
  AND length(trim(coalesce(u.role,''))) > 0 AND lower(u.role) NOT IN ('member','guest')
  AND NOT EXISTS (SELECT 1 FROM public.conversations c
                   WHERE c.tenant_id = u.tenant_id AND c.staff_user_id = u.id AND coalesce(c.is_staff_directory,false))
  -- AND u.tenant_id = '<TENANT_ID>'
GROUP BY u.tenant_id;

-- Execute (after approval):
-- UPDATE public.users u SET status = u.status
-- WHERE u.status = 'active' AND u.tenant_id IS NOT NULL
--   AND lower(coalesce(u.role,'')) NOT IN ('member','guest','')
--   -- AND u.tenant_id = '<TENANT_ID>'
-- ;
