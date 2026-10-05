import { test, expect } from '@playwright/test';
import { getPlatformTenants } from './fixtures/tenants';
import { actorAccessToken, platformActorClient } from './fixtures/supabase';
import { tenantSlugMatchesHostname } from '../../src/lib/tenantHost';

test('hostname/session mismatch rejects Tenant A session on Tenant B host', () => {
  expect(tenantSlugMatchesHostname('tenant-b-e2e.vestryhub.com', 'tenant-a-e2e', 'vestryhub.com')).toBe(false);
});

const tenantAAdminToken = actorAccessToken('tenant-a-admin');

test.describe('direct Tenant A authorization probes', () => {
  test.skip(!process.env.PW_PLATFORM_TEST_ENV || !tenantAAdminToken, 'requires disposable actor-scoped DB fixtures');

  test('Tenant A cannot SELECT Tenant B members', async () => {
    const { tenantB } = getPlatformTenants();
    const client = platformActorClient(tenantAAdminToken!);
    const { data, error } = await client.from('members').select('id,tenant_id').eq('tenant_id', tenantB.id).limit(1);
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });

  test('Tenant A cannot INSERT a Tenant B member', async () => {
    const { tenantB } = getPlatformTenants();
    const client = platformActorClient(tenantAAdminToken!);
    const marker = `e2e-cross-tenant-${Date.now()}@example.test`;
    const { error } = await client.from('members').insert({ tenant_id: tenantB.id, first_name: 'E2E', last_name: 'Blocked', email: marker });
    expect(error).toBeTruthy();
  });

  test('Tenant A cannot UPDATE Tenant B members', async () => {
    const { tenantB } = getPlatformTenants();
    const client = platformActorClient(tenantAAdminToken!);
    const { data, error } = await client.from('members').update({ notes: 'cross-tenant-blocked' }).eq('tenant_id', tenantB.id).select('id');
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });

  test('Tenant A cannot DELETE Tenant B members', async () => {
    const { tenantB } = getPlatformTenants();
    const client = platformActorClient(tenantAAdminToken!);
    const { data, error } = await client.from('members').delete().eq('tenant_id', tenantB.id).select('id');
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });
});
