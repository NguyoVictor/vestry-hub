-- Add to a new Supabase CLI-generated migration file. DO NOT run this against staging yet.
-- Existing constraint allows only member/admin/super_admin/pastor/elder/deacon,
-- while Settings > Users offers additional roles. Keep existing values valid.
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (
    role IS NULL OR role IN (
      'member', 'admin', 'super_admin', 'pastor', 'elder', 'deacon',
      'church_admin', 'general_overseer', 'senior_pastor',
      'assistant_pastor', 'accountant', 'leader', 'studio_operator',
      'staff', 'volunteer', 'guest'
    )
  );
