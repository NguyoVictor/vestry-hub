import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test.describe('P1 Events/RSVP parity contracts', () => {
  test('members only load published tenant events and respect RSVP enablement', async () => {
    const member = source('src/pages/member/MemberEvents.tsx');

    expect(member).toContain('.eq("tenant_id", churchId)');
    expect(member).toContain('.eq("is_published", true)');
    expect(member).toContain('selfServiceEnabled: e.allow_rsvp !== false');
    expect(member).toContain('{isEvent && item.selfServiceEnabled && (');
  });

  test('member RSVP writes are tenant-owned and surface database rejection', async () => {
    const member = source('src/pages/member/MemberEvents.tsx');

    expect(member).toContain('tenant_id: churchId');
    expect(member).toContain('.eq("tenant_id", churchId)');
    expect(member).toContain('if (error) throw error;');
  });

  test('database enforces duplicate, capacity, and allow_rsvp rules', async () => {
    const base = source('supabase/migrations/20260923092507_p1_operations_reconciliation.sql');
    const flags = source('supabase/migrations/20260923124104_p1_operations_self_service_flags.sql');

    expect(base).toContain('event_rsvps_member_unique');
    expect(base).toContain('event_rsvp_capacity_guard');
    expect(base).toContain('Event capacity reached.');
    expect(flags).toContain('e.allow_rsvp=true');
    expect(flags).toContain('s.allow_attendance=true');
  });
});
