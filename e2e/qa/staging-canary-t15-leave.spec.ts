/**
 * T15 batch 2 canary (23 Nov): Settings → Staff → Leave used a non-existent
 * org_id column, so every leave query failed. Church A admin submits a
 * QA-CANARY leave request and sees it listed after reload.
 */
import { expect, test } from '@playwright/test';
import { CANARY_TAG, signIn, watch } from './staging-canary-helpers';

test('Leave: submit a leave request; it is listed after reload', async ({ page }) => {
  test.setTimeout(180_000);
  const w = watch(page);
  const reason = `${CANARY_TAG} leave`;
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/staff');
  await page.getByRole('tab', { name: 'Leave' }).click();
  await page.getByRole('button', { name: 'New Leave Request' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('combobox').first().click();
  await page.getByRole('option').first().click();
  await dlg.getByRole('combobox').nth(1).click();
  await page.getByRole('option').first().click();
  const today = new Date(); const later = new Date(today.getTime() + 2 * 86400000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const dates = dlg.locator('input[type="date"]');
  await dates.nth(0).fill(iso(today));
  await dates.nth(1).fill(iso(later));
  await dlg.getByPlaceholder('Reason for leave...').fill(reason);
  await dlg.getByRole('button', { name: 'Submit Request' }).click();
  await expect(dlg).toBeHidden({ timeout: 20_000 });
  await page.reload();
  await page.getByRole('tab', { name: 'Leave' }).click();
  await expect(page.getByText(reason).first()).toBeVisible({ timeout: 20_000 });
  const leaveFailures = w.failures.filter(f => /staff_leave|staff_absences/.test(f));
  console.log('leave failures:', JSON.stringify(leaveFailures), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(leaveFailures).toEqual([]);
  expect(w.pageErrors).toEqual([]);
});
