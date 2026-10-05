import { test, expect } from '@playwright/test';
import { actorAccessToken, platformActorClient } from '../fixtures/supabase';

const adminToken = actorAccessToken('tenant-a-admin');

test.describe('subscription payment authorization and price authority', () => {
  test.skip(!process.env.PW_PLATFORM_TEST_ENV || !adminToken, 'requires disposable authenticated actor token');

  test('authenticated Admin can read active canonical catalog but cannot mutate payment attempts', async () => {
    const client = platformActorClient(adminToken!);
    const catalog = await client.from('subscription_catalog').select('product_code,amount_kes,active').eq('active', true);
    expect(catalog.error).toBeNull();
    expect((catalog.data ?? []).some((row) => row.product_code === 'plan_basic' && Number(row.amount_kes) > 0)).toBe(true);

    const insert = await client.from('subscription_payment_attempts').insert({
      tenant_id: process.env.PW_TENANT_A_ID,
      product_code: 'plan_basic',
      expected_amount: 1,
      phone: '254700000000',
    });
    expect(insert.error).toBeTruthy();
  });

  test('authenticated Admin cannot invoke authoritative callback application RPC', async () => {
    const client = platformActorClient(adminToken!);
    const { error } = await client.rpc('apply_subscription_payment_callback', {
      p_checkout_request_id: 'E2E-NOT-REAL',
      p_result_code: 0,
      p_result_desc: 'tamper probe',
      p_amount: 1,
      p_receipt: 'E2E',
      p_phone: '254700000000',
      p_raw_callback: {},
    });
    expect(error).toBeTruthy();
  });
});
