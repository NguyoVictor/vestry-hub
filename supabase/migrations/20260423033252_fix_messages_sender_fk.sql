-- Drop the FK that forces sender_id to reference users(id)
-- Members use members.id as their sender_id, not users.id
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Also drop recipient_id FK for same reason
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;;
