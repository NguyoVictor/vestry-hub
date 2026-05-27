-- Add 'cancelled' value to payment_status_enum
-- Covers Safaricom ResultCode 1032 (user cancelled) and 1037 (timeout)
ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'cancelled';
