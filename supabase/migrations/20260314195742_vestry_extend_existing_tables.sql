-- Extend tenants with missing Vestry columns
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS church_code varchar(8) UNIQUE,
  ADD COLUMN IF NOT EXISTS tagline varchar,
  ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS website_url varchar,
  ADD COLUMN IF NOT EXISTS contact_email varchar,
  ADD COLUMN IF NOT EXISTS subscription_plan subscription_plan_enum DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step int DEFAULT 0;

-- Extend users with missing Vestry columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gender varchar,
  ADD COLUMN IF NOT EXISTS avatar_url varchar;

-- Extend members with missing Vestry columns
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS discipleship_stage varchar,
  ADD COLUMN IF NOT EXISTS notes text;

-- Extend families with missing Vestry columns
ALTER TABLE families
  ADD COLUMN IF NOT EXISTS country varchar;;
