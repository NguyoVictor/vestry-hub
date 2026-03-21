
-- Add missing columns to tenants table
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS founded_year integer,
  ADD COLUMN IF NOT EXISTS denomination varchar,
  ADD COLUMN IF NOT EXISTS service_days text[],
  ADD COLUMN IF NOT EXISTS service_time varchar,
  ADD COLUMN IF NOT EXISTS average_attendance integer,
  ADD COLUMN IF NOT EXISTS facebook_url varchar,
  ADD COLUMN IF NOT EXISTS instagram_url varchar,
  ADD COLUMN IF NOT EXISTS youtube_url varchar,
  ADD COLUMN IF NOT EXISTS twitter_url varchar,
  ADD COLUMN IF NOT EXISTS whatsapp_number varchar,
  ADD COLUMN IF NOT EXISTS enabled_modules jsonb DEFAULT '[]'::jsonb;

-- Tenant SEO settings
CREATE TABLE IF NOT EXISTS public.tenant_seo_settings (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  tenant_id varchar NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  page_title text,
  meta_description text,
  keywords text[],
  og_title text,
  og_description text,
  og_image_url text,
  twitter_card_type text DEFAULT 'summary_large_image',
  ga_measurement_id text,
  facebook_pixel_id text,
  gsc_verification text,
  structured_data_enabled boolean DEFAULT true,
  public_page_visible boolean DEFAULT true,
  show_in_directory boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.tenant_seo_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_tenant_rls" ON public.tenant_seo_settings FOR ALL USING ((tenant_id)::text = (get_my_tenant_id())::text);
CREATE POLICY "seo_public_read" ON public.tenant_seo_settings FOR SELECT TO anon USING (public_page_visible = true);

-- Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  user_id varchar NOT NULL,
  tenant_id varchar NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email_new_member boolean DEFAULT true,
  email_new_donation boolean DEFAULT true,
  email_weekly_summary boolean DEFAULT true,
  email_new_event boolean DEFAULT true,
  email_member_request boolean DEFAULT true,
  email_new_visitor boolean DEFAULT true,
  email_weekly_digest boolean DEFAULT true,
  inapp_new_member boolean DEFAULT true,
  inapp_new_donation boolean DEFAULT true,
  inapp_weekly_summary boolean DEFAULT false,
  inapp_new_event boolean DEFAULT true,
  inapp_member_request boolean DEFAULT true,
  inapp_new_visitor boolean DEFAULT true,
  inapp_weekly_digest boolean DEFAULT false,
  UNIQUE(user_id, tenant_id)
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_prefs_own" ON public.notification_preferences FOR ALL USING ((user_id)::text = (auth.uid())::text);

-- Login events
CREATE TABLE IF NOT EXISTS public.login_events (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  user_id varchar NOT NULL,
  ip_address text,
  user_agent text,
  location text,
  status varchar DEFAULT 'success',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "login_events_own" ON public.login_events FOR SELECT USING ((user_id)::text = (auth.uid())::text);
