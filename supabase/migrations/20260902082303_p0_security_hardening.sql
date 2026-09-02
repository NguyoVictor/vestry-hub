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

drop policy if exists "reactions_all"
  on public.message_reactions;

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

revoke all privileges on table public.message_reactions
  from anon;

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

grant select (
  id,
  name,
  slug,
  logo,
  contact_email,
  church_code,
  tagline,
  website_url,
  about,
  address,
  founded_year,
  denomination,
  service_days,
  service_time,
  average_attendance,
  facebook_url,
  instagram_url,
  youtube_url,
  twitter_url,
  whatsapp_number,
  city,
  country,
  phone,
  website
) on table public.tenants
to anon;

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