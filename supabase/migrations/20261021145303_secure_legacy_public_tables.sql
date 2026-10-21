
BEGIN;

-- ============================================================
-- 1. CANVA OAUTH STATE
-- Sensitive OAuth PKCE values: backend-only access.
-- ============================================================

ALTER TABLE public.canva_oauth_state
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.canva_oauth_state
FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 2. USERS BACKUP
-- Contains user information and administrative roles.
-- No direct browser access.
-- ============================================================

ALTER TABLE public.users_backup
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.users_backup
FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 3. STORAGE PLANS
-- Public read-only catalogue.
-- No client-side creation, pricing changes, or deletion.
-- ============================================================

ALTER TABLE public.storage_plans
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.storage_plans
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.storage_plans
TO anon, authenticated;

DROP POLICY IF EXISTS storage_plans_public_read
ON public.storage_plans;

CREATE POLICY storage_plans_public_read
ON public.storage_plans
FOR SELECT
TO anon, authenticated
USING (true);

COMMIT;
