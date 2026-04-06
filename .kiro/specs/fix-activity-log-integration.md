# Fix: Recent Activity Feed Integration

## Problem
The Recent Activity section on the Dashboard is showing "Activity tracking
coming soon" because:
1. The `activity_log` table may not exist in Supabase
2. Nothing in the app is writing to it
3. The dashboard component is not querying it correctly
4. There is no Realtime subscription for live updates

## What to fix

### Step 1 — Run the database migration
Create the `activity_log` table exactly as defined below.
Enable RLS. Enable Realtime publication on the table.

### Step 2 — Create the activity logger utility
Create `src/lib/activityLogger.ts` with a `logActivity()` function
that inserts into `activity_log`. This function must:
- Never throw errors (activity logging must not break main actions)
- Always be called AFTER the main mutation succeeds (in onSuccess)
- Accept: churchId, actionType, description, actorId, actorName,
  entityType, entityId, entityName, metadata

### Step 3 — Wire logActivity() into every mutation's onSuccess
Add logActivity() calls to the onSuccess of these mutations:
- Add Member → action_type: 'new_member'
- Edit Member → action_type: 'member_updated'
- Remove Member → action_type: 'member_removed'
- Record Donation → action_type: 'new_donation'
- Create Event → action_type: 'new_event'
- Cancel Event → action_type: 'event_cancelled'
- Create Group → action_type: 'new_group'
- Post Announcement → action_type: 'new_announcement'
- Log Visitor → action_type: 'new_visitor'
- Convert Visitor to Member → action_type: 'visitor_converted'
- Add Convert → action_type: 'new_convert'
- Advance Discipleship Stage → action_type: 'stage_advanced'
- Graduate Convert → action_type: 'convert_graduated'
- Mark Baptism Complete → action_type: 'baptism_completed'
- Record Attendance → action_type: 'attendance_recorded'
- Approve Expense → action_type: 'expense_approved'
- Process Payroll → action_type: 'payroll_processed'
- Submit Member Request → action_type: 'new_request'
- Resolve Member Request → action_type: 'request_resolved'
- Publish Testimony → action_type: 'testimony_published'
- Send Broadcast → action_type: 'new_broadcast'

### Step 4 — Fix the dashboard activity feed component
The Recent Activity card on the dashboard must:
- Use the useActivityLog(10) hook to fetch data
- Show a skeleton loader (5 rows) while loading
- Show each entry: actor avatar (MemberAvatar size="sm") + description
  text + relative timestamp (date-fns formatDistanceToNow)
- Show a colored icon badge per action_type:
  - new_member, member_updated → indigo Users icon
  - new_donation → emerald CreditCard icon
  - new_event, event_updated → violet CalendarDays icon
  - new_announcement → amber Megaphone icon
  - new_visitor, visitor_converted → cyan UserPlus icon
  - new_convert, stage_advanced, convert_graduated → indigo Sparkles icon
  - attendance_recorded → emerald CheckCircle icon
  - new_request, request_resolved → orange MessageSquare icon
  - new_broadcast → blue Send icon
  - all others → slate Activity icon
- Subscribe to Supabase Realtime on activity_log INSERT events
  filtered to church_id — invalidate the query on new events
- Show "No recent activity" empty state with Activity icon if no data

### Step 5 — Database migration SQL
```sql
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'new_member',
    'member_updated',
    'member_removed',
    'new_donation',
    'new_event',
    'event_updated',
    'event_cancelled',
    'new_group',
    'new_announcement',
    'announcement_published',
    'new_visitor',
    'visitor_converted',
    'new_convert',
    'stage_advanced',
    'convert_graduated',
    'baptism_completed',
    'checkin_logged',
    'new_expense',
    'expense_approved',
    'payroll_processed',
    'new_request',
    'request_resolved',
    'new_testimony',
    'testimony_published',
    'new_broadcast',
    'new_service',
    'attendance_recorded',
    'new_pledge',
    'booking_approved',
    'new_incident',
    'system'
  )),
  description TEXT NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name TEXT,
  actor_avatar_url TEXT,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Church members can view activity log"
  ON activity_log FOR SELECT
  USING (church_id IN (
    SELECT church_id FROM church_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can insert activity log entries"
  ON activity_log FOR INSERT
  WITH CHECK (church_id IN (
    SELECT church_id FROM church_members
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'staff')
  ));

CREATE INDEX idx_activity_log_church_time
  ON activity_log(church_id, created_at DESC);

-- Enable Realtime so new entries appear instantly on the dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
```