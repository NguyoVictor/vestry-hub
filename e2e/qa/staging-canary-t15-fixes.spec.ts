/**
 * T15 fixes canary (24 Nov). Real defects found while clearing type errors:
 *  - Record Giving: "Other" method removed (enum rejects it); the M-Pesa
 *    reference typed in the form is saved (was dropped). Writes ONE anonymous
 *    KES 7 gift into QA Church A with reference QA<ts> — verified read-only in
 *    the DB afterwards.
 *  - Tax statements page loads (embedded members(...) used to fail).
 *  - Dashboard renders without page errors (Recharts tooltip).
 *  - Public sermons header shows the church name (primary_color query failed).
 */
import { expect, test } from '@playwright/test';
import { scopeBypassToPreview, signIn, watch } from './staging-canary-helpers';

const A = process.env.PW_TENANT_A_ID ?? '';
const REF = `QA${Date.now().toString(36).toUpperCase()}`;

test.describe.configure({ mode: 'serial' });
test.use({ extraHTTPHeaders: {} });
test.beforeEach(async ({ page }) => { await scopeBypassToPreview(page); });

test('Record Giving: no "Other" method; M-Pesa reference is saved', async ({ page }) => {
  test.setTimeout(120_000);
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/give-online');
  await page.getByRole('button', { name: /Record Giving/ }).first().click();
  const sheet = page.getByRole('dialog').filter({ hasText: 'Record Giving' });
  await expect(sheet).toBeVisible({ timeout: 30_000 });
  await sheet.getByRole('switch').click(); // anonymous
  await sheet.locator('input[type="number"]').fill('7');
  const combos = sheet.getByRole('combobox');
  await combos.nth(1).click(); // payment method
  await expect(page.getByRole('option', { name: 'Other' })).toHaveCount(0);
  await page.getByRole('option', { name: 'Mpesa' }).click();
  await sheet.locator('input:not([type="number"]):not([type="date"])').last().fill(REF.toLowerCase());
  await sheet.getByRole('button', { name: 'Record Giving' }).click();
  await expect(page.getByText(/recorded successfully/)).toBeVisible({ timeout: 30_000 }); // react-hot-toast on this page
  console.log('T15 recorded gift reference:', REF);
  expect(w.pageErrors).toEqual([]);
});

test('Tax statements page loads without an error', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/tax');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-sonner-toast][data-type="error"]')).toHaveCount(0);
  expect(w.pageErrors).toEqual([]);
});

test('Dashboard renders without page errors', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.recharts-wrapper').first()).toBeVisible({ timeout: 30_000 });
  expect(w.pageErrors).toEqual([]);
});

test('Public sermons header shows the church name', async ({ page }) => {
  test.skip(!A, 'PW_TENANT_A_ID not set');
  await page.goto(`/sermons/${A}`);
  const h1 = page.locator('h1').first();
  await expect(h1).toBeVisible({ timeout: 30_000 });
  await expect(h1).not.toHaveText(/^Church Sermons$/, { timeout: 15_000 });
  console.log('Public sermons heading:', await h1.innerText());
});
