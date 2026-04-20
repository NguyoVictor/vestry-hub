-- Per-recipient delivery tracking for Africa's Talking
CREATE TABLE IF NOT EXISTS sms_recipients (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sms_history_id varchar NOT NULL REFERENCES sms_history(id) ON DELETE CASCADE,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  at_message_id varchar,           -- Africa's Talking messageId per recipient
  phone_number varchar NOT NULL,
  status varchar DEFAULT 'sent',   -- sent / delivered / failed / rejected / expired
  failure_reason varchar,
  network_code varchar,
  retry_count int DEFAULT 0,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_recipients_history ON sms_recipients(sms_history_id);
CREATE INDEX IF NOT EXISTS idx_sms_recipients_at_id ON sms_recipients(at_message_id);
CREATE INDEX IF NOT EXISTS idx_sms_recipients_tenant ON sms_recipients(tenant_id);
ALTER TABLE sms_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_recipients_tenant" ON sms_recipients FOR ALL USING (tenant_id = get_my_tenant_id());
