import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test.describe("P1 Children's Ministry contracts", () => {
  test('admin check-in and kiosk writes honor read-only mode', async () => {
    const checkin = source('src/pages/people/childrens-ministry/CMCheckin.tsx');
    const kiosk = source('src/pages/people/childrens-ministry/CMKiosk.tsx');

    expect(checkin).toContain("isReadOnly('member_management')");
    expect(checkin).toContain('.eq("tenant_id", tenantId!)');
    expect(kiosk).toContain("isReadOnly('member_management')");
    expect(kiosk).toContain('if (readOnly) return;');
  });

  test('guardian surface reads only tenant-owned linked children and QR/check-in records', async () => {
    const memberChildren = source('src/pages/member/MemberChildren.tsx');

    expect(memberChildren).toContain('.eq("tenant_id", member.churchId)');
    expect(memberChildren).toContain('guardian_primary_id.eq.${member.memberId}');
    expect(memberChildren).toContain('guardian_secondary_id.eq.${member.memberId}');
    expect(memberChildren).toContain('TABLES.CHILDREN_QR_CODES');
    expect(memberChildren).toContain('TABLES.CHILDREN_CHECKINS');
  });

  test('class and child management are tenant-scoped and permission-aware', async () => {
    const classes = source('src/pages/people/childrens-ministry/CMClasses.tsx');
    const children = source('src/pages/people/childrens-ministry/CMChildren.tsx');
    const register = source('src/pages/people/childrens-ministry/RegisterChildModal.tsx');

    expect(classes).toContain('count === 0 && !readOnly');
    expect(classes).toContain('readOnly={readOnly}');
    expect(children).toContain('readOnly={readOnly}');
    expect(register).toContain('if (readOnly) return;');
  });
});
