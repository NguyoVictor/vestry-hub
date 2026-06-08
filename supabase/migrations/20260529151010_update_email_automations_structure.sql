-- Update email_automations table structure to match component expectations

-- Add missing columns
ALTER TABLE email_automations 
ADD COLUMN IF NOT EXISTS automation_key TEXT,
ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';

-- Update existing columns to allow nulls where needed (to match component interface)
ALTER TABLE email_automations 
ALTER COLUMN name DROP NOT NULL,
ALTER COLUMN frequency DROP NOT NULL,
ALTER COLUMN audience DROP NOT NULL;

-- Add unique constraint on tenant_id + automation_key
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_automations_tenant_automation_key') THEN
    ALTER TABLE email_automations ADD CONSTRAINT email_automations_tenant_automation_key UNIQUE (tenant_id, automation_key);
  END IF;
END $$;

-- Create index on automation_key
CREATE INDEX IF NOT EXISTS idx_email_automations_key ON email_automations(automation_key);