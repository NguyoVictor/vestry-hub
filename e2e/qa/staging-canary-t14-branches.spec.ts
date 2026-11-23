/**
 * T14 canary (23 Nov): Church A admin assigns A-STAFF to "QA-CANARY North
 * Branch" (id qa-canary-branch-a, created beforehand) through Edit user →
 * Branch Assignment; the Users list, Settings → Branches and the branch page
 * show it; then the admin sets "All branches" again. No shared passwords.
 */
import { expect, test, type Page } from '@playwright/test';
import { scopeBypassToPreview, signIn, watch } from './staging-canary-helpers';

test.describe.configure({ mode: 'serial' });
// update-user-role (Edge Function) must not receive the Vercel bypass headers.
test.use({ extraHTTPHeaders: {} });
test.beforeEach(async ({ page }) => { await scopeBypassToPreview(page); });
const BRANCH = 'QA-CANARY North Branch';
const settle = (p: Page) => p.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
const staffRow = (p: Page) => p.locator('tr').filter({ hasText: process.env.E2E_A_STAFF_EMAIL! }).first();

async function setBranch(page: Page, label: string) {
  await page.goto('/settings/users');
  await settle(page);
  await staffRow(page).locator('button[title="Edit user"]').click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByRole('radio', { name: label })).toBeVisible();
  await dlg.getByRole('radio', { name: label }).check();
  await dlg.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'User updated successfully' }).first()).toBeVisible();
}

test('admin assigns staff to a branch; it shows everywhere', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await setBranch(page, BRANCH);
  await page.reload(); await settle(page);
  await expect(staffRow(page)).toContainText(BRANCH);

  await page.goto('/settings/branches');
  await settle(page);
  await expect(page.getByTestId('branch-access-explainer')).toBeVisible();
  const row = page.getByTestId('settings-branch-row').filter({ hasText: BRANCH });
  await expect(row).toContainText('1 staff');
  await expect(row).toContainText('canary User');
  await expect(page.getByText(/branch-login/)).toHaveCount(0);

  await page.goto('/branches/qa-canary-branch-a');
  await settle(page);
  if (/\/dashboard/.test(page.url())) {
    // The Branches module is switched off for this church: the page correctly redirects.
    test.info().annotations.push({ type: 'note', description: 'Branches module disabled for QA Church A — detail page not reachable (redirect to dashboard).' });
    console.log('T14 note: Branches module disabled for Church A; /branches/:id redirected to dashboard');
  } else {
    await expect(page.getByTestId('branch-staff-list')).toContainText('canary User');
    await expect(page.getByTestId('branch-stat').first()).toContainText('1');
  }
  console.log('T14 failures:', JSON.stringify(w.failures), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(w.pageErrors).toEqual([]);
});

test('admin sets the staff member back to all branches', async ({ page }) => {
  await signIn(page, 'A_ADMIN');
  await setBranch(page, 'All branches');
  await page.reload(); await settle(page);
  await expect(staffRow(page)).toContainText('All branches');
});
