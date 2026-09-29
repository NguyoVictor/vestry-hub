import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const allMigrations = () => readdirSync(resolve(process.cwd(), 'supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .map((name) => source(`supabase/migrations/${name}`))
  .join('\n');

describe('P1 Member Requests contract', () => {
  it('keeps member reads and open-request mutations self + tenant scoped', () => {
    const member = source('src/pages/member/MemberRequests.tsx');

    expect(member).toMatch(/member_requests[\s\S]*?\.eq\("member_id", member\.memberId\)[\s\S]*?\.eq\("tenant_id", member\.churchId\)/);
    expect(member).toMatch(/member_requests"\)\.update\([\s\S]*?\.eq\("id", editingId\)[\s\S]*?\.eq\("member_id", member\.memberId\)[\s\S]*?\.eq\("tenant_id", member\.churchId\)[\s\S]*?\.eq\("status", "open"\)/);
    expect(member).toMatch(/member_requests"\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\("id", id\)[\s\S]*?\.eq\("member_id", member\.memberId\)[\s\S]*?\.eq\("tenant_id", member\.churchId\)[\s\S]*?\.eq\("status", "open"\)/);
  });

  it('tenant-scopes Admin request writes and blocks read-only mutations', () => {
    const admin = source('src/pages/operations/MemberRequests.tsx');

    expect(admin).toMatch(/member_requests"\)\.update\([\s\S]*?\.eq\("id", editingId\)[\s\S]*?\.eq\("tenant_id", tenantId!?\)/);
    expect(admin).toMatch(/member_requests"\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\("id", id\)[\s\S]*?\.eq\("tenant_id", tenantId!?\)/);
    expect(admin).toMatch(/member_requests"\)[\s\S]*?\.update\(updates\)[\s\S]*?\.eq\("id", id\)[\s\S]*?\.eq\("tenant_id", tenantId!?\)/);
    expect(admin).toContain('if (readOnly) throw new Error("Read-only access");');
    expect(admin).toContain('disabled={readOnly}');
  });

  it('supports tenant-scoped internal notes, assignment, and resolution metadata for Admins', () => {
    const admin = source('src/pages/operations/MemberRequests.tsx');

    expect(admin).toContain('.from("member_request_notes")');
    expect(admin).toContain('.eq("tenant_id", tenantId)');
    expect(admin).toContain('tenant_id: tenantId');
    expect(admin).toContain('assigned_to: formData.assigned_to || null');
    expect(admin).toContain('resolution_notes: formData.resolution_notes || null');
  });

  it('hardens member_request_notes as authenticated tenant-staff data only', () => {
    const migrations = allMigrations();

    expect(migrations).toMatch(/alter table public\.member_request_notes[\s\S]*?add column if not exists tenant_id/);
    expect(migrations).toContain('drop policy if exists "mrn_tenant_rls" on public.member_request_notes');
    expect(migrations).toContain('revoke all on table public.member_request_notes from public, anon, authenticated');
    expect(migrations).toContain('member_request_notes_staff_read');
    expect(migrations).toContain('private.can_manage_events(tenant_id)');
    expect(migrations).toContain('member_request_notes_request_tenant_fkey');
  });
});
