import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const allMigrations = () => readdirSync(resolve(process.cwd(), 'supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .map((name) => source(`supabase/migrations/${name}`))
  .join('\n');

describe('P1 Volunteering and export contract', () => {
  it('tenant-scopes Admin role, assignment, and hours mutations', () => {
    const admin = source('src/pages/operations/Volunteering.tsx');

    expect(admin).toMatch(/VOLUNTEER_ROLES\)\.update\([\s\S]*?\.eq\("id", editRole\.id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(admin).toMatch(/VOLUNTEER_ROLES\)\.delete\(\)\.eq\("id", id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(admin).toMatch(/VOLUNTEERS\)\.update\(\{ status: "inactive" \}[\s\S]*?\.eq\("id", id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
    expect(admin).toMatch(/VOLUNTEERS\)[\s\S]*?\.delete\(\)\.eq\("id", id\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId\)/);
  });

  it('keeps member signup and withdrawal self+tenant scoped and surfaces database errors', () => {
    const member = source('src/pages/member/MemberVolunteer.tsx');

    expect(member).toContain('role.tenant_id !== member.churchId');
    expect(member).toMatch(/VOLUNTEERS\)[\s\S]*?\.select\("id, role_id, hours_served"\)[\s\S]*?\.eq\("member_id", member\.memberId\)[\s\S]*?\.eq\(COLS\.TENANT_ID, member\.churchId\)/);
    expect(member).toMatch(/VOLUNTEERS\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\("member_id", member\.memberId\)[\s\S]*?\.eq\("role_id", roleId\)[\s\S]*?\.eq\(COLS\.TENANT_ID, member\.churchId\)/);
    expect(member).toContain('if (error) throw error;');
  });

  it('enforces duplicate and concurrent role capacity in the database', () => {
    const migrations = allMigrations();

    expect(migrations).toContain('volunteers_role_member_unique');
    expect(migrations).toContain('enforce_volunteer_role_capacity');
    expect(migrations).toContain('Volunteer role capacity reached.');
    expect(migrations).toContain('for update');
    expect(migrations).toContain('refresh_volunteer_assignment_hours');
  });

  it('filters exported volunteer rows to the current tenant', () => {
    const admin = source('src/pages/operations/Volunteering.tsx');

    expect(admin).toContain('function ReportsTab({ assignments, roles, memberRecords, tenantId }: any)');
    expect(admin).toContain('const tenantAssignments = (assignments || []).filter((a: any) => a.tenant_id === tenantId);');
    expect(admin).toContain('const rows = tenantAssignments.map((a: any) => {');
    expect(admin).toContain('<ReportsTab roles={roles} assignments={assignments} memberRecords={memberRecords} tenantId={tenantId} />');
  });
});
