-- Prevent duplicate groups per tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_group_name_per_tenant'
  ) THEN
    ALTER TABLE groups ADD CONSTRAINT unique_group_name_per_tenant 
      UNIQUE (tenant_id, name);
  END IF;
END $$;
-- Prevent duplicate events per tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_event_title_date_per_tenant'
  ) THEN
    ALTER TABLE events ADD CONSTRAINT unique_event_title_date_per_tenant 
      UNIQUE (tenant_id, title, event_date);
  END IF;
END $$;
-- Prevent duplicate group memberships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_group_member'
  ) THEN
    ALTER TABLE group_members ADD CONSTRAINT unique_group_member 
      UNIQUE (group_id, member_id);
  END IF;
END $$;
-- Prevent duplicate family memberships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_family_member'
  ) THEN
    ALTER TABLE family_members ADD CONSTRAINT unique_family_member 
      UNIQUE (family_id, member_id);
  END IF;
END $$;
-- Prevent duplicate RSVP entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_event_rsvp'
  ) THEN
    ALTER TABLE event_rsvps ADD CONSTRAINT unique_event_rsvp 
      UNIQUE (event_id, member_id);
  END IF;
END $$;
-- Prevent duplicate families per tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_family_name_per_tenant'
  ) THEN
    ALTER TABLE families ADD CONSTRAINT unique_family_name_per_tenant 
      UNIQUE (tenant_id, family_name);
  END IF;
END $$;
-- Prevent duplicate member emails per tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_member_email_per_tenant'
  ) THEN
    ALTER TABLE members ADD CONSTRAINT unique_member_email_per_tenant 
      UNIQUE (tenant_id, email);
  END IF;
END $$;
