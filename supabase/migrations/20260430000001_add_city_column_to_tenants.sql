-- Add missing city column to tenants table for onboarding
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city varchar;
