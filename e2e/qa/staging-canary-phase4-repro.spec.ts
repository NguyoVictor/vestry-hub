/**
 * Phase 4 reproduction (Findings 7, 9, 25) as Church A admin — NO file uploads.
 * Captures the real Supabase error codes/messages the report could not capture.
 * Writes: one tagged facility, one tagged incident, and a General Settings
 * re-save with unchanged values.
 */
import { expect, test } from '@playwright/test';
import { CANARY_TAG, signIn, watch } from './staging-canary-helpers';

test.describe.configure({ mode: 'serial' });

const toasts = (page: import('@playwright/test').Page) =>
  page.locator('[data-sonner-toast]').allInnerTexts().then(t => t.map(s => s.replace(/\s+/g, ' ').trim()));

test('F7-B repro: create facility without thumbnail, check it is listed after reload', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/facility-booking');
  await page.waitForLoadState('networkidle').catch(() => {});
  console.log('F7 url:', new URL(page.url()).pathname);
  await page.getByRole('tab', { name: 'Facilities' }).click().catch(() => {});
  await page.getByRole('button', { name: /Add Facility/ }).first().click();
  await page.getByPlaceholder('e.g., Main Hall').fill(`${CANARY_TAG} Hall`);
  await page.getByPlaceholder('e.g., 200').fill('50');
  await page.getByRole('dialog').getByRole('button', { name: /^(Save|Create|Add)/ }).last().click();
  await page.waitForTimeout(4000);
  console.log('F7 toasts:', JSON.stringify(await toasts(page)));
  await page.reload();
  await page.getByRole('tab', { name: 'Facilities' }).click().catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
  console.log('F7 listed after reload:', await page.getByText(`${CANARY_TAG} Hall`).count());
  console.log('F7 failures:', JSON.stringify(w.failures), 'pageErrors:', JSON.stringify(w.pageErrors));
});

test('F9 repro: report incident without attachment', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/incident-management');
  await page.waitForLoadState('networkidle').catch(() => {});
  console.log('F9 url:', new URL(page.url()).pathname);
  await page.getByRole('button', { name: /Report Incident/ }).first().click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('combobox').filter({ hasText: 'Select incident type' }).click();
  await page.getByRole('option').first().click();
  await sheet.getByPlaceholder('Describe what happened in detail...').fill(`${CANARY_TAG} incident — recovery canary, safe to delete.`);
  await sheet.getByRole('button', { name: 'Report Incident' }).last().click();
  await page.waitForTimeout(4000);
  console.log('F9 toasts:', JSON.stringify(await toasts(page)));
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
  console.log('F9 listed after reload:', await page.getByText(CANARY_TAG).count());
  console.log('F9 failures:', JSON.stringify(w.failures), 'pageErrors:', JSON.stringify(w.pageErrors));
});

test('F25 repro: re-save General Settings unchanged (no logo)', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/general');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await page.waitForTimeout(4000);
  console.log('F25 toasts:', JSON.stringify(await toasts(page)));
  console.log('F25 failures:', JSON.stringify(w.failures), 'pageErrors:', JSON.stringify(w.pageErrors));
  expect(true).toBe(true);
});
