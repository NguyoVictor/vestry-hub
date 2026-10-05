import { test, expect } from '@playwright/test';
import { actorAccessToken, platformActorClient } from '../fixtures/supabase';

const adminToken = actorAccessToken('tenant-a-admin');

test.describe('communication queue authorization', () => {
  test.skip(!process.env.PW_PLATFORM_TEST_ENV || !adminToken, 'requires disposable authenticated actor token');

  test('authenticated tenant actor cannot read server-only communication_jobs', async () => {
    const client = platformActorClient(adminToken!);
    const { data, error } = await client.from('communication_jobs').select('id').limit(1);
    expect(data ?? []).toEqual([]);
    expect(error).toBeTruthy();
  });

  test('authenticated tenant actor cannot reserve queue credits directly', async () => {
    const client = platformActorClient(adminToken!);
    const { error } = await client.rpc('reserve_communication_credits', {
      p_tenant_id: process.env.PW_TENANT_A_ID,
      p_channel: 'email',
      p_credits: 0,
      p_payload: {},
      p_scheduled_at: null,
    });
    expect(error).toBeTruthy();
  });
});
