-- Recovery Phase 3 — F8: new churches start with NO service request types, so
-- neither admins (Operations → Member Requests → Create Request) nor members
-- (portal → Requests) can submit a request until an admin finds
-- Settings → Service Requests → "Add Default Types". Staging 2026-11-20:
-- 10 of 12 tenants had zero types.
--
-- 1. private.seed_default_service_request_types(tenant) inserts the 15 defaults
--    (same list as DEFAULTS in src/pages/settings/ServiceRequestTypes.tsx;
--    a contract test keeps them in sync). ON CONFLICT DO NOTHING → idempotent,
--    never overwrites a church's own edits.
-- 2. AFTER INSERT trigger on public.tenants seeds every new church. Church
--    creation runs inside the auth signup trigger, so a seeding failure must
--    NEVER abort signup: it is caught and reported as a WARNING (an admin can
--    still use "Add Default Types").
-- 3. One-off backfill ONLY for tenants that currently have zero types; churches
--    that already curated a list are untouched.
--
-- Rollback: DROP TRIGGER tenants_seed_service_request_types ON public.tenants;
-- DROP FUNCTION private.tenants_seed_service_request_types();
-- DROP FUNCTION private.seed_default_service_request_types(text);
-- (backfilled rows are ordinary editable types; delete only if required).

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.seed_default_service_request_types(p_tenant_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_inserted integer;
BEGIN
  IF p_tenant_id IS NULL OR btrim(p_tenant_id) = '' THEN
    RETURN 0;
  END IF;

  INSERT INTO public.service_request_types
    (tenant_id, label, internal_name, description, is_active, is_default, sort_order)
  SELECT p_tenant_id, d.label, d.internal_name, d.description, true, true, d.sort_order
  FROM (VALUES
    ('Baby Dedication',     'baby_dedication',     'Request for baby dedication ceremony',       0),
    ('Wedding Ceremony',    'wedding_ceremony',    'Request for church wedding ceremony',        1),
    ('Funeral Service',     'funeral_service',     'Request for funeral or memorial service',    2),
    ('Baptism',             'baptism',             'Request for water baptism',                  3),
    ('House Blessing',      'house_blessing',      'Request for home blessing/dedication',       4),
    ('Counselling Session', 'counselling_session', 'Request for pastoral counselling',           5),
    ('Hospital Visit',      'hospital_visit',      'Request for hospital visitation',            6),
    ('Prayer Request',      'prayer_request',      'General prayer request',                     7),
    ('Prayer',              'prayer',              'Prayer support request',                     8),
    ('Counselling',         'counselling',         'Pastoral counselling session',               9),
    ('Visitation',          'visitation',          'Home or hospital visitation request',        10),
    ('Financial Aid',       'financial_aid',       'Request for financial assistance',           11),
    ('Medical Support',     'medical_support',     'Request for medical support or assistance',  12),
    ('Bereavement',         'bereavement',         'Bereavement support and care',               13),
    ('General',             'general',             'General service request',                    14)
  ) AS d(label, internal_name, description, sort_order)
  ON CONFLICT (tenant_id, internal_name) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$fn$;

CREATE OR REPLACE FUNCTION private.tenants_seed_service_request_types()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  BEGIN
    PERFORM private.seed_default_service_request_types(NEW.id::text);
  EXCEPTION WHEN OTHERS THEN
    -- Never block church creation / signup over optional defaults.
    RAISE WARNING 'seed_default_service_request_types failed for tenant %: %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$fn$;

REVOKE ALL ON FUNCTION private.seed_default_service_request_types(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.tenants_seed_service_request_types() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tenants_seed_service_request_types ON public.tenants;
CREATE TRIGGER tenants_seed_service_request_types
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION private.tenants_seed_service_request_types();

-- One-off backfill: only churches with no types at all.
DO $backfill$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT t.id::text AS id
    FROM public.tenants t
    WHERE NOT EXISTS (SELECT 1 FROM public.service_request_types s WHERE s.tenant_id = t.id::text)
  LOOP
    PERFORM private.seed_default_service_request_types(r.id);
  END LOOP;
END
$backfill$;
