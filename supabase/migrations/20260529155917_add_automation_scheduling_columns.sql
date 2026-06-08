-- Add scheduling columns to email_automations table
ALTER TABLE email_automations 
ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_send_at TIMESTAMPTZ;

-- Create index for efficient cron job queries
CREATE INDEX IF NOT EXISTS idx_email_automations_next_send ON email_automations(next_send_at) WHERE is_active = true;

-- Create index for tenant + automation_key lookups
CREATE INDEX IF NOT EXISTS idx_email_automations_tenant_key ON email_automations(tenant_id, automation_key) WHERE is_active = true;