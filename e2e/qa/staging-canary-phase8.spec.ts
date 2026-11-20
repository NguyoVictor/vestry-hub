/**
 * Phase 8 canary (Findings 17, 18, 20-non-AI) as Church A admin. Enables the
 * Discipleship module for QA Church A (needed for /outreach and /training;
 * same pattern as Operations / Resources & Media). Tagged QA-CANARY records.
 */
import { expect, test, type Page } from '@playwright/test';
import { CANARY_TAG, signIn, watch } from './staging-canary-helpers';

test.describe.configure({ mode: 'serial' });
const toast = (page: Page, re: RegExp) => expect(page.locator('[data-sonner-toast]').filter({ hasText: re }).first()).toBeVisible();
const bad = (f: string[], re: RegExp) => f.filter(x => re.test(x));

test('enable Discipleship module for Church A', async ({ page }) => {
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/modules');
  const sw = page.getByRole('switch', { name: /Toggle Discipleship/ });
  await expect(sw).toBeVisible();
  if ((await sw.getAttribute('aria-checked')) !== 'true') {
    await sw.click();
    await page.getByRole('button', { name: /Save Changes/ }).click();
    await toast(page, /Module settings saved/);
  }
});

test('F17: category + resource created and persist', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/discipleship-resources');
  await page.getByRole('button', { name: /^Categories$/ }).click();
  await page.getByPlaceholder('New category name').fill(`${CANARY_TAG} Cat`);
  await page.getByPlaceholder('New category name').press('Enter');
  await expect(page.getByRole('dialog').getByText(`${CANARY_TAG} Cat`)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Add Resource/ }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: /^Link/i }).first().click().catch(() => {});
  await dlg.getByPlaceholder('Resource title').fill(`${CANARY_TAG} Resource`);
  const ext = dlg.getByPlaceholder('https://...');
  if (await ext.isVisible().catch(() => false)) await ext.fill('https://example.com/canary');
  await dlg.getByRole('button', { name: 'Create Resource' }).click();
  await toast(page, /Resource created successfully/);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByText(`${CANARY_TAG} Resource`).first()).toBeVisible();
  console.log('F17 failures:', JSON.stringify(bad(w.failures, /resource|categor/)), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(bad(w.failures, /resource|categor/)).toEqual([]);
});

test('F18: outreach activity logged and persists', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/outreach');
  await expect(page).toHaveURL(/\/outreach/);
  await page.getByRole('button', { name: /Log Outreach Activity/ }).click();
  const sheet = page.getByRole('dialog');
  await sheet.locator('label:text-is("Activity Name *")').locator('..').locator('input').fill(`${CANARY_TAG} Outreach`);
  await sheet.getByRole('button', { name: /^Log Activity$/ }).click();
  await toast(page, /Activity logged/);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByText(`${CANARY_TAG} Outreach`).first()).toBeVisible();
  console.log('F18 failures:', JSON.stringify(bad(w.failures, /outreach/)), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(bad(w.failures, /outreach/)).toEqual([]);
});

test('F20: build a 2-lesson course and publish it; it is listed', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/training/new');
  await page.getByPlaceholder('e.g. Bible Foundations for New Members').fill(`${CANARY_TAG} Course`);
  await page.getByPlaceholder('What will members learn in this course?').fill('Recovery canary course.');
  await page.getByRole('button', { name: /Continue to Lessons/ }).click();
  for (const t of ['Welcome', 'Next steps']) {
    await page.getByRole('button', { name: '+ Add lesson' }).click();
    await page.getByPlaceholder('Lesson title...').fill(`${CANARY_TAG} ${t}`);
  }
  await page.getByRole('button', { name: /Build Quiz/ }).click();
  await page.getByRole('button', { name: /Review & Publish/ }).click();
  await page.getByRole('button', { name: /Publish Course/ }).click();
  await toast(page, /Course published/);
  await expect(page).toHaveURL(/\/training$/);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByText(`${CANARY_TAG} Course`).first()).toBeVisible();
  console.log('F20 failures:', JSON.stringify(bad(w.failures, /training|course/)), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(bad(w.failures, /training|course/)).toEqual([]);
});
