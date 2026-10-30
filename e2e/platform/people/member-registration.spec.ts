
import { expect, test } from '@playwright/test';

const tenant = {
  id: 'tenant-a',
  name: 'Grace Church',
  logo: null,
  church_code: 'GRACE1234',
};

/**
 * TEST 1: Member registration
 *
 * Verify that a new member can submit a registration
 * and receives confirmation that approval is pending.
 *
 * The Supabase requests are mocked, so this test does
 * not create real members in staging.
 */
test('legacy member registration uses the canonical pending-approval flow', async ({ page }) => {
  let registrationBody: Record<string, unknown> | null = null;

  // Mock the church lookup.
  await page.route('**/rest/v1/tenants*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(tenant),
    });
  });

  // Mock the registration Edge Function.
  await page.route('**/functions/v1/member-register', async (route) => {
    registrationBody = route.request().postDataJSON();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        type: 'member',
        member: { id: 'member-a' },
        churchCode: tenant.church_code,
        churchName: tenant.name,
      }),
    });
  });

  // Open the member registration page.
  await page.goto('/member-registration/tenant-a');

  // Complete the registration form.
  await page.getByPlaceholder('Your first name').fill('Ada');

  await page.getByPlaceholder('Your last name').fill('Lovelace');

  await page.getByRole('combobox').first().click();

  await page.getByRole('option', {
    name: 'Female',
    exact: true,
  }).click();

  await page.getByPlaceholder('Your phone number')
    .fill('+254700000001');

  await page.getByPlaceholder('Your email address')
    .fill('ada@example.com');

  // Submit the registration.
  await page.getByRole('button', {
    name: 'Submit Registration',
  }).click();

  // Confirm that registration is pending approval.
  await expect(
    page.getByText(/pending church admin approval/i)
  ).toBeVisible();

  // Verify the data submitted to the Edge Function.
  // The legacy frontend uses 'form'; the backend
  // normalizes this value to the canonical 'web_form'.
  expect(registrationBody).toMatchObject({
    churchCode: tenant.church_code,
    memberType: 'member',
    registrationSource: 'form',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
  });
});

/**
 * TEST 2: Member login request
 *
 * Verify that requesting email authentication does
 * not immediately establish a member portal session.
 *
 * A valid member_session should only be issued after
 * authentication and backend membership validation.
 */

test('requesting member login does not establish a member session', async ({ page }) => {
  // Start without an existing member session.
  await page.addInitScript(() => {
    localStorage.removeItem('member_session');
  });

  // Mock the church lookup.
  await page.route('**/rest/v1/tenants*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: tenant.name,
        logo: tenant.logo,
      }),
    });
  });

  // Prevent a real OTP email from being sent.
  await page.route('**/auth/v1/otp*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });

  // Open the actual member portal login page.
  await page.goto(`/member/login?code=${tenant.church_code}`);

  // Verify the correct login page is displayed.
  await expect(
    page.getByRole('heading', { name: /member portal|grace church/i })
  ).toBeVisible();

  // Fill the actual login form using placeholders.
  await page.getByPlaceholder('you@example.com')
    .fill('pending@example.com');

  await page.getByPlaceholder('e.g. HOPE-2847')
    .fill(tenant.church_code);

  // Request an email verification code.
  await page.getByRole('button', {
    name: 'Email Me a Code',
  }).click();

  // Verify the application advances to OTP verification.
  await expect(
    page.getByPlaceholder('Enter the code from your email')
  ).toBeVisible();

  // The user has not completed OTP verification.
  // Therefore, no member session should exist.
  const storedSession = await page.evaluate(() => {
    return localStorage.getItem('member_session');
  });

  expect(storedSession).toBeNull();

  // The member should still be on the login page.
  await expect(page).toHaveURL(/\/member\/login/);
});
