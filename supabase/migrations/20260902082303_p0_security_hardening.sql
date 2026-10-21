begin;

-- P0: remove legacy policies that bypass tenant/user isolation.
drop policy if exists "Allow anon role for automation settings"
  on public.automation_settings;

drop policy if exists "Authenticated users can manage automation settings"
  on public.automation_settings;

drop policy if exists "device_tokens_anon_rw"
  on public.device_tokens;

drop policy if exists "device_tokens_insert"
  on public.device_tokens;

DO $migration$
BEGIN
    IF to_regclass('public.message_reactions') IS NOT NULL THEN
        DROP POLICY IF EXISTS "reactions_all"
        ON public.message_reactions;
    ELSE
        RAISE NOTICE
            'Skipping legacy reactions policy cleanup: table does not exist';
    END IF;
END;
$migration$;

drop policy if exists "notifications_anon_read"
  on public.notifications;

drop policy if exists "notifications_anon_update"
  on public.notifications;

drop policy if exists "Allow all operations for authenticated users"
  on public.sms_templates;

drop policy if exists "whatsapp_contacts_tenant_access"
  on public.whatsapp_contacts;

drop policy if exists "whatsapp_groups_tenant_access"
  on public.whatsapp_groups;


-- P0: signed-out clients must not have direct access to private/member data.
revoke all privileges on table public.device_tokens
  from anon;

DO $migration$
BEGIN
    IF to_regclass('public.message_reactions') IS NOT NULL THEN
        REVOKE ALL PRIVILEGES
        ON TABLE public.message_reactions
        FROM anon;
    END IF;
END;
$migration$;

revoke all privileges on table public.notifications
  from anon;

revoke all privileges on table public.sms_templates
  from anon;

revoke all privileges on table public.whatsapp_contacts
  from anon;

revoke all privileges on table public.whatsapp_groups
  from anon;

revoke all privileges on table public.automation_settings
  from anon, authenticated;


-- P0: protect sensitive tenant columns while preserving the public church lookup.
drop policy if exists "tenants_public_read"
  on public.tenants;

revoke all privileges on table public.tenants
  from anon;


-- Grant anonymous access only to approved public columns
-- that actually exist in the current tenants table.
-- Never fall back to table-wide SELECT privileges.

DO $migration$
DECLARE
    v_allowed_columns TEXT[] := ARRAY[
        'id',
        'name',
        'slug',
        'logo',
        'contact_email',
        'church_code',
        'tagline',
        'website_url',
        'about',
        'address',
        'founded_year',
        'denomination',
        'service_days',
        'service_time',
        'average_attendance',
        'facebook_url',
        'instagram_url',
        'youtube_url',
        'twitter_url',
        'whatsapp_number',
        'city',
        'country',
        'phone',
        'website'
    ];

    v_existing_columns TEXT[];
BEGIN
    SELECT ARRAY_AGG(
        FORMAT('%I', c.column_name)
        ORDER BY array_position(
            v_allowed_columns,
            c.column_name::TEXT
        )
    )
    INTO v_existing_columns
    FROM information_schema.columns AS c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'tenants'
      AND c.column_name = ANY(v_allowed_columns);

    IF v_existing_columns IS NULL
       OR array_length(v_existing_columns, 1) IS NULL
    THEN
        RAISE EXCEPTION
            'No approved public tenant columns found';
    END IF;

    EXECUTE FORMAT(
        'GRANT SELECT (%s) ON TABLE public.tenants TO anon',
        array_to_string(v_existing_columns, ', ')
    );

    RAISE NOTICE
        'Granted anonymous SELECT only on approved existing tenant columns';
END;
$migration$;


create policy "tenants_public_read_safe_columns"
  on public.tenants
  for select
  to anon
  using (true);


-- P0: browser roles do not need non-DML capabilities.
-- These permissions operate outside row-level security.
revoke truncate, references, trigger
  on all tables in schema public
  from anon, authenticated;

commit;