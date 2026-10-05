import { test, expect } from '@playwright/test';
import { protectedState, env, expectNoHardCrash } from './protected-fixtures';

const baseDomain = env('PW_TENANT_BASE_DOMAIN');
const tenantASlug = env('PW_TENANT_A_SLUG');
const tenantBSlug = env('PW_TENANT_B_SLUG');
const memberASession = env('PW_MEMBER_A_SESSION_JSON');

test.describe('Stage 7 member tenant/session boundary', () => {
  test.skip(process.env.PW_PLATFORM_TEST_ENV !== 'disposable' || !baseDomain || !tenantASlug || !tenantBSlug || !memberASession,
    'requires disposable tenant domains and PW_MEMBER_A_SESSION_JSON');

  test('Tenant A member session is rejected on Tenant B host', async ({ page }) => {
    await page.addInitScript((raw) => localStorage.setItem('member_session', raw), memberASession!);
    await page.goto(`https://${tenantBSlug}.${baseDomain}/member`);
    await expect(page).toHaveURL(/\/member\/login(?:\?|$)/);
    const stored = await page.evaluate(() => localStorage.getItem('member_session'));
    expect(stored).toBeNull();
  });

  test('Tenant A member session remains usable on Tenant A host', async ({ page }) => {
    await page.addInitScript((raw) => localStorage.setItem('member_session', raw), memberASession!);
    await page.goto(`https://${tenantASlug}.${baseDomain}/member`);
    await expectNoHardCrash(page);
    await expect(page).not.toHaveURL(/\/member\/login(?:\?|$)/);
  });
});

test.describe('Stage 7 member self-service protected routes', () => {
  test.skip(process.env.PW_PLATFORM_TEST_ENV !== 'disposable' || !protectedState.memberA, 'requires disposable member storage state');
  if (protectedState.memberA) test.use({ storageState: protectedState.memberA });

  for (const route of ['/member/requests', '/member/appointments', '/member/testimonies', '/member/volunteer', '/member/facility-booking', '/member/profile', '/member/settings', '/member/surveys', '/member/messages']) {
    test(`${route} loads for the authenticated member without a hard crash`, async ({ page }) => {
      await page.goto(route);
      await expectNoHardCrash(page);
      await expect(page).not.toHaveURL(/\/member\/login(?:\?|$)/);
    });
  }
});
