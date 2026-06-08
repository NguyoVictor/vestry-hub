-- Configure settings for email automation system

-- Create a simple settings table for storing configuration
CREATE TABLE IF NOT EXISTS automation_settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage automation settings" ON automation_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Insert service role key placeholder (will be updated via environment)
INSERT INTO automation_settings (key, value) 
VALUES ('service_role_key', 'placeholder_key')
ON CONFLICT (key) DO NOTHING;

-- Update the trigger function to use the settings table
CREATE OR REPLACE FUNCTION trigger_email_automation()
RETURNS TRIGGER AS $$
DECLARE
  automation_key TEXT;
  webhook_url TEXT := 'https://crjdsxxkspvdwknrmijs.supabase.co/functions/v1/process-email-automations';
  service_role_key TEXT;
BEGIN
  -- Get service role key from settings table
  SELECT value INTO service_role_key 
  FROM automation_settings 
  WHERE key = 'service_role_key';
  
  -- Skip if no service role key configured
  IF service_role_key IS NULL OR service_role_key = 'placeholder_key' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Determine which automation to trigger based on the change
  IF TG_OP = 'INSERT' THEN
    -- New member inserted
    IF NEW.status = 'Visitor' THEN
      automation_key := 'visitor_welcome';
    ELSIF NEW.status = 'New Convert' THEN
      automation_key := 'new_convert_milestones';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Member status updated
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'Visitor' AND OLD.status != 'Visitor' THEN
        automation_key := 'visitor_welcome';
      ELSIF NEW.status = 'New Convert' AND OLD.status != 'New Convert' THEN
        automation_key := 'new_convert_milestones';
      END IF;
    END IF;
  END IF;

  -- If we have an automation to trigger, call the Edge Function
  IF automation_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'automation_key', automation_key,
        'member_id', NEW.id,
        'tenant_id', NEW.tenant_id
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;