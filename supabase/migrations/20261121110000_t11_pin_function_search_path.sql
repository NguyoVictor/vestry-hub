-- T11 (Supabase advisor WARN function_search_path_mutable): pin search_path on
-- the 25 remaining public functions. `public, extensions, pg_temp` keeps the
-- exact name resolution these bodies rely on today (Supabase default is
-- "$user", public, extensions) while preventing a caller-controlled path.
-- pg_temp is listed LAST so temporary objects can never shadow real ones.
-- Behaviour-neutral; each function is skipped if it does not exist (Production
-- may not have all of them). Rollback: ALTER FUNCTION ... RESET search_path.
DO $t11$
DECLARE
  sig text;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'public.auto_update_trending_songs()',
    'public.cleanup_inactive_collaborations()',
    'public.generate_church_code(text)',
    'public.get_dashboard_stats(text)',
    'public.get_song_recommendations(character varying, character varying, character varying[], character varying, character varying, integer)',
    'public.get_storage_stats(text)',
    'public.get_trending_songs(character varying, integer)',
    'public.get_usage_analytics_summary(character varying)',
    'public.get_usage_reports(character varying, character varying, integer)',
    'public.increment_sermon_view_count()',
    'public.set_church_code()',
    'public.set_facility_booking_number()',
    'public.update_email_branding_updated_at()',
    'public.update_feature_permissions_updated_at()',
    'public.update_giving_categories_updated_at()',
    'public.update_mpo_updated_at()',
    'public.update_sermon_notes_updated_at()',
    'public.update_song_usage_stats()',
    'public.update_srt_updated_at()',
    'public.update_staff_positions_updated_at()',
    'public.update_staff_tasks_updated_at()',
    'public.update_storage_on_media_delete()',
    'public.update_storage_on_media_insert()',
    'public.update_trending_songs(character varying)',
    'public.update_user_role_overrides_updated_at()'
  ] LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', to_regprocedure(sig));
    END IF;
  END LOOP;
END
$t11$;
