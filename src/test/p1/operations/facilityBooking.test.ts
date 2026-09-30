import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const allMigrations = () => readdirSync(resolve(process.cwd(), 'supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .map((name) => source(`supabase/migrations/${name}`))
  .join('\n');

describe('P1 Facility Booking contract', () => {
  it('tenant-scopes Admin facility and booking mutations and blocks read-only writes', () => {
    const admin = source('src/pages/operations/FacilityBooking.tsx');

    expect(admin).toMatch(/FACILITIES as any\)\.update\(payload\)\.eq\(COLS\.ID, editData\.id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(admin).toMatch(/FACILITY_IMAGES as any\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\("facility_id", facilityId\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(admin).toMatch(/FACILITIES as any\)\.delete\(\)\.eq\(COLS\.ID, id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(admin).toMatch(/FACILITY_BOOKINGS\)\.update\(updates\)\.eq\(COLS\.ID, booking\.id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(admin).toMatch(/FACILITY_BOOKINGS\)\.update\(buildPayload\(values\) as any\)\.eq\(COLS\.ID, editData\.id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(admin).toMatch(/admin_deleted_at:[\s\S]*?\.eq\(COLS\.ID, id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(admin).toContain('readOnly: boolean');
    expect(admin).toContain('if (readOnly) throw new Error("Read-only access");');
    expect(admin).toContain('disabled={readOnly}');
  });

  it('keeps member create/read/withdraw self + tenant scoped', () => {
    const member = source('src/pages/member/MemberFacilityBooking.tsx');

    expect(member).toContain('source: "member"');
    expect(member).toContain('booker_type: "member"');
    expect(member).toContain('tenant_id: churchId');
    expect(member).toMatch(/FACILITY_BOOKINGS as any\)[\s\S]*?\.update\([\s\S]*?\.eq\(COLS\.ID, bookingId\)[\s\S]*?\.eq\(COLS\.TENANT_ID, churchId\)[\s\S]*?\.eq\("booked_by", memberId\)[\s\S]*?\.eq\("source", "member"\)[\s\S]*?\.eq\("status", "open"\)/);
  });

  it('keeps public booking creation explicit, pending, and bound to the selected tenant facility', () => {
    const publicPage = source('src/pages/public/PublicBookingPage.tsx');

    expect(publicPage).toContain('source: "external"');
    expect(publicPage).toContain('booker_type: values.external_org?.trim() ? "external_org" : "external_individual"');
    expect(publicPage).toContain('status: "open"');
    expect(publicPage).toContain('tenant_id: tenantId');
    expect(publicPage).toMatch(/FACILITIES as any\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId!\)[\s\S]*?\.eq\("is_active", true\)/);
  });

  it('retains concurrency-safe overlap protection and hardens anonymous public inserts', () => {
    const migrations = allMigrations();

    expect(migrations).toContain('guard_facility_booking_overlap');
    expect(migrations).toContain('pg_advisory_xact_lock');
    expect(migrations).toContain('facility_booking_conflict');
    expect(migrations).toMatch(/facility_bookings_public_insert[\s\S]*?source = 'external'[\s\S]*?status::text = 'open'/);
    expect(migrations).toMatch(/facility_bookings_public_insert[\s\S]*?approved_by is null[\s\S]*?approved_at is null/);
  });

  it('surfaces tenant-scoped booking responses and marks unread rows only for writable staff', () => {
    const admin = source('src/pages/operations/FacilityBooking.tsx');

    expect(admin).toContain('<TabsTrigger value="responses"');
    expect(admin).toContain('["facility-booking-responses", tenantId]');
    expect(admin).toMatch(/FACILITY_BOOKING_RESPONSES as any\)[\s\S]*?\.select\("\*"\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(admin).toContain('activeTab !== "responses" || readOnly');
    expect(admin).toMatch(/is_read: true[\s\S]*?\.in\(COLS\.ID, unreadIds\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(admin).toContain('<ResponseDetailModal');
  });

  it('binds facility images and booking responses to parents in the same tenant', () => {
    const migrations = allMigrations();

    expect(migrations).toContain('facility_images_facility_tenant_fkey');
    expect(migrations).toContain('foreign key (facility_id, tenant_id)');
    expect(migrations).toContain('facility_booking_responses_booking_tenant_fkey');
    expect(migrations).toContain('foreign key (booking_id, tenant_id)');
    expect(migrations).toContain('create or replace function private.can_read_facility_bookings');
    expect(migrations).toMatch(/can_read_facility_bookings[\s\S]*?not in \('member', 'guest'\)/);
    expect(migrations).toContain('using (private.can_read_facility_bookings(tenant_id))');
    expect(migrations).toContain('create or replace function private.can_manage_facility_bookings');
    expect(migrations).toContain('private.can_read_facility_bookings(p_tenant_id)');
    expect(migrations).toContain('private.can_manage_events(p_tenant_id)');
    expect(migrations).toContain('using (private.can_manage_facility_bookings(tenant_id))');
  });
});
