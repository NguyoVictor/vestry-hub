-- Recovery Phase 4 — manual testing report Findings 7, 9 and 25.
-- Reproduced on the recovery Preview as QA Church A admin (2026-11-20) with the
-- real PostgREST/Storage error codes captured:
--
-- Finding 25: PATCH /tenants -> 400 PGRST204 "Could not find the 'timezone'
--   column of 'tenants'". Logo upload -> 400: bucket `church-logos` does not
--   exist (its tenant-folder policies DO exist, from 20260831174220).
-- Finding 9: POST /incidents -> 400 PGRST204 'attachment_paths' — even with NO
--   attachment. incidents lacks 7 columns the UI writes; incident_status_logs
--   (status history) does not exist; status enum lacks 'closed' (UI offers it).
--   Attachment upload -> 400: bucket `incident-attachments` does not exist.
-- Finding 7: thumbnail upload -> 400: bucket `facility-thumbnails` does not
--   exist. (7-B "facility not appearing" is an ambiguous PostgREST embed, fixed
--   in the frontend, not here.)
--
-- Additive and idempotent. No existing data is modified. Rollback: drop the
-- added columns/table/policies; buckets can be removed only while empty.

-- ── Finding 25: General Settings timezone ───────────────────────────────────
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS timezone varchar;

-- ── Finding 9: incidents schema ─────────────────────────────────────────────
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS incident_number varchar,
  ADD COLUMN IF NOT EXISTS incident_time time,
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS witnesses text,
  ADD COLUMN IF NOT EXISTS attachment_paths text[],
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $chk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.incidents'::regclass
                  AND conname = 'incidents_severity_check') THEN
    ALTER TABLE public.incidents ADD CONSTRAINT incidents_severity_check
      CHECK (severity IN ('low', 'medium', 'high', 'critical'));
  END IF;
END
$chk$;

ALTER TYPE public.incident_status_enum ADD VALUE IF NOT EXISTS 'closed';

CREATE TABLE IF NOT EXISTS public.incident_status_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  incident_id varchar NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  tenant_id varchar NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  note text,
  changed_by text DEFAULT (auth.uid())::text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incident_status_logs_incident ON public.incident_status_logs (incident_id, changed_at DESC);
ALTER TABLE public.incident_status_logs ENABLE ROW LEVEL SECURITY;

-- Same boundary as public.incidents (incidents_tenant_rls): active staff of the
-- tenant. Append-only history: no UPDATE/DELETE policy.
DROP POLICY IF EXISTS incident_status_logs_staff_select ON public.incident_status_logs;
CREATE POLICY incident_status_logs_staff_select ON public.incident_status_logs
  FOR SELECT TO authenticated
  USING ((tenant_id)::text = (public.get_my_tenant_id())::text);
DROP POLICY IF EXISTS incident_status_logs_staff_insert ON public.incident_status_logs;
CREATE POLICY incident_status_logs_staff_insert ON public.incident_status_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    (tenant_id)::text = (public.get_my_tenant_id())::text
    AND EXISTS (SELECT 1 FROM public.incidents i
                 WHERE i.id = incident_id AND (i.tenant_id)::text = (incident_status_logs.tenant_id)::text)
  );
REVOKE ALL ON public.incident_status_logs FROM anon;
GRANT SELECT, INSERT ON public.incident_status_logs TO authenticated;

-- ── Storage buckets (Findings 7, 9, 25) ─────────────────────────────────────
-- Object paths used by the app are always "<tenant_id>/<file>".
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('facility-thumbnails', 'facility-thumbnails', true, 5242880,
     ARRAY['image/webp', 'image/jpeg', 'image/png']),
  ('incident-attachments', 'incident-attachments', false, 10485760,
     ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf',
           'application/msword',
           'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
           'text/plain']),
  ('church-logos', 'church-logos', true, 5242880,
     ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- facility-thumbnails: public read (served via public URL; no SELECT policy so
-- objects cannot be listed). Writes only by staff who may manage facilities,
-- into their own tenant folder — mirrors facilities_staff_insert.
DROP POLICY IF EXISTS facility_thumbnails_staff_insert ON storage.objects;
CREATE POLICY facility_thumbnails_staff_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'facility-thumbnails'
              AND private.can_manage_facility_bookings((storage.foldername(name))[1]));
DROP POLICY IF EXISTS facility_thumbnails_staff_update ON storage.objects;
CREATE POLICY facility_thumbnails_staff_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'facility-thumbnails'
         AND private.can_manage_facility_bookings((storage.foldername(name))[1]))
  WITH CHECK (bucket_id = 'facility-thumbnails'
              AND private.can_manage_facility_bookings((storage.foldername(name))[1]));
DROP POLICY IF EXISTS facility_thumbnails_staff_delete ON storage.objects;
CREATE POLICY facility_thumbnails_staff_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'facility-thumbnails'
         AND private.can_manage_facility_bookings((storage.foldername(name))[1]));

-- incident-attachments: PRIVATE. Read (signed URLs) and write only by active
-- staff of the tenant — same boundary as public.incidents.
DROP POLICY IF EXISTS incident_attachments_staff_select ON storage.objects;
CREATE POLICY incident_attachments_staff_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'incident-attachments'
         AND (storage.foldername(name))[1] = (public.get_my_tenant_id())::text);
DROP POLICY IF EXISTS incident_attachments_staff_insert ON storage.objects;
CREATE POLICY incident_attachments_staff_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'incident-attachments'
              AND (storage.foldername(name))[1] = (public.get_my_tenant_id())::text);
DROP POLICY IF EXISTS incident_attachments_staff_delete ON storage.objects;
CREATE POLICY incident_attachments_staff_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'incident-attachments'
         AND (storage.foldername(name))[1] = (public.get_my_tenant_id())::text);

-- church-logos: tighten the existing tenant-folder policies (20260831174220)
-- from private.actor_has_tenant (which also admits portal MEMBERS) to active
-- staff of the tenant or a platform super admin. Public read via public URL.
DROP POLICY IF EXISTS church_logos_tenant_insert ON storage.objects;
CREATE POLICY church_logos_tenant_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'church-logos'
              AND (private.is_platform_super_admin()
                   OR (storage.foldername(name))[1] = (public.get_my_tenant_id())::text));
DROP POLICY IF EXISTS church_logos_tenant_update ON storage.objects;
CREATE POLICY church_logos_tenant_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'church-logos'
         AND (private.is_platform_super_admin()
              OR (storage.foldername(name))[1] = (public.get_my_tenant_id())::text))
  WITH CHECK (bucket_id = 'church-logos'
              AND (private.is_platform_super_admin()
                   OR (storage.foldername(name))[1] = (public.get_my_tenant_id())::text));
DROP POLICY IF EXISTS church_logos_tenant_delete ON storage.objects;
CREATE POLICY church_logos_tenant_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'church-logos'
         AND (private.is_platform_super_admin()
              OR (storage.foldername(name))[1] = (public.get_my_tenant_id())::text));
-- upsert:true uploads also need SELECT on the existing object for the owner path.
DROP POLICY IF EXISTS church_logos_staff_select ON storage.objects;
CREATE POLICY church_logos_staff_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'church-logos'
         AND (private.is_platform_super_admin()
              OR (storage.foldername(name))[1] = (public.get_my_tenant_id())::text));
