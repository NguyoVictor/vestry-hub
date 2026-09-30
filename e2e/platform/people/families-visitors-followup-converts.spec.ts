import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test.describe('P1 Families/Visitors/Follow-Up/New Converts contracts', () => {
  test('family detail writes are read-only aware and tenant-scoped', async () => {
    const detail = source('src/pages/people/FamilyDetailPage.tsx');
    const notes = source('src/components/families/FamilyNotesTab.tsx');

    expect(detail).toContain('readOnly={readOnly}');
    expect(notes).toContain('if (readOnly) return;');
    expect(notes).toContain(".eq('tenant_id', tenantId)");
  });

  test('visitor conversions are transactional RPC workflows', async () => {
    const visitors = source('src/pages/people/Visitors.tsx');
    const migration = source('supabase/migrations/20260923122111_p1_people_lifecycle_atomic_rpcs.sql');

    expect(visitors).toContain('.rpc("convert_visitor_to_new_convert"');
    expect(visitors).toContain('.rpc("convert_visitor_to_member"');
    expect(migration).toContain('for update;');
    expect(migration).toContain('security invoker');
  });

  test('follow-up and convert mutations explicitly retain tenant ownership', async () => {
    const followUps = source('src/pages/people/FollowUpTasks.tsx');
    const converts = source('src/pages/people/NewConverts.tsx');

    expect(followUps).toContain('.eq("tenant_id", tenantId!)');
    expect(converts).toContain('.eq("tenant_id", tenantId!)');
  });
});
