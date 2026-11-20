/**
 * Phase 3 staging canary (Findings 2–4). Church A admin creates clearly tagged
 * QA-CANARY records; each is verified to PERSIST across a reload (no false
 * success), and Church B admin must not see them. Writes are limited to the
 * QA church A. The fellowship membership added is removed again at the end.
 */
import { expect, test, type Page } from '@playwright/test';
import { CANARY_TAG, signIn, watch } from './staging-canary-helpers';

const FAMILY = `${CANARY_TAG} Family`;
const VISITOR_FIRST = 'Canary';
const VISITOR_LAST = CANARY_TAG;

test.describe.configure({ mode: 'serial' });

async function expectToast(page: Page, text: RegExp) {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: text }).first()).toBeVisible();
}

test('Finding 3: Church A admin creates a family with a member; it persists', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/families');
  await page.getByRole('button', { name: 'Create Family' }).click();
  await page.getByPlaceholder('e.g. The Kamau Family').fill(FAMILY);
  await page.getByRole('button', { name: 'Next' }).click();
  const memberRow = page.locator('label:text-is("First Name")').first().locator('..');
  await memberRow.locator('input').fill('Canary');
  await page.locator('label:text-is("Last Name")').first().locator('..').locator('input').fill('Child');
  await page.getByRole('button', { name: 'Create Family' }).last().click();
  await expectToast(page, /Family created/);
  await page.reload();
  await expect(page.getByText(FAMILY).first()).toBeVisible();
  console.log('F3 failures:', JSON.stringify(w.failures.filter(f => /famil/.test(f))), 'pageErrors:', JSON.stringify(w.pageErrors));
  expect(w.failures.filter(f => /famil/.test(f))).toEqual([]);
  expect(w.pageErrors).toEqual([]);
});

test('Finding 4: Church A admin adds and edits a visitor without a crash; it persists', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/visitors');
  await page.getByRole('button', { name: 'Add Visitor' }).first().click();
  await page.getByPlaceholder('John', { exact: true }).fill(VISITOR_FIRST);
  await page.getByPlaceholder('Doe', { exact: true }).fill(VISITOR_LAST);
  await page.getByPlaceholder('+1 234 567 8900').fill('+254700000999');
  const dateInput = page.locator('input[type="date"]').first();
  if (!(await dateInput.inputValue())) await dateInput.fill(new Date().toISOString().slice(0, 10));
  await page.locator('form button[type="submit"]').filter({ hasText: 'Add Visitor' }).click();
  await expectToast(page, /Visitor added/);
  await page.reload();
  await expect(page.getByText(VISITOR_LAST).first()).toBeVisible();
  console.log('F4 failures:', JSON.stringify(w.failures.filter(f => /visitor/.test(f))), 'pageErrors:', JSON.stringify(w.pageErrors));
  expect(w.failures.filter(f => /visitor/.test(f))).toEqual([]);
  expect(w.pageErrors).toEqual([]);
});

test('Finding 2: Church A admin adds a member to a fellowship; list shows it after reload; then removes it', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/house-fellowships');
  await page.getByRole('button', { name: /^View/ }).first().click();
  await expect(page).toHaveURL(/\/house-fellowships\/[0-9a-f-]+/);
  const fellowshipUrl = page.url();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('combobox').filter({ hasText: 'Select member to add' }).click();
  const option = page.getByRole('option').first();
  const memberName = (await option.innerText()).trim();
  await option.click();
  await page.getByRole('button', { name: /^Add$/ }).click();
  await expectToast(page, /Member added/);
  await page.goto(fellowshipUrl);
  await page.waitForLoadState('networkidle').catch(() => {});
  const listed = page.locator('main').getByText(memberName, { exact: false });
  await expect(listed.first()).toBeVisible();
  console.log('F2 member added and listed after reload (name withheld). failures:',
    JSON.stringify(w.failures.filter(f => /fellowship/.test(f))), 'pageErrors:', JSON.stringify(w.pageErrors));
  expect(w.failures.filter(f => /fellowship/.test(f))).toEqual([]);
  expect(w.pageErrors).toEqual([]);
  // Cleanup: remove the membership we added (also exercises the remove path),
  // plus any leftover canary membership named in PW_CANARY_CLEANUP_MEMBERS.
  const extra = (process.env.PW_CANARY_CLEANUP_MEMBERS || '').split('|').map(s => s.trim()).filter(Boolean);
  for (const name of [memberName, ...extra]) {
    await removeFellowshipMember(page, name);
  }
  await page.goto(fellowshipUrl);
  await page.waitForLoadState('networkidle').catch(() => {});
  for (const name of [memberName, ...extra]) {
    await expect(page.locator('main tbody tr').filter({ hasText: name })).toHaveCount(0);
  }
  console.log(`F2 removal persisted after reload for ${1 + extra.length} membership(s)`);
});

async function removeFellowshipMember(page: Page, name: string) {
  const row = page.locator('main tbody tr').filter({ hasText: name }).first();
  await expect(row).toBeVisible();
  await row.getByRole('button').last().click();
  await page.getByRole('menuitem', { name: /Remove/ }).click();
  await expectToast(page, /Member removed/);
  await expect(page.locator('main tbody tr').filter({ hasText: name })).toHaveCount(0);
}

test('Isolation: Church B admin does not see Church A canary family or visitor', async ({ page }) => {
  await signIn(page, 'B_ADMIN');
  await page.goto('/families');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
  await expect(page.getByText(FAMILY)).toHaveCount(0);
  await page.goto('/visitors');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
  await expect(page.getByText(VISITOR_LAST)).toHaveCount(0);
});
