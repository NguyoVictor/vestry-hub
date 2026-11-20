/**
 * Phase 9 canary (Findings 21–24) as Church A admin. Enables Giving & Finance
 * for QA Church A only (same pattern as earlier modules). Records are tagged
 * QA-CANARY; amounts are tiny test values.
 */
import { expect, test, type Page } from '@playwright/test';
import { CANARY_TAG, signIn, watch } from './staging-canary-helpers';

test.describe.configure({ mode: 'serial' });
// These pages use react-hot-toast (role=status) — Phase 9 mounted its Toaster.
const hot = (page: Page, re: RegExp) => expect(page.locator('[role="status"]').filter({ hasText: re }).first()).toBeVisible();
const bad = (f: string[], re: RegExp) => f.filter(x => re.test(x) && !/tenant_subscriptions/.test(x));

test('enable Giving & Finance for Church A', async ({ page }) => {
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/modules');
  const sw = page.getByRole('switch', { name: /Toggle Giving/ });
  await expect(sw).toBeVisible();
  if ((await sw.getAttribute('aria-checked')) !== 'true') {
    await sw.click();
    await page.getByRole('button', { name: /Save Changes/ }).click();
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: /Module settings saved/ }).first()).toBeVisible();
  }
});

test('F22: chart of accounts set up; balanced journal entry posted with accounts', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/general-ledger');
  await page.waitForLoadState('networkidle').catch(() => {});
  const setup = page.getByRole('button', { name: /Setup Chart of Accounts/ }).first();
  if (await setup.isVisible().catch(() => false)) {
    await setup.click();
    await hot(page, /Chart of accounts created/);
  }
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('button', { name: /Add Journal Entry/ }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder('Journal entry description').fill(`${CANARY_TAG} Journal`);
  const accts = dlg.getByRole('combobox').filter({ hasText: 'Select account' });
  await accts.nth(0).click(); await page.getByRole('option', { name: /1001/ }).click();
  await dlg.getByRole('combobox').filter({ hasText: 'Select account' }).first().click(); await page.getByRole('option', { name: /4001/ }).click();
  const amounts = dlg.getByPlaceholder('0.00');
  await amounts.nth(0).fill('10');   // line 1 debit
  await amounts.nth(3).fill('10');   // line 2 credit
  await dlg.getByRole('button', { name: /Post Journal Entry/ }).click();
  await hot(page, /Journal entry posted/);
  console.log('F22 failures:', JSON.stringify(bad(w.failures, /chart_of_accounts|ledger|seed/)), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(bad(w.failures, /chart_of_accounts|ledger|seed/)).toEqual([]);
});

test('F21: payout recorded with cheque / processed and persists', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/payouts');
  await page.getByRole('button', { name: /Record Payout/ }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder('Enter recipient name').fill(`${CANARY_TAG} Payee`);
  await dlg.getByPlaceholder('0.00').fill('5');
  const combos = dlg.getByRole('combobox');
  await combos.filter({ hasText: /bank|Bank/ }).first().click(); await page.getByRole('option', { name: /cheque/i }).click();
  await combos.filter({ hasText: /pending|Pending/ }).first().click(); await page.getByRole('option', { name: /processed/i }).click();
  await dlg.getByRole('button', { name: /Record Payout/ }).click();
  await hot(page, /Payout recorded successfully/);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByText(`${CANARY_TAG} Payee`).first()).toBeVisible();
  console.log('F21 failures:', JSON.stringify(bad(w.failures, /payouts/)), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(bad(w.failures, /payouts/)).toEqual([]);
});

test('F23: invoice marked paid and stays paid', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/accounts-payable');
  await page.getByRole('button', { name: /Add Invoice|New Invoice/ }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder('Enter vendor name').fill(`${CANARY_TAG} Vendor`);
  await dlg.getByPlaceholder('0.00').fill('7');
  await dlg.getByRole('button', { name: /Add Invoice|Save|Create/ }).last().click();
  await page.waitForTimeout(1500);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {});
  const row = page.locator('tr, [role="row"], div').filter({ hasText: `${CANARY_TAG} Vendor` }).filter({ has: page.getByRole('button') }).last();
  await row.getByRole('button').last().click();
  await page.getByRole('menuitem', { name: /Mark as Paid/ }).click();
  await hot(page, /Marked as paid/);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('tr, div').filter({ hasText: `${CANARY_TAG} Vendor` }).last()).toContainText(/paid/i);
  console.log('F23 failures:', JSON.stringify(bad(w.failures, /accounts_payable/)), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(bad(w.failures, /accounts_payable/)).toEqual([]);
});

test('F24: expense approved and stays approved', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/church-expenses');
  await page.getByRole('button', { name: /Add Expense/ }).first().click();
  const sheet = page.getByRole('dialog');
  await sheet.locator('label:text-is("Title")').locator('..').locator('input').fill(`${CANARY_TAG} Expense`);
  await sheet.locator('label:text-is("Amount")').locator('..').locator('input').fill('3');
  await sheet.getByRole('button', { name: /Add Expense/ }).last().click();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: /Expense added/ }).first()).toBeVisible();
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {});
  const row = page.locator('tr').filter({ hasText: `${CANARY_TAG} Expense` }).first();
  await row.getByRole('button').last().click();
  await page.getByRole('menuitem', { name: /Approve/ }).click();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: /Expense approved/ }).first()).toBeVisible();
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('tr').filter({ hasText: `${CANARY_TAG} Expense` }).first()).toContainText(/approved/i);
  console.log('F24 failures:', JSON.stringify(bad(w.failures, /expenses/)), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(bad(w.failures, /expenses/)).toEqual([]);
});
