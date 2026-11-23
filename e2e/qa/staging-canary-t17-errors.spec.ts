/**
 * T17 canary (23 Nov): a server function's own refusal reason reaches the
 * screen. Inviting an email that already has an account makes send-invitation
 * reply 409 "Existing-account access requires a separate review" — before the
 * fix the toast said "Edge Function returned a non-2xx status code".
 * Nothing is created (the server refuses).
 */
import { expect, test } from '@playwright/test';
import { scopeBypassToPreview, signIn } from './staging-canary-helpers';

test.use({ extraHTTPHeaders: {} });
test.beforeEach(async ({ page }) => { await scopeBypassToPreview(page); });

test('invite of an existing account shows the real reason', async ({ page }) => {
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/users');
  await page.getByRole('button', { name: 'Add User' }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.getByText('Not in the system? Invite by email instead').click();
  await dlg.getByPlaceholder('First name').fill('QA Canary');
  await dlg.getByPlaceholder('their@email.com').fill(process.env.E2E_A_STAFF_EMAIL!);
  const roleSelect = dlg.getByRole('combobox').first();
  if (/Select|role/i.test(await roleSelect.innerText())) {
    await roleSelect.click();
    await page.getByRole('option', { name: 'Staff', exact: true }).click();
  }
  await dlg.getByRole('button', { name: 'Send Invitation' }).click();
  const toast = page.locator('[data-sonner-toast]').first();
  await expect(toast).toBeVisible({ timeout: 20_000 });
  const text = await toast.innerText();
  console.log('T17 toast:', text);
  expect(text).not.toMatch(/non-2xx/);
  expect(text).toMatch(/Existing-account access requires a separate review|already/i);
});
