import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('P1 Services and attendance contract', () => {
  it('keeps service publish state coherent and tenant-scopes admin mutations', () => {
    const services = source('src/pages/operations/Services.tsx');

    expect(services).toContain('is_published: formData.status === "published"');
    expect(services).toContain('is_published: editForm.status === "published"');
    expect(services).toMatch(/delete\(\)\.eq\("id", id\)\.eq\("tenant_id", tenantId!\)/);
    expect(services).toMatch(/update\(\{ status, is_published: status === "published" \} as any\)\.eq\("id", id\)\.eq\("tenant_id", tenantId!\)/);
  });

  it('shows members only published services and scopes own attendance records', () => {
    const memberEvents = source('src/pages/member/MemberEvents.tsx');

    expect(memberEvents).toMatch(/TABLES\.SERVICES[\s\S]*?\.eq\(COLS\.TENANT_ID, member\.churchId\)[\s\S]*?\.eq\("status", "published"\)[\s\S]*?\.eq\("is_published", true\)/);
    expect(memberEvents).toMatch(/SERVICE_ATTENDANCE[\s\S]*?\.eq\("member_id", memberId\)[\s\S]*?\.eq\("tenant_id", churchId\)/);
    expect(memberEvents).toMatch(/SERVICE_ATTENDANCE\)\.update\(\{ status: newStatus \}\)\.eq\("id", attendance\.id\)\.eq\("tenant_id", churchId\)/);
  });

  it('retains recovered service/attendance RLS migration in source', () => {
    const migration = source('supabase/migrations/20260923092507_p1_operations_reconciliation.sql');
    expect(migration).toContain('services_member_read');
    expect(migration).toContain('service_attendance_member_insert');
    expect(migration).toContain('private.member_session_member_id(tenant_id)');
  });
});
