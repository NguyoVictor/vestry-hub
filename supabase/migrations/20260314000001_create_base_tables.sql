-- ═══════════════════════════════════════════════════════════════════════════════
-- BASE TABLES MIGRATION
-- This creates the foundation tables that all other migrations depend on
-- Must run BEFORE 20260314195434_vestry_enums.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create core tenants table (multi-tenant foundation)
CREATE TABLE IF NOT EXISTS tenants (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name varchar NOT NULL,
  slug varchar UNIQUE NOT NULL,
  logo varchar,
  contact_email varchar,
  church_code varchar(8) UNIQUE,
  tagline varchar,
  currency varchar(3) DEFAULT 'KES',
  website_url varchar,
  subscription_plan varchar DEFAULT 'free',
  onboarding_completed boolean DEFAULT false,
  onboarding_step int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table (auth-linked user profiles)
CREATE TABLE IF NOT EXISTS users (
  id varchar PRIMARY KEY,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email varchar NOT NULL,
  first_name varchar,
  last_name varchar,
  phone varchar,
  role varchar DEFAULT 'member',
  status varchar DEFAULT 'active',
  gender varchar,
  avatar_url varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create members table (church member profiles)
CREATE TABLE IF NOT EXISTS members (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  membership_number varchar,
  first_name varchar NOT NULL,
  last_name varchar NOT NULL,
  email varchar,
  phone varchar,
  date_of_birth date,
  gender varchar,
  marital_status varchar,
  address text,
  occupation varchar,
  emergency_contact_name varchar,
  emergency_contact_phone varchar,
  join_date date,
  baptism_date date,
  membership_status varchar DEFAULT 'active',
  family_id varchar,
  discipleship_stage varchar,
  notes text,
  avatar_url varchar,
  status varchar DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create families table
CREATE TABLE IF NOT EXISTS families (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  family_name varchar NOT NULL,
  head_of_family_id varchar REFERENCES members(id),
  address text,
  phone varchar,
  email varchar,
  country varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add family_id foreign key to members (after families table exists)
ALTER TABLE members 
  ADD CONSTRAINT members_family_id_fkey 
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL;

-- Create essential indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_church_code ON tenants(church_code);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_members_tenant_id ON members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_family_id ON members(family_id);
CREATE INDEX IF NOT EXISTS idx_families_tenant_id ON families(tenant_id);

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for tenants (admin access)
CREATE POLICY "tenants_admin_access" ON tenants
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Basic RLS policies for users (tenant isolation)
CREATE POLICY "users_tenant_isolation" ON users
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));

-- Basic RLS policies for members (tenant isolation)
CREATE POLICY "members_tenant_isolation" ON members
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));

-- Basic RLS policies for families (tenant isolation)
CREATE POLICY "families_tenant_isolation" ON families
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));