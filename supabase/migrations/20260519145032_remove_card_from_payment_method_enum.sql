-- Remove 'card' from payment_method_enum
-- Step 1: Remove default constraints temporarily
ALTER TABLE payroll_records ALTER COLUMN payment_method DROP DEFAULT;
ALTER TABLE payouts ALTER COLUMN payment_method DROP DEFAULT;

-- Step 2: Create new enum without 'card'
CREATE TYPE payment_method_enum_new AS ENUM ('cash', 'mpesa', 'bank_transfer');

-- Step 3: Update all tables to use the new enum
ALTER TABLE giving_records 
  ALTER COLUMN payment_method TYPE payment_method_enum_new 
  USING payment_method::text::payment_method_enum_new;

ALTER TABLE payroll_records 
  ALTER COLUMN payment_method TYPE payment_method_enum_new 
  USING payment_method::text::payment_method_enum_new;

ALTER TABLE payouts 
  ALTER COLUMN payment_method TYPE payment_method_enum_new 
  USING payment_method::text::payment_method_enum_new;

-- Step 4: Drop old enum and rename new one
DROP TYPE payment_method_enum;
ALTER TYPE payment_method_enum_new RENAME TO payment_method_enum;

-- Step 5: Restore default constraints
ALTER TABLE payroll_records ALTER COLUMN payment_method SET DEFAULT 'bank_transfer'::payment_method_enum;
ALTER TABLE payouts ALTER COLUMN payment_method SET DEFAULT 'bank_transfer'::payment_method_enum;;
