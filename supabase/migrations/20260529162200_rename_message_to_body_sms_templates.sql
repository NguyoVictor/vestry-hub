-- Rename message column to body in sms_templates table to match the code expectations

-- Check if message column exists and body doesn't, then rename
DO $$ 
BEGIN
  -- If message column exists and body doesn't, rename message to body
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'message') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'body') THEN
    ALTER TABLE sms_templates RENAME COLUMN message TO body;
  END IF;
  
  -- If both exist, copy message to body and drop message
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'message') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'body') THEN
    -- Update body with message content where body is empty
    UPDATE sms_templates SET body = message WHERE body = '' OR body IS NULL;
    -- Drop the message column
    ALTER TABLE sms_templates DROP COLUMN message;
  END IF;
END $$;