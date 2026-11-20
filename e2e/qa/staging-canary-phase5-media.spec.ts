/**
 * Phase 5 browser canary for Findings 14 and 19. The user approved enabling
 * the Resources & Media module for QA Church A only (20 Nov 2026), done via
 * Settings → Modules. Church B is untouched.
 */
import { expect, test, type Page } from '@playwright/test';
import { CANARY_TAG, signIn, watch } from './staging-canary-helpers';

test.describe.configure({ mode: 'serial' });
const toast = (page: Page, re: RegExp) => expect(page.locator('[data-sonner-toast]').filter({ hasText: re }).first()).toBeVisible();
const bad = (f: string[], re: RegExp) => f.filter(x => re.test(x));

test('Church A admin enables Resources & Media', async ({ page }) => {
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/modules');
  const sw = page.getByRole('switch', { name: 'Toggle Resources & Media' });
  await expect(sw).toBeVisible();
  if ((await sw.getAttribute('aria-checked')) !== 'true') {
    await sw.click();
    await page.getByRole('button', { name: /Save Changes/ }).click();
    await toast(page, /Module settings saved/);
  }
});

test('F19 browser: create a Resource Store category; persists after reload', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/resources-store');
  await expect(page).toHaveURL(/resources-store/);
  await page.getByRole('button', { name: /^Categories$/ }).first().click();
  await page.getByRole('button', { name: /Add Category|New Category/ }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.locator('input').first().fill(`${CANARY_TAG} Store Cat`);
  await dlg.getByRole('button', { name: /^(Create|Save|Add)( Category)?$/ }).click();
  await toast(page, /Category created/);
  await page.reload();
  await page.getByRole('button', { name: /^Categories$/ }).first().click();
  await expect(page.getByText(`${CANARY_TAG} Store Cat`).first()).toBeVisible();
  console.log('F19 failures:', JSON.stringify(bad(w.failures, /store_/)), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(bad(w.failures, /store_/)).toEqual([]);
});

test('F14 browser: submit a release request and approve it; persists after reload', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/asset-management');
  await expect(page).toHaveURL(/asset-management/);
  await page.getByRole('tab', { name: 'Release Requests' }).click();
  await page.getByRole('button', { name: /New Request/ }).first().click();
  const dlg = page.locator('[role="dialog"]').last();
  await dlg.getByRole('combobox').filter({ hasText: 'Select asset...' }).click();
  await page.getByRole('option').first().click();
  await dlg.getByPlaceholder('Member name').fill(`${CANARY_TAG} Requester`);
  const dates = dlg.locator('input[type="date"]');
  const d = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  await dates.nth(0).fill(d(1));
  await dates.nth(1).fill(d(3));
  await dlg.getByRole('button', { name: 'Submit' }).click();
  await toast(page, /Release request submitted/);
  await page.reload();
  await page.getByRole('tab', { name: 'Release Requests' }).click();
  const row = page.locator('tr').filter({ hasText: `${CANARY_TAG} Requester` }).first();
  await expect(row).toBeVisible();
  await row.getByRole('button').last().click();
  await page.getByRole('menuitem', { name: /Approve/ }).click();
  await toast(page, /Request updated/);
  await page.reload();
  await page.getByRole('tab', { name: 'Release Requests' }).click();
  await expect(page.locator('tr').filter({ hasText: `${CANARY_TAG} Requester` }).first()).toContainText(/approved/i);
  console.log('F14 failures:', JSON.stringify(bad(w.failures, /asset_/)), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(bad(w.failures, /asset_/)).toEqual([]);
});

test('Church B still cannot open the module pages', async ({ page }) => {
  await signIn(page, 'B_ADMIN');
  for (const p of ['/asset-management', '/resources-store']) {
    await page.goto(p);
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page).not.toHaveURL(new RegExp(p));
  }
});
