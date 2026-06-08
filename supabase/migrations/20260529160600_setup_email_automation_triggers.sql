-- Database triggers for immediate email automations
-- These trigger when member status changes to 'Visitor' or 'New Convert'

-- Function to trigger email automation via webhook
CREATE OR REPLACE FUNCTION trigger_email_automation()
RETURNS TRIGGER AS $$
DECLARE
  automation_key TEXT;
  webhook_url TEXT := 'https://crjdsxxkspvdwknrmijs.supabase.co/functions/v1/process-email-automations';
  service_role_key TEXT;
BEGIN
  -- Get service role key from app settings (you'll need to set this)
  -- For now, we'll use a placeholder - this should be set via environment or app settings
  service_role_key := current_setting('app.settings.service_role_key', true);
  
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
  IF automation_key IS NOT NULL AND service_role_key IS NOT NULL THEN
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

-- Create trigger for member inserts (new visitors/converts)
DROP TRIGGER IF EXISTS trigger_member_automation_insert ON members;
CREATE TRIGGER trigger_member_automation_insert
  AFTER INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_email_automation();

-- Create trigger for member status updates
DROP TRIGGER IF EXISTS trigger_member_automation_update ON members;
CREATE TRIGGER trigger_member_automation_update
  AFTER UPDATE OF status ON members
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trigger_email_automation();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_email_automation() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_email_automation() TO service_role;