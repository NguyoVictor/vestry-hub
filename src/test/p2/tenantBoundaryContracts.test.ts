import { describe, expect, it } from 'vitest';
import { tenantSlugMatchesHostname } from '@/lib/tenantHost';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const people = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260923100304_p1_people_permission_parity.sql'), 'utf8');
const messaging = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260929135342_p1_messaging_participant_storage_realtime_hardening.sql'), 'utf8');
const queue = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260930110332_p2_communication_queue_foundation.sql'), 'utf8');

describe('P2 tenant boundary contracts', () => {
  it('rejects hostname/session tenant mismatch', () => {
    expect(tenantSlugMatchesHostname('tenant-b.vestryhub.com', 'tenant-a', 'vestryhub.com')).toBe(false);
    expect(tenantSlugMatchesHostname('tenant-a.vestryhub.com', 'tenant-a', 'vestryhub.com')).toBe(true);
  });

  it('retains tenant-aware People and Messaging RLS foundations', () => {
    expect(people).toMatch(/tenant/i);
    expect(people).toMatch(/policy/i);
    expect(messaging).toMatch(/participant/i);
    expect(messaging).toMatch(/tenant/i);
  });

  it('does not expose queue internals to tenant clients', () => {
    expect(queue).toMatch(/revoke all on table public\.communication_jobs from public, anon, authenticated/i);
    expect(queue).toMatch(/revoke all on table public\.communication_job_recipients from public, anon, authenticated/i);
  });
});
