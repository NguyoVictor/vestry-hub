/**
 * Phase 3 staging canary, Findings 5–6 (Operations). The user approved
 * enabling the Operations module for QA Church A only (20 Nov 2026); it is
 * done through the real admin Settings → Modules screen. Church B is untouched.
 */
import { expect, test, type Page } from '@playwright/test';
import { CANARY_TAG, signIn, watch } from './staging-canary-helpers';

const REQUEST_TITLE = `${CANARY_TAG} Request`;
const MEETING_TITLE = `${CANARY_TAG} Meeting`;

test.describe.configure({ mode: 'serial' });

async function expectToast(page: Page, text: RegExp) {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: text }).first()).toBeVisible();
}

async function pickFirstOption(page: Page, trigger: ReturnType<Page['getByRole']>) {
  await trigger.click();
  await page.getByRole('option').first().click();
}

test('Church A admin enables the Operations module via Settings → Modules', async ({ page }) => {
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/modules');
  const sw = page.getByRole('switch', { name: 'Toggle Operations' });
  await expect(sw).toBeVisible();
  if ((await sw.getAttribute('aria-checked')) !== 'true') {
    await sw.click();
    await page.getByRole('button', { name: /Save Changes/ }).click();
    await expectToast(page, /Module settings saved/);
  }
  await page.goto('/member-requests');
  await expect(page).toHaveURL(/\/member-requests/);
  // New churches start with no request types; a real admin adds the defaults.
  await page.goto('/settings/service-requests');
  const seed = page.getByRole('button', { name: 'Add Default Types' });
  await page.waitForLoadState('networkidle').catch(() => {});
  if (await seed.isVisible().catch(() => false)) {
    await seed.click();
    await expectToast(page, /Default service types added/);
  }
});

test('Finding 5: request status changes persist (Start → Resolve)', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/member-requests');
  await expect(page).toHaveURL(/\/member-requests/);
  const card = () => page.locator('div').filter({ hasText: REQUEST_TITLE })
    .filter({ has: page.getByRole('button', { name: 'Resolve', exact: true }) }).last();
  await page.waitForLoadState('networkidle').catch(() => {});
  if (!(await page.getByText(REQUEST_TITLE).first().isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /Create Request/ }).first().click();
    const sheet = page.getByRole('dialog');
    await pickFirstOption(page, sheet.getByRole('combobox').filter({ hasText: 'Select member' }));
    await pickFirstOption(page, sheet.getByRole('combobox').filter({ hasText: 'Select type' }));
    await sheet.getByPlaceholder('Brief title for this request').fill(REQUEST_TITLE);
    await sheet.getByPlaceholder('Describe the request in detail...').fill('Recovery Phase 3 canary — safe to delete.');
    await sheet.getByRole('button', { name: /^(Create|Save|Submit)/ }).last().click();
    await expectToast(page, /Request created/);
  }

  // Kanban (default view): New → Start → In Progress → Resolve → Resolved.
  for (const [action, column] of [['Start', 'In Progress'], ['Resolve', 'Resolved']] as const) {
    await page.reload();
    await page.waitForLoadState('networkidle').catch(() => {});
    await card().getByRole('button', { name: action, exact: true }).click();
    await expectToast(page, action === 'Resolve' ? /Request resolved/ : /Status updated/);
    await page.reload();
    await page.waitForLoadState('networkidle').catch(() => {});
    const col = page.locator('div').filter({ has: page.getByText(column, { exact: true }) })
      .filter({ hasText: REQUEST_TITLE }).last();
    await expect(col).toBeVisible();
    console.log(`F5 after ${action} + reload: card shown under "${column}"`);
  }
  console.log('F5 failures:', JSON.stringify(w.failures.filter(f => /member_request/.test(f))), 'pageErrors:', JSON.stringify(w.pageErrors));
  expect(w.failures.filter(f => /member_request/.test(f))).toEqual([]);
  expect(w.pageErrors).toEqual([]);
});

test('Finding 6: an online board meeting with link and notes is scheduled and persists', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/board-meetings');
  await expect(page).toHaveURL(/\/board-meetings/);
  await page.getByRole('button', { name: /Schedule Meeting/ }).first().click();
  const sheet = page.getByRole('dialog');
  await sheet.getByPlaceholder('Board Meeting — Q1 Review').fill(MEETING_TITLE);
  const locType = sheet.locator('label:text-is("Location Type")').locator('..').getByRole('combobox');
  await locType.click();
  await page.getByRole('option', { name: 'Online' }).click();
  await sheet.getByPlaceholder('https://zoom.us/...').fill('https://example.test/qa-canary-meeting');
  await sheet.locator('label:text-is("Pre-meeting Notes")').locator('..').locator('textarea').fill('Canary pre-meeting notes');
  await sheet.getByRole('button', { name: 'Schedule Meeting' }).click();
  await expectToast(page, /Meeting scheduled/);
  await page.reload();
  await expect(page.getByText(MEETING_TITLE).first()).toBeVisible();
  console.log('F6 failures:', JSON.stringify(w.failures.filter(f => /board_meeting|meeting_attendees/.test(f))), 'pageErrors:', JSON.stringify(w.pageErrors));
  expect(w.failures.filter(f => /board_meeting|meeting_attendees/.test(f))).toEqual([]);
  expect(w.pageErrors).toEqual([]);
});

test('Isolation: Church B (Operations still off) cannot open Member Requests or Board Meetings', async ({ page }) => {
  await signIn(page, 'B_ADMIN');
  for (const p of ['/member-requests', '/board-meetings']) {
    await page.goto(p);
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page).not.toHaveURL(new RegExp(p));
  }
});
