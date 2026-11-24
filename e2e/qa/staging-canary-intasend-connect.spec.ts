/**
 * IntaSend per-church connect canary (23 Nov). Read-only for real accounts:
 * uses an obviously FAKE but well-formed test key pair, which IntaSend must
 * reject — proves the keys are checked with IntaSend before anything is
 * stored. Church A must remain "not connected".
 */
import { expect, test } from '@playwright/test';
import { scopeBypassToPreview, signIn, watch } from './staging-canary-helpers';

test.describe.configure({ mode: 'serial' });
test.use({ extraHTTPHeaders: {} });
test.beforeEach(async ({ page }) => { await scopeBypassToPreview(page); });

test('admin: fake keys are rejected by IntaSend and nothing is connected', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/payments');
  // If the church is already connected (real account), only check the status
  // card — never try fake keys against a live connection.
  await expect(page.getByTestId('intasend-connect-form').or(page.getByTestId('intasend-connected'))).toBeVisible();
  if (await page.getByTestId('intasend-connected').isVisible()) {
    await expect(page.getByTestId('intasend-connected')).toContainText(/Live — real money|Test \(sandbox\)/);
    console.log('IntaSend already connected for Church A — status card verified; fake-key check skipped.');
    return;
  }
  const form = page.getByTestId('intasend-connect-form');
  await form.getByLabel('Publishable key').fill('ISPubKey_test_vestryCanaryFake0000');
  await form.getByLabel('Secret key').fill('ISSecretKey_test_vestryCanaryFake0000');
  await form.getByRole('button', { name: 'Check and connect' }).click();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: /IntaSend rejected these keys|Could not reach IntaSend/ }).first()).toBeVisible({ timeout: 30_000 });
  await page.reload();
  await expect(page.getByTestId('intasend-connect-form')).toBeVisible();
  await expect(page.getByTestId('intasend-connected')).toHaveCount(0);
  console.log('connect failures:', JSON.stringify(w.failures), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(w.pageErrors).toEqual([]);
});

test('staff: cannot connect (admins only)', async ({ page }) => {
  await signIn(page, 'A_STAFF');
  await page.goto('/settings/payments');
  await expect(page.getByText("Only a church administrator can connect the church's IntaSend account.")).toBeVisible();
});
