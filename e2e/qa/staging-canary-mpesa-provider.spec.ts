/**
 * M-Pesa provider choice canary (24 Nov). Uses QA Church B (not connected):
 * the admin sees the IntaSend / Daraja choice, picks Daraja, enters obviously
 * FAKE sandbox credentials, and Safaricom's sandbox must reject them — proves
 * credentials are checked before anything is stored. Church A (connected to a
 * real IntaSend account) is only checked read-only: its status card shows.
 */
import { expect, test } from '@playwright/test';
import { scopeBypassToPreview, signIn, watch } from './staging-canary-helpers';

test.describe.configure({ mode: 'serial' });
test.use({ extraHTTPHeaders: {} });
test.beforeEach(async ({ page }) => { await scopeBypassToPreview(page); });

test('Church B admin: choose Daraja; fake credentials rejected; nothing connected', async ({ page }) => {
  test.setTimeout(180_000);
  const w = watch(page);
  await signIn(page, 'B_ADMIN');
  await page.goto('/settings/payments');
  const choice = page.getByTestId('provider-choice');
  await expect(choice).toBeVisible({ timeout: 30_000 });
  await choice.getByRole('radio', { name: /Safaricom Daraja/ }).click();
  const form = page.getByTestId('daraja-connect-form');
  await expect(form).toBeVisible();
  await form.getByRole('button', { name: 'Sandbox' }).click();
  await form.getByLabel('Paybill number').fill('174379');
  await form.getByLabel('Consumer key').fill('vestryCanaryFakeConsumerKey000');
  await form.getByLabel('Consumer secret').fill('vestryCanaryFakeSecret000');
  await form.getByLabel('Passkey').fill('vestryCanaryFakePasskey000');
  await form.getByRole('button', { name: 'Check and connect' }).click();
  const toast = page.locator('[data-sonner-toast]').first();
  await expect(toast).toBeVisible({ timeout: 40_000 });
  const text = await toast.innerText();
  console.log('Daraja connect toast:', text);
  expect(text).toMatch(/Safaricom rejected|Could not reach Safaricom/);
  await page.reload();
  await expect(page.getByTestId('provider-choice')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('daraja-connected')).toHaveCount(0);
  expect(w.pageErrors).toEqual([]);
});

test('Church A admin: the connected IntaSend status card shows (read-only)', async ({ page }) => {
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/payments');
  await expect(page.getByTestId('intasend-connected')).toContainText(/M-Pesa via IntaSend/, { timeout: 30_000 });
  await expect(page.getByTestId('provider-choice')).toHaveCount(0);
});
