/**
 * T5/T16 canary (23 Nov): Church A admin creates a custom role with Financial
 * Records = No access, gives it to A-STAFF as an additional role; A-STAFF sees
 * the no-access page on Finance but normal pages elsewhere; the admin removes
 * the role and deactivates it; A-STAFF has Finance again. QA-CANARY tagged.
 */
import { expect, test, type Page } from '@playwright/test';
import { CANARY_TAG, signIn, watch } from './staging-canary-helpers';

test.describe.configure({ mode: 'serial' });
const roleName = `${CANARY_TAG} Youth`.slice(0, 60);
const settle = (p: Page) => p.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
const staffEmail = () => process.env.E2E_A_STAFF_EMAIL!;

async function openEditStaff(page: Page) {
  await page.goto('/settings/users');
  await settle(page);
  const row = page.locator('tr').filter({ hasText: staffEmail() }).first();
  await row.locator('button[title="Edit user"]').click();
  return page.getByRole('dialog');
}

test('admin creates a role with Finance = No access and assigns it to staff', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/users');
  await settle(page);
  await page.getByRole('tab', { name: 'Roles' }).click();
  await page.getByRole('button', { name: 'Add Role' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder('e.g. Worship Leader').fill(roleName);
  await dlg.getByRole('combobox', { name: 'Financial Records access' }).click();
  await page.getByRole('option', { name: 'No access' }).click();
  await dlg.getByRole('button', { name: 'Create Role' }).click();
  await expect(dlg).toBeHidden();
  const card = page.locator('div').filter({ hasText: roleName }).getByTestId('role-access-summary').first();
  await expect(card).toHaveText('Financial Records: No access');

  const edit = await openEditStaff(page);
  await edit.getByRole('checkbox', { name: `Custom role ${roleName}` }).check();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Roles updated' }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload(); await settle(page);
  await expect(page.locator('tr').filter({ hasText: staffEmail() }).getByTestId('extra-role-badge').filter({ hasText: roleName })).toBeVisible();
  console.log('assign failures:', JSON.stringify(w.failures), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(w.pageErrors).toEqual([]);
});

test('staff with that role gets the no-access page on Finance only', async ({ page }) => {
  const w = watch(page);
  let apikey = '';
  page.on('request', r => { if (!apikey && new URL(r.url()).hostname.endsWith('.supabase.co')) apikey = r.headers()['apikey'] ?? ''; });
  await signIn(page, 'A_STAFF');
  await page.goto('/giving-records');
  await expect(page.getByTestId('no-access-panel')).toContainText('Financial Records');
  await page.goto('/payroll');
  await expect(page.getByTestId('no-access-panel')).toBeVisible();
  await page.goto('/members');
  await settle(page);
  await expect(page.getByTestId('no-access-panel')).toHaveCount(0);
  // 24 Nov: finance data is also blocked at the API (not just the pages).
  const counts = await page.evaluate(async (apikey) => {
    const k = Object.keys(localStorage).find(x => /^sb-.*-auth-token$/.test(x))!;
    const v = JSON.parse(localStorage.getItem(k) as string);
    const base = `https://${k.slice(3, k.indexOf('-auth-token'))}.supabase.co/rest/v1`;
    const n = async (t: string) => {
      const r = await fetch(`${base}/${t}?select=id&limit=50`, { headers: { Authorization: `Bearer ${v.access_token}`, apikey } });
      const j = await r.json().catch(() => null); return Array.isArray(j) ? j.length : -r.status;
    };
    return { gifts: await n('giving_records'), payouts: await n('payouts'), budgets: await n('budgets'), members: await n('members') };
  }, apikey);
  console.log('API counts with finance no-access:', JSON.stringify(counts));
  expect(counts.gifts).toBe(0);
  expect(counts.payouts).toBe(0);
  expect(counts.budgets).toBe(0);
  expect(counts.members).toBeGreaterThan(0);
  expect(w.pageErrors).toEqual([]);
});

test('admin removes and deactivates the role; staff has Finance again', async ({ page, browser }, testInfo) => {
  await signIn(page, 'A_ADMIN');
  const edit = await openEditStaff(page);
  const box = edit.getByRole('checkbox', { name: `Custom role ${roleName}` });
  await expect(box).toBeChecked(); // wait until the person's current roles have loaded
  await box.uncheck();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Roles updated' }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Roles' }).click();
  const roleCard = page.locator('div.rounded-xl').filter({ hasText: roleName }).first();
  await roleCard.locator('button').nth(1).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('div.rounded-xl').filter({ hasText: roleName })).toHaveCount(0);

  const ctx = await browser.newContext({ baseURL: testInfo.project.use.baseURL, extraHTTPHeaders: testInfo.project.use.extraHTTPHeaders, serviceWorkers: 'block' });
  const staff = await ctx.newPage();
  await signIn(staff, 'A_STAFF');
  await staff.goto('/giving-records');
  await settle(staff);
  await expect(staff.getByTestId('no-access-panel')).toHaveCount(0);
  await ctx.close();
});
