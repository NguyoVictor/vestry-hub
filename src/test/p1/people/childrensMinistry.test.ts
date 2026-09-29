import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe("P1 Children's Ministry parity contract", () => {
  it('blocks read-only admin check-in mutations and tenant-scopes checkout', () => {
    const checkin = source('src/pages/people/childrens-ministry/CMCheckin.tsx');

    expect(checkin).toContain("const readOnly = isReadOnly('member_management')");
    expect(checkin).toMatch(/mutationFn: async \(\{ childId[\s\S]*?if \(readOnly\) return;/);
    expect(checkin).toMatch(/update\(\{ checked_out_at:[\s\S]*?\.eq\("id", checkinId\)[\s\S]*?\.eq\("tenant_id", tenantId!\)/);
    expect(checkin).toContain('if (readOnly) return; // QR check-in');
  });

  it('prevents read-only class/child writes and tenant-scopes mutations', () => {
    const classes = source('src/pages/people/childrens-ministry/CMClasses.tsx');
    const children = source('src/pages/people/childrens-ministry/CMChildren.tsx');
    const register = source('src/pages/people/childrens-ministry/RegisterChildModal.tsx');

    expect(classes).toContain('count === 0 && !readOnly');
    expect(classes).toMatch(/delete\(\)\.eq\("id", id\)\.eq\("tenant_id", tenantId!\)/);
    expect(classes).toContain('readOnly={readOnly}');
    expect(children).toMatch(/update\(\{ active: false \} as any\)\.eq\("id", id\)\.eq\("tenant_id", tenantId!\)/);
    expect(children).toContain('readOnly={readOnly}');
    expect(register).toContain('if (readOnly) return;');
  });

  it('blocks read-only kiosk writes and scopes member QR reads to tenant', () => {
    const kiosk = source('src/pages/people/childrens-ministry/CMKiosk.tsx');
    const memberChildren = source('src/pages/member/MemberChildren.tsx');

    expect(kiosk).toContain("const readOnly = isReadOnly('member_management')");
    expect(kiosk).toMatch(/mutationFn: async \(\{ childId[\s\S]*?if \(readOnly\) return;/);
    expect(memberChildren).toMatch(/CHILDREN_QR_CODES[\s\S]*?\.in\("child_id", childIds\)[\s\S]*?\.eq\("tenant_id", member\.churchId\)/);
  });

  it('keeps reports export behind reports_analytics', () => {
    const reports = source('src/pages/people/childrens-ministry/CMReports.tsx');

    expect(reports).toContain("isReadOnly('reports_analytics')");
    expect(reports).toContain('readOnly={reportsReadOnly}');
  });
});
