import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = path.join(root, 'supabase/migrations/20261005092533_p1_performance_index_hardening.sql');
if (!fs.existsSync(migration)) throw new Error('Stage 4 performance migration is missing');
const sql = fs.readFileSync(migration, 'utf8');
const expected = [
  'idx_accounts_payable_tenant_id',
  'idx_attendance_sessions_tenant_id',
  'idx_attendance_sessions_event_id',
  'idx_attendance_sessions_service_id',
  'idx_budgets_tenant_id',
  'idx_budget_categories_budget_id',
  'idx_giving_records_member_id',
  'idx_giving_records_pledge_id',
  'idx_messages_conversation_tenant',
  'idx_announcement_comments_announcement_tenant',
  'idx_announcement_comments_member_id',
  'idx_announcement_comments_parent_id',
  'idx_announcement_reactions_announcement_tenant',
  'idx_announcement_reactions_member_id',
  'idx_announcement_read_receipts_announcement_tenant',
  'idx_announcement_read_receipts_member_id',
  'idx_events_branch_id',
  'idx_services_branch_id',
  'idx_facilities_tenant_id',
  'idx_facility_booking_responses_booking_tenant',
  'idx_families_head_of_family_id',
  'idx_service_attendance_visitor_id',
  'idx_volunteer_hours_role_tenant',
  'idx_appointments_staff_tenant',
];
for (const name of expected) {
  if (!sql.includes(name)) throw new Error(`Missing expected Stage 4 index: ${name}`);
}
if ((sql.match(/create index if not exists/gi) || []).length !== expected.length) {
  throw new Error('Unexpected Stage 4 index count');
}
console.log(`performance index contract: PASS (${expected.length}/${expected.length})`);
