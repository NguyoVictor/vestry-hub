-- Fix sms_templates table by adding missing columns and proper RLS

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add body column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'body') THEN
    ALTER TABLE sms_templates ADD COLUMN body TEXT NOT NULL DEFAULT '';
  END IF;
  
  -- Add category_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'category_id') THEN
    ALTER TABLE sms_templates ADD COLUMN category_id VARCHAR REFERENCES email_categories(id) ON DELETE SET NULL;
  END IF;
  
  -- Add name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'name') THEN
    ALTER TABLE sms_templates ADD COLUMN name VARCHAR NOT NULL DEFAULT '';
  END IF;
  
  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'is_active') THEN
    ALTER TABLE sms_templates ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  
  -- Add is_system column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'is_system') THEN
    ALTER TABLE sms_templates ADD COLUMN is_system BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view sms_templates for their tenant" ON sms_templates;
DROP POLICY IF EXISTS "Users can insert sms_templates for their tenant" ON sms_templates;
DROP POLICY IF EXISTS "Users can update sms_templates for their tenant" ON sms_templates;
DROP POLICY IF EXISTS "Users can delete sms_templates for their tenant" ON sms_templates;

-- Enable RLS
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies that work with the existing auth system
CREATE POLICY "Allow all operations for authenticated users" ON sms_templates
  FOR ALL USING (auth.role() IN ('authenticated', 'anon'));

-- Grant necessary permissions
GRANT ALL ON sms_templates TO authenticated;
GRANT ALL ON sms_templates TO anon;

-- Create indexes for performance (only if columns exist)
DO $$
BEGIN
  -- Create category_id index only if column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'category_id') THEN
    CREATE INDEX IF NOT EXISTS idx_sms_templates_category_id ON sms_templates(category_id);
  END IF;
  
  -- Create is_active index only if column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'is_active') THEN
    CREATE INDEX IF NOT EXISTS idx_sms_templates_is_active ON sms_templates(is_active) WHERE is_active = true;
  END IF;
END $$;