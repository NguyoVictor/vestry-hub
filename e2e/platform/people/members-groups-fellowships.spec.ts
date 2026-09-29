import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test.describe('P1 Members/Groups/Fellowships parity contracts', () => {
  test('member join request and admin approval share the same tenant-owned records', async () => {
    const memberGroups = source('src/pages/member/MemberGroups.tsx');
    const groupDetail = source('src/pages/people/GroupDetail.tsx');

    expect(memberGroups).toContain('tenant_id: member.churchId');
    expect(groupDetail).toContain('tenant_id: tenantId');
    expect(groupDetail).toContain('status: "approved"');
    expect(groupDetail.indexOf('GROUP_MEMBERS).insert')).toBeLessThan(groupDetail.indexOf('status: "approved"'));
  });

  test('member fellowship RSVP and admin attendance use tenant-bound fellowship records', async () => {
    const memberFellowship = source('src/pages/member/MemberHouseFellowship.tsx');
    const adminFellowship = source('src/pages/people/FellowshipDetail.tsx');

    expect(memberFellowship).toContain('TABLES.FELLOWSHIP_RSVP');
    expect(memberFellowship).toContain('tenant_id: member.churchId');
    expect(adminFellowship).toContain('TABLES.FELLOWSHIP_ATTENDANCE');
    expect(adminFellowship).toContain('.eq(COLS.TENANT_ID, tenantId!)');
  });
});
