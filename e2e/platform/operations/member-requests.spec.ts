import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test.describe('P1 Member Requests parity contracts', () => {
  test('member self-service stays own-request and tenant scoped', async () => {
    const member = source('src/pages/member/MemberRequests.tsx');
    expect(member).toContain('.eq("member_id", member.memberId)');
    expect(member).toContain('.eq("tenant_id", member.churchId)');
    expect(member).toContain('.eq("status", "open")');
  });

  test('Admin request workflow is tenant scoped and read-only aware', async () => {
    const admin = source('src/pages/operations/MemberRequests.tsx');
    expect(admin).toContain('if (readOnly) throw new Error("Read-only access");');
    expect(admin).toContain('.eq("tenant_id", tenantId!)');
    expect(admin).toContain('assigned_to: formData.assigned_to || null');
    expect(admin).toContain('resolution_notes: formData.resolution_notes || null');
  });

  test('internal notes are staff-only and tenant-bound in the database', async () => {
    const sql = source('supabase/migrations/20260923132908_p1_member_request_notes_hardening.sql');
    expect(sql).toContain('revoke all on table public.member_request_notes from public, anon, authenticated');
    expect(sql).toContain('member_request_notes_staff_read');
    expect(sql).toContain('private.can_manage_events(tenant_id)');
    expect(sql).toContain('member_request_notes_request_tenant_fkey');
  });
});
