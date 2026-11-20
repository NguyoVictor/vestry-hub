/**
 * Phase 10 canary as Church A admin (Giving & Finance already enabled):
 * Branding removed; payroll edit/deactivate; budget expenditure + details +
 * reversal; tax rates (Finding 27). Tagged QA-CANARY, tiny amounts.
 */
import { expect, test, type Page } from '@playwright/test';
import { CANARY_TAG, signIn, watch } from './staging-canary-helpers';

test.describe.configure({ mode: 'serial' });
const hot = (page: Page, re: RegExp) => expect(page.locator('[role="status"]').filter({ hasText: re }).first()).toBeVisible();
const son = (page: Page, re: RegExp) => expect(page.locator('[data-sonner-toast]').filter({ hasText: re }).first()).toBeVisible();
const bad = (f: string[], re: RegExp) => f.filter(x => re.test(x) && !/tenant_subscriptions/.test(x));

test('Branding is gone from Settings', async ({ page }) => {
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/general');
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByRole('link', { name: /^Branding$/ })).toHaveCount(0);
  await expect(page.getByText(/^Branding$/)).toHaveCount(0);
});

test('Payroll: add, edit and deactivate a staff record', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/payroll');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('button', { name: /Add Staff|Add to Payroll|Add Payroll Staff/i }).first().click();
  const sheet = page.getByRole('dialog');
  await sheet.locator('input').filter({ hasNot: page.locator('[type="date"]') }).first().fill(`${CANARY_TAG} Clerk`);
  await sheet.getByPlaceholder(/0/).first().fill('100');
  await sheet.getByRole('button', { name: /Save|Add/ }).last().click();
  await hot(page, /Staff added to payroll/);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {});
  const row = () => page.locator('tr').filter({ hasText: `${CANARY_TAG} Clerk` }).first();
  await row().getByRole('button', { name: 'Staff actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await expect(page.getByRole('dialog').locator(`input[value="${CANARY_TAG} Clerk"]`)).toBeVisible();
  await page.keyboard.press('Escape');
  await row().getByRole('button', { name: 'Staff actions' }).click();
  await page.getByRole('menuitem', { name: 'Deactivate' }).click();
  await hot(page, /Staff deactivated/);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {});
  await expect(row()).toContainText(/inactive/i);
  console.log('Payroll failures:', JSON.stringify(bad(w.failures, /payroll/)), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(bad(w.failures, /payroll/)).toEqual([]);
});

test('Budget: record expenditure, see utilisation, reverse it', async ({ page }) => {
  const w = watch(page);
  page.on('dialog', d => d.type() === 'prompt' ? d.accept('Canary reversal') : d.accept());
  await signIn(page, 'A_ADMIN');
  await page.goto('/budget-management');
  await page.waitForLoadState('networkidle').catch(() => {});
  const actions = page.getByRole('button', { name: /^Actions for / }).first();
  await actions.click();
  await page.getByRole('menuitem', { name: 'Record expenditure' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder('0.00').fill('25');
  await dlg.getByPlaceholder('What was this spent on?').fill(`${CANARY_TAG} spend`);
  await dlg.getByRole('button', { name: 'Record expenditure' }).click();
  await hot(page, /Expenditure recorded/);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('button', { name: /^Actions for / }).first().click();
  await page.getByRole('menuitem', { name: 'View details' }).click();
  const hist = page.getByTestId('expenditure-history');
  await expect(hist).toContainText(`${CANARY_TAG} spend`);
  await hist.getByRole('button', { name: 'Reverse expenditure' }).first().click();
  await hot(page, /Expenditure reversed/);
  console.log('Budget failures:', JSON.stringify(bad(w.failures, /budget/)), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(bad(w.failures, /budget/)).toEqual([]);
});

test('Finding 27: enable tax, add / edit / deactivate a rate; persists', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/tax');
  await page.getByRole('tab', { name: 'Tax Rates' }).click();
  const sw = page.getByRole('switch', { name: 'Enable tax configuration' });
  if ((await sw.getAttribute('aria-checked')) !== 'true') { await sw.click(); await son(page, /Tax configuration updated/); }
  await page.getByRole('button', { name: 'Add tax rate' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder('e.g. VAT').fill(`${CANARY_TAG} VAT`);
  await dlg.getByPlaceholder('e.g. 16').fill('16');
  await dlg.getByRole('button', { name: 'Save tax rate' }).click();
  await son(page, /Tax rate added/);
  await page.reload(); await page.getByRole('tab', { name: 'Tax Rates' }).click();
  await expect(page.getByText(`${CANARY_TAG} VAT — 16%`)).toBeVisible();
  await page.getByRole('button', { name: `Edit ${CANARY_TAG} VAT` }).click();
  await page.getByRole('dialog').getByPlaceholder('e.g. 16').fill('8');
  await page.getByRole('switch', { name: /inclusive/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save tax rate' }).click();
  await son(page, /Tax rate updated/);
  await page.getByRole('button', { name: `Deactivate ${CANARY_TAG} VAT` }).click();
  await son(page, /Tax rate deactivated/);
  await page.reload(); await page.getByRole('tab', { name: 'Tax Rates' }).click();
  await expect(page.getByText(`${CANARY_TAG} VAT — 8%`)).toBeVisible();
  await expect(page.getByText(/inclusive, inactive/)).toBeVisible();
  console.log('Tax failures:', JSON.stringify(bad(w.failures, /tax_/)), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(bad(w.failures, /tax_/)).toEqual([]);
});
