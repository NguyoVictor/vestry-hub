import { test, expect } from '@playwright/test';
import { actorStorageState } from '../fixtures/auth';

const adminState = actorStorageState('full-admin');
const memberState = actorStorageState('member-a');

test.describe('critical form behavior', () => {
  test.describe('Admin member form', () => {
    test.skip(!adminState, 'requires PW_FULL_ADMIN_STORAGE_STATE');
    if (adminState) test.use({ storageState: adminState });

    test('required fields block an empty Add Member submit', async ({ page }) => {
      await page.goto('/members');
      await page.getByRole('button', { name: 'Add Member' }).first().click();
      await expect(page.getByText('Add New Member')).toBeVisible();
      await page.getByRole('button', { name: 'Add Member' }).last().click();
      await expect(page.getByText('Add New Member')).toBeVisible();
      await expect(page.getByText(/required/i).first()).toBeVisible();
    });
  });

  test.describe('Member self-service form', () => {
    test.skip(!memberState, 'requires PW_MEMBER_A_STORAGE_STATE');
    if (memberState) test.use({ storageState: memberState });

    test('request form exposes one authoritative Submit Request action', async ({ page }) => {
      await page.goto('/member/requests');
      await expect(page.getByRole('button', { name: /Submit Request/i })).toBeVisible();
    });
  });
});
