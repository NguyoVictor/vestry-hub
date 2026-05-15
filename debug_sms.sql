-- Check recent SMS history and failure reasons
SELECT 
  h.message,
  h.recipient_count,
  h.delivered_count,
  h.failed_count,
  h.status as history_status,
  h.sent_at,
  r.phone_number,
  r.status as recipient_status,
  r.failure_reason,
  r.network_code
FROM sms_history h
LEFT JOIN sms_recipients r ON h.id = r.sms_history_id
WHERE h.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY h.created_at DESC, r.created_at DESC
LIMIT 10;