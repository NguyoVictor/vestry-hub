-- Recovery Phase 5 — portal members could not read church-wide catalogue data.
-- Verified on staging 2026-11-20: portal members are linked through
-- public.member_auth_memberships (Finding 1 design), NOT members.user_id
-- (0 of 3 links match), so private.actor_has_tenant() never admits them. The
-- read policies below used only actor_has_tenant → the member portal saw empty
-- giving/store/discipleship/WhatsApp/media/facility lists (positive control in
-- the E1 matrix: member A saw 0 of Church A's 2 store categories).
-- Fix: an additional SELECT policy per table using private.member_has_tenant()
-- (auth.uid() linked to THIS church). Read-only; no write access for members.
-- Deliberately NOT added: member_request_notes (internal staff notes).
-- Queued: volunteer_hours needs an own-rows-only member policy.

DO $mr$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'giving_categories', 'store_categories', 'store_bundles',
    'discipleship_resources', 'resource_categories',
    'whatsapp_groups', 'whatsapp_contacts',
    'church_media_items', 'media_albums', 'media_categories',
    'facilities', 'facility_images', 'facility_types'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_p5_member_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (private.member_has_tenant((tenant_id)::varchar))',
                   t || '_p5_member_read', t);
  END LOOP;
END
$mr$;
