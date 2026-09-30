import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const queueMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260930110332_p2_communication_queue_foundation.sql'), 'utf8');
const billingMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260930110558_p2_subscription_mpesa_foundation.sql'), 'utf8');

describe('P2 permission contracts', () => {
  it('keeps communication jobs server-only', () => {
    expect(queueMigration).toMatch(/revoke all on table public\.communication_jobs from public, anon, authenticated/i);
    expect(queueMigration).toMatch(/communication_jobs_no_client_access/i);
    expect(queueMigration).toMatch(/grant .* on table public\.communication_jobs to service_role/i);
  });

  it('keeps queue mutation RPCs service-role only', () => {
    for (const fn of ['reserve_communication_credits', 'finalize_communication_job', 'release_communication_job', 'claim_communication_jobs', 'ack_communication_job']) {
      expect(queueMigration).toContain(`revoke all on function public.${fn}`);
      expect(queueMigration).toMatch(new RegExp(`grant execute on function public\\.${fn}[^;]+to service_role`, 'i'));
    }
  });

  it('allows catalog reads without exposing payment-attempt mutation', () => {
    expect(billingMigration).toMatch(/subscription_catalog/i);
    expect(billingMigration).toMatch(/subscription_payment_attempts/i);
    expect(billingMigration).toMatch(/grant select on (?:table\s+)?public\.subscription_catalog to anon, authenticated/i);
    expect(billingMigration).toMatch(/revoke all on (?:table\s+)?public\.subscription_payment_attempts from (?:public,\s*)?anon,\s*authenticated/i);
  });
});
