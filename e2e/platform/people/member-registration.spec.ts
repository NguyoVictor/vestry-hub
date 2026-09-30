import { expect, test } from '@playwright/test';

const tenant = {
  id: 'tenant-a',
  name: 'Grace Church',
  logo: null,
  church_code: 'GRACE1234',
};

test('legacy member registration uses the canonical pending-approval flow', async ({ page }) => {
  let registrationBody: Record<string, unknown> | null = null;

  await page.route('**/rest/v1/tenants*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tenant) });
  });
  await page.route('**/functions/v1/member-register', async route => {
    registrationBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ type: 'member', member: { id: 'member-a' }, churchCode: tenant.church_code, churchName: tenant.name }),
    });
  });

  await page.goto('/member-registration/tenant-a');
  await page.getByPlaceholder('Your first name').fill('Ada');
  await page.getByPlaceholder('Your last name').fill('Lovelace');
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Female', exact: true }).click();
  await page.getByPlaceholder('Your phone number').fill('+254700000001');
  await page.getByPlaceholder('Your email address').fill('ada@example.com');
  await page.getByRole('button', { name: 'Submit Registration' }).click();

  await expect(page.getByText(/pending church admin approval/i)).toBeVisible();
  expect(registrationBody).toMatchObject({
    churchCode: tenant.church_code,
    memberType: 'member',
    registrationSource: 'form',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
  });
});

test('pending member login does not establish a member session', async ({ page }) => {
  await page.route('**/rest/v1/tenants*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ name: tenant.name, logo: null }) });
  });
  await page.route('**/functions/v1/member-login', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ error: 'pending_approval' }) });
  });

  await page.goto(`/member/login?code=${tenant.church_code}`);
  await page.getByLabel('Email Address').fill('pending@example.com');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page.getByText(/membership is pending approval/i)).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem('member_session'));
  expect(stored).toBeNull();
});
