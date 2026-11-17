-- RECOVERED FROM ALREADY-APPLIED SUPABASE MIGRATION HISTORY. DO NOT RUN DIRECTLY ON STAGING.
BEGIN;
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_enabled_modules_is_array;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_enabled_modules_valid_format CHECK (enabled_modules IS NULL OR jsonb_typeof(enabled_modules) = 'array' OR (jsonb_typeof(enabled_modules) = 'object' AND enabled_modules ? 'version' AND enabled_modules ? 'admin' AND enabled_modules ? 'member_portal' AND jsonb_typeof(enabled_modules->'admin') = 'object' AND jsonb_typeof(enabled_modules->'member_portal') = 'object'));
UPDATE public.tenants SET enabled_modules = tenant_metadata->'module_config' WHERE jsonb_typeof(tenant_metadata->'module_config') = 'object' AND tenant_metadata->'module_config' ? 'version' AND jsonb_typeof(tenant_metadata->'module_config'->'admin') = 'object' AND jsonb_typeof(tenant_metadata->'module_config'->'member_portal') = 'object' AND (enabled_modules IS NULL OR enabled_modules = '[]'::jsonb);
COMMIT;
