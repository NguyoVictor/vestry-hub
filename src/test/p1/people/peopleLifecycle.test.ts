import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('P1 People lifecycle contract', () => {
  it('tenant-scopes family mutations and blocks read-only family notes', () => {
    const families = source('src/pages/people/Families.tsx');
    const detail = source('src/pages/people/FamilyDetailPage.tsx');
    const notes = source('src/components/families/FamilyNotesTab.tsx');

    expect(families).toMatch(/update\(\{ name: data\.name[\s\S]*?\.eq\("id", editingFamily\.id\)[\s\S]*?\.eq\("tenant_id", tenantId!\)/);
    expect(families).toMatch(/families"\)\.delete\(\)\.eq\("id", id\)\.eq\("tenant_id", tenantId!\)/);
    expect(detail).toContain('<FamilyNotesTab family={family} tenantId={tenantId!} readOnly={readOnly} />');
    expect(notes).toContain('if (readOnly) return;');
    expect(notes).toMatch(/\.eq\('id', family\.id\)[\s\S]*?\.eq\('tenant_id', tenantId\)/);
  });

  it('uses transactional RPCs for visitor conversion targets', () => {
    const visitors = source('src/pages/people/Visitors.tsx');

    expect(visitors).toContain('.rpc("convert_visitor_to_new_convert"');
    expect(visitors).toContain('.rpc("convert_visitor_to_member"');
    expect(visitors).not.toMatch(/NEW_CONVERTS\)\.insert\([\s\S]*?visitor_id:/);
  });

  it('keeps visitor lifecycle RPCs tenant-safe and non-privileged', () => {
    const migration = source('supabase/migrations/20260923122111_p1_people_lifecycle_atomic_rpcs.sql');

    expect(migration).toContain('security invoker');
    expect(migration).toContain('if not private.can_manage_people(v_visitor.tenant_id)');
    expect(migration).toContain('references public.members(id, tenant_id)');
    expect(migration).toContain('references public.visitors(id, tenant_id)');
    expect(migration).toContain('revoke all on function public.convert_visitor_to_member(varchar)');
    expect(migration).toContain('to authenticated, service_role');
  });

  it('tenant-scopes follow-up and new-convert mutations', () => {
    const followUps = source('src/pages/people/FollowUpTasks.tsx');
    const converts = source('src/pages/people/NewConverts.tsx');

    expect(followUps).toMatch(/update\(\{ \.\.\.values[\s\S]*?\.eq\("id", editingTask\.id\)[\s\S]*?\.eq\("tenant_id", tenantId!\)/);
    expect(followUps).toMatch(/delete\(\)\.eq\("id", id\)\.eq\("tenant_id", tenantId!\)/);
    expect(converts).toMatch(/\.eq\("id", editingConvert\.id\)\.eq\("tenant_id", tenantId!\)/);
    expect(converts).toMatch(/delete\(\)\.eq\("id", id\)\.eq\("tenant_id", tenantId!\)/);
  });
});
