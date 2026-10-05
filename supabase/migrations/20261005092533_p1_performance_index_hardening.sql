-- Phase 1 Stage 4: targeted performance index hardening.
-- Focus: tenant-scoped, frequently joined relationship columns only.

create index if not exists idx_accounts_payable_tenant_id
  on public.accounts_payable (tenant_id);

create index if not exists idx_attendance_sessions_tenant_id
  on public.attendance_sessions (tenant_id);
create index if not exists idx_attendance_sessions_event_id
  on public.attendance_sessions (event_id);
create index if not exists idx_attendance_sessions_service_id
  on public.attendance_sessions (service_id);

create index if not exists idx_budgets_tenant_id
  on public.budgets (tenant_id);
create index if not exists idx_budget_categories_budget_id
  on public.budget_categories (budget_id);

create index if not exists idx_giving_records_member_id
  on public.giving_records (member_id);
create index if not exists idx_giving_records_pledge_id
  on public.giving_records (pledge_id);

create index if not exists idx_messages_conversation_tenant
  on public.messages (conversation_id, tenant_id);

create index if not exists idx_announcement_comments_announcement_tenant
  on public.announcement_comments (announcement_id, tenant_id);
create index if not exists idx_announcement_comments_member_id
  on public.announcement_comments (member_id);
create index if not exists idx_announcement_comments_parent_id
  on public.announcement_comments (parent_id);

create index if not exists idx_announcement_reactions_announcement_tenant
  on public.announcement_reactions (announcement_id, tenant_id);
create index if not exists idx_announcement_reactions_member_id
  on public.announcement_reactions (member_id);

create index if not exists idx_announcement_read_receipts_announcement_tenant
  on public.announcement_read_receipts (announcement_id, tenant_id);
create index if not exists idx_announcement_read_receipts_member_id
  on public.announcement_read_receipts (member_id);

create index if not exists idx_events_branch_id
  on public.events (branch_id);
create index if not exists idx_services_branch_id
  on public.services (branch_id);

create index if not exists idx_facilities_tenant_id
  on public.facilities (tenant_id);
create index if not exists idx_facility_booking_responses_booking_tenant
  on public.facility_booking_responses (booking_id, tenant_id);

create index if not exists idx_families_head_of_family_id
  on public.families (head_of_family_id);

create index if not exists idx_service_attendance_visitor_id
  on public.service_attendance (visitor_id);

create index if not exists idx_volunteer_hours_role_tenant
  on public.volunteer_hours (role_id, tenant_id);

create index if not exists idx_appointments_staff_tenant
  on public.appointments (assigned_staff_id, tenant_id);
