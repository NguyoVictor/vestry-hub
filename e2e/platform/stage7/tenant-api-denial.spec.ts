import { test, expect } from '@playwright/test';
import { actorAccessToken, platformActorClient } from '../fixtures/supabase';
import { getPlatformTenants } from '../fixtures/tenants';

const tenantAAdminToken = actorAccessToken('tenant-a-admin');

const protectedTables = [
  'members',
  'events',
  'services',
  'giving_records',
  'expenses',
  'announcements',
  'messages',
  'appointments',
  'testimonies',
] as const;

test.describe('Stage 7 direct cross-tenant API denial', () => {
  test.skip(process.env.PW_PLATFORM_TEST_ENV !== 'disposable' || !tenantAAdminToken, 'requires disposable Tenant A actor token');

  for (const table of protectedTables) {
    test(`Tenant A cannot read Tenant B ${table}`, async () => {
      const { tenantB } = getPlatformTenants();
      const client = platformActorClient(tenantAAdminToken!);
      const { data, error } = await client.from(table).select('id,tenant_id').eq('tenant_id', tenantB.id).limit(5);
      expect(error).toBeNull();
      expect(data ?? []).toEqual([]);
    });

    test(`Tenant A cannot update Tenant B ${table}`, async () => {
      const { tenantB } = getPlatformTenants();
      const client = platformActorClient(tenantAAdminToken!);
      const { data, error } = await client.from(table).update({ tenant_id: tenantB.id }).eq('tenant_id', tenantB.id).select('id');
      expect(error).toBeNull();
      expect(data ?? []).toEqual([]);
    });

    test(`Tenant A cannot delete Tenant B ${table}`, async () => {
      const { tenantB } = getPlatformTenants();
      const client = platformActorClient(tenantAAdminToken!);
      const { data, error } = await client.from(table).delete().eq('tenant_id', tenantB.id).select('id');
      expect(error).toBeNull();
      expect(data ?? []).toEqual([]);
    });
  }
});
