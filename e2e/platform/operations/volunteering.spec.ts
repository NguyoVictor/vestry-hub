import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migrations = () => readdirSync(resolve(process.cwd(), 'supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .map((name) => source(`supabase/migrations/${name}`))
  .join('\n');

test.describe('P1 Volunteering parity contracts', () => {
  test('member self-service is tenant-owned and database errors are surfaced', async () => {
    const member = source('src/pages/member/MemberVolunteer.tsx');
    expect(member).toContain('role.tenant_id !== member.churchId');
    expect(member).toContain('tenant_id: member.churchId');
    expect(member).toContain('.eq(COLS.TENANT_ID, member.churchId)');
    expect(member).toContain('if (error) throw error;');
  });

  test('Admin writes and export remain tenant-scoped', async () => {
    const admin = source('src/pages/operations/Volunteering.tsx');
    expect(admin).toContain('.eq(COLS.TENANT_ID, tenantId)');
    expect(admin).toContain('a.tenant_id === tenantId');
    expect(admin).toContain('tenantId={tenantId}');
  });

  test('database protects duplicates, capacity, and volunteer-hours writes', async () => {
    const sql = migrations();
    expect(sql).toContain('volunteers_role_member_unique');
    expect(sql).toContain('enforce_volunteer_role_capacity');
    expect(sql).toContain('private.can_manage_events(tenant_id)');
    expect(sql).toContain('volunteer_hours_staff_insert');
  });
});
