// Phase 3 (Findings 2-6) schema contract. Unlike the earlier regex-only
// tests, this checks the columns each repaired flow WRITES against the
// generated schema (src/integrations/supabase/types.ts, regenerated from
// staging xwbajophstetbnnemsyq on 2026-11-20). If the code writes a column the
// database does not have, PostgREST returns 400 — exactly the reported bugs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
const types = read('src/integrations/supabase/types.ts');

function rowColumns(table: string): Set<string> {
  const publicStart = types.indexOf('public: {');
  const start = types.indexOf(`\n      ${table}: {\n        Row: {`, publicStart);
  if (start < 0) throw new Error(`table ${table} not in generated types`);
  const rowStart = types.indexOf('Row: {', start);
  const rowEnd = types.indexOf('\n        }', rowStart);
  return new Set([...types.slice(rowStart, rowEnd).matchAll(/^\s{10}(\w+)\??:/gm)].map((m) => m[1]));
}

const expectColumns = (table: string, cols: string[]) => {
  const have = rowColumns(table);
  for (const c of cols) expect(have.has(c), `${table}.${c} must exist`).toBe(true);
};

describe('Phase 3 schema contract (Findings 2-6)', () => {
  it('Finding 2: fellowship_members has no role column and no code selects it', () => {
    expect(rowColumns('fellowship_members').has('role')).toBe(false);
    for (const f of ['src/pages/people/FellowshipDetail.tsx', 'src/pages/member/MemberHouseFellowship.tsx']) {
      expect(read(f)).not.toMatch(/select\("[^"]*\brole\b[^"]*"\)/);
    }
    expectColumns('fellowship_members', ['fellowship_id', 'member_id', 'tenant_id', 'joined_at']);
  });

  it('Finding 2: add/remove refresh the overview member counts', () => {
    const src = read('src/pages/people/FellowshipDetail.tsx');
    expect(src.match(/\["fellowship-member-counts", tenantId\]/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('Finding 3: families are written with family_name and head_of_family_id', () => {
    expectColumns('families', ['family_name', 'head_of_family_id', 'tenant_id']);
    expect(rowColumns('families').has('name')).toBe(false);
    const src = read('src/pages/people/Families.tsx');
    expect(src).toMatch(/family_name: data\.name\.trim\(\)/);
    expect(src).not.toMatch(/head_of_household_id/);
    expect(src).toMatch(/if \(membersError\) throw membersError/);
    expectColumns('family_members', ['family_id', 'first_name', 'last_name', 'role', 'classification', 'member_id']);
  });

  it('Finding 4: Visitors components receive readOnly instead of referencing an out-of-scope name', () => {
    const src = read('src/pages/people/Visitors.tsx');
    expect(src).toMatch(/function AddVisitorSheet\(\{[^}]*\breadOnly\b[^}]*\}: AddVisitorSheetProps\)/);
    expect(src).toMatch(/onMutationSuccess, readOnly,\n\}: VisitorDetailsModalProps\)/);
    expect(src.match(/readOnly=\{readOnly\}/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('Finding 5: member_requests.resolved_by exists for status updates (and the field-guard trigger)', () => {
    expectColumns('member_requests', ['status', 'resolved_at', 'resolved_by']);
  });

  it('Finding 6: every column BoardMeetings saves exists on board_meetings', () => {
    const src = read('src/pages/operations/BoardMeetings.tsx');
    const payload = src.slice(src.indexOf('const payload: any = {'), src.indexOf('};', src.indexOf('const payload: any = {')));
    const keys = [...payload.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThanOrEqual(10);
    expectColumns('board_meetings', [...keys, 'tenant_id', 'created_by']);
    expectColumns('meeting_attendees', ['meeting_id', 'member_id', 'attendance_status', 'tenant_id']);
    expect(src).toMatch(/if \(attendeesError\) throw attendeesError/);
  });

  it('no repaired flow resolves silently when read-only (false success toasts)', () => {
    for (const f of ['src/pages/people/FellowshipDetail.tsx', 'src/pages/people/Families.tsx']) {
      expect(read(f)).not.toMatch(/mutationFn: async[^\n]*\n\s+if \(readOnly\) return;/);
    }
  });
});
