import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const allMigrations = () => readdirSync(resolve(process.cwd(), 'supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .map((name) => source(`supabase/migrations/${name}`))
  .join('\n');

describe('P1 A6 Appointments + Testimonies contract', () => {
  it('keeps member appointment creation tenant-bound and creates Jitsi only through the active staff lifecycle', () => {
    const member = source('src/pages/member/MemberAppointments.tsx');
    const admin = source('src/pages/engagement/Appointments.tsx');
    const migrations = allMigrations();

    expect(member).toContain('.eq(COLS.TENANT_ID, member.churchId)');
    expect(member).not.toMatch(/status:\s*'pending'[\s\S]{0,120}jitsi_room_name/);
    expect(member).toContain("apt.jitsi_room_name && (apt.status === 'confirmed' || apt.status === 'rescheduled')");
    expect(admin).toContain("status === 'confirmed' || status === 'rescheduled'");
    expect(admin).toContain("apt.status === 'confirmed' || apt.status === 'rescheduled'");
    expect(migrations).toMatch(/appointments_member_insert[\s\S]*?jitsi_room_name is null/);
    expect(migrations).toContain('appointments_staff_tenant_fkey');
  });

  it('tenant-scopes appointment admin lifecycle mutations and blocks read-only writes', () => {
    const admin = source('src/pages/engagement/Appointments.tsx');
    const settings = source('src/pages/settings/AppointmentTypes.tsx');

    expect(admin).toContain("const readOnly = isReadOnly('communication_tools')");
    expect(admin).toContain('readOnly={readOnly}');
    expect(admin).toContain('if (readOnly) throw new Error');
    expect(admin).toMatch(/APPOINTMENTS\)\.update\(payload\)[\s\S]*?\.eq\('id', apt\.id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(settings).toMatch(/APPOINTMENT_TYPES\)[\s\S]*?\.update\([\s\S]*?\.eq\('id', editData\.id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(settings).toMatch(/APPOINTMENT_TYPES\)\.delete\(\)\.eq\('id', id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
  });

  it('uses staff-only engagement boundaries for appointment and testimony admin data', () => {
    const migrations = allMigrations();

    expect(migrations).toMatch(/appointments_staff_read[\s\S]*?can_read_engagement_staff/);
    expect(migrations).toMatch(/appointment_types_staff_read[\s\S]*?can_read_engagement_staff/);
    expect(migrations).toMatch(/testimonies_staff_read[\s\S]*?can_read_engagement_staff/);
    expect(migrations).toMatch(/testimony_categories_staff_read[\s\S]*?can_read_engagement_staff/);
    expect(migrations).toMatch(/testimony_reactions_staff_read[\s\S]*?can_read_engagement_staff/);
    expect(migrations).toMatch(/appointments_staff_update[\s\S]*?can_manage_engagement_staff/);
    expect(migrations).toMatch(/testimonies_staff_update[\s\S]*?can_manage_engagement_staff/);
  });

  it('hardens testimony member identity, moderation, categories and reactions by tenant', () => {
    const admin = source('src/pages/communications/Testimonies.tsx');
    const member = source('src/pages/member/MemberTestimonies.tsx');
    const migrations = allMigrations();

    expect(admin).toContain('if (readOnly) throw new Error');
    expect(admin).toMatch(/TESTIMONIES\)[\s\S]*?\.update\([\s\S]*?\.eq\(COLS\.ID, id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(admin).toContain('is_approved: status === "published"');
    expect(admin).toContain('approved_by: status === "published" ? userId : null');
    expect(member).toMatch(/member-testimonies-mine[\s\S]*?\.eq\("member_id", member\.memberId\)[\s\S]*?\.eq\(COLS\.TENANT_ID, member\.churchId\)/);
    expect(member).toMatch(/TESTIMONY_REACTIONS\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\("testimony_id", testimonyId\)[\s\S]*?\.eq\("tenant_id", member\.tenantId\)/);
    expect(member).toMatch(/TESTIMONIES\)\.delete\(\)\.eq\(COLS\.ID, id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, member\.churchId\)/);
    expect(migrations).toContain('testimonies_member_tenant_fkey');
    expect(migrations).toContain('testimonies_category_tenant_fkey');
    expect(migrations).toContain('testimony_reactions_testimony_tenant_fkey');
    expect(migrations).toContain('testimony_reactions_member_tenant_fkey');
  });

  it('keeps appointment admin notes and anonymous testimony identities out of member API responses', () => {
    const appointments = source('src/pages/member/MemberAppointments.tsx');
    const testimonies = source('src/pages/member/MemberTestimonies.tsx');
    const migrations = allMigrations();

    expect(appointments).not.toMatch(/select\([^)]*admin_notes/);
    expect(testimonies).toContain("rpc('get_member_published_testimonies'");
    expect(migrations).toContain('revoke select on table public.appointments from anon');
    expect(migrations).toContain('create or replace function private.get_member_published_testimonies');
    expect(migrations).toMatch(/testimonies_member_read[\s\S]*?not is_anonymous/);
    expect(migrations).toMatch(/testimony_reactions_member_read[\s\S]*?member_id = private\.member_session_member_id/);
    expect(migrations).toMatch(/public\.get_member_published_testimonies[\s\S]*?security invoker/);
  });
});
