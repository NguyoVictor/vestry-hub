import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('P1 Members, Groups, and House Fellowships parity contract', () => {
  it('scopes admin member mutations to the active tenant', () => {
    const members = source('src/pages/people/Members.tsx');
    const profile = source('src/pages/people/MemberProfile.tsx');

    expect(members).toMatch(/update\(\{ status: "inactive" \}\)\.eq\("id", id\)\.eq\("tenant_id", tenantId!\)/);
    expect(profile).toMatch(/\.update\(updateData\)[\s\S]*?\.eq\("id", memberId!\)[\s\S]*?\.eq\("tenant_id", tenantId!\)/);
  });

  it('creates member join requests with explicit tenant ownership', () => {
    const memberGroups = source('src/pages/member/MemberGroups.tsx');

    expect(memberGroups).toMatch(/insert\(\{[\s\S]*?group_id: groupId,[\s\S]*?member_id: member\.memberId,[\s\S]*?tenant_id: member\.churchId,[\s\S]*?status: "pending"/);
  });

  it('tenant-scopes group membership and join-request mutations', () => {
    const detail = source('src/pages/people/GroupDetail.tsx');

    expect(detail).toMatch(/delete\(\)\.eq\("group_id", groupId!\)\.eq\("member_id", memberId\)\.eq\(COLS\.TENANT_ID, tenantId!\)/);
    expect(detail).toMatch(/update\(\{ leader_id: memberId \} as any\)\.eq\("id", groupId!\)\.eq\(COLS\.TENANT_ID, tenantId!\)/);
    expect(detail).toMatch(/update\(\{ status: "approved" \} as any\)\.eq\("id", requestId\)\.eq\(COLS\.TENANT_ID, tenantId!\)/);
    expect(detail).toMatch(/update\(\{ status: "declined" \} as any\)\.eq\("id", requestId\)\.eq\(COLS\.TENANT_ID, tenantId!\)/);
    expect(detail.indexOf('GROUP_MEMBERS).insert')).toBeLessThan(detail.indexOf('status: "approved"'));
  });

  it('keeps member fellowship reads tenant-scoped while RSVP writes carry tenant ownership', () => {
    const memberFellowship = source('src/pages/member/MemberHouseFellowship.tsx');

    expect(memberFellowship).toMatch(/FELLOWSHIP_MEMBERS[\s\S]*?eq\("member_id", member\.memberId\)[\s\S]*?eq\(COLS\.TENANT_ID, member\.churchId\)/);
    expect(memberFellowship).toMatch(/FELLOWSHIP_RSVP[\s\S]*?eq\("member_id", member\.memberId\)[\s\S]*?eq\(COLS\.TENANT_ID, member\.churchId\)/);
    expect(memberFellowship).toContain('tenant_id: member.churchId');
  });

  it('enforces read-only and tenant scope on fellowship mutations', () => {
    const list = source('src/pages/people/HouseFellowships.tsx');
    const detail = source('src/pages/people/FellowshipDetail.tsx');

    expect(list).toMatch(/const handleSave = async \(\) => \{\s*if \(readOnly\) return;/);
    expect(list).toMatch(/delete\(\)\.eq\("id", id\)\.eq\(COLS\.TENANT_ID, tenantId!\)/);
    expect(detail).toMatch(/delete\(\)\.eq\("fellowship_id", fellowshipId!\)\.eq\("member_id", memberId\)[\s\S]*?\.eq\(COLS\.TENANT_ID, tenantId!\)/);
    expect(detail).toMatch(/update\(\{ leader_id: memberId \} as any\)\.eq\("id", fellowshipId!\)\.eq\(COLS\.TENANT_ID, tenantId!\)/);
  });
});
