import { test, expect } from '@playwright/test';
import { actorStorageState } from './fixtures/auth';

const fullAdmin = actorStorageState('full-admin');
const readOnlyAdmin = actorStorageState('read-only-admin');
const noPermissionAdmin = actorStorageState('no-permission-admin');

test.describe('permission combination matrix', () => {
  test.describe('full Admin', () => {
    test.skip(!fullAdmin, 'requires PW_FULL_ADMIN_STORAGE_STATE');
    if (fullAdmin) test.use({ storageState: fullAdmin });
    test('can see enabled member mutations', async ({ page }) => {
      await page.goto('/members');
      await expect(page.getByRole('button', { name: 'Add Member' }).first()).toBeEnabled();
    });
  });

  test.describe('read-only Admin', () => {
    test.skip(!readOnlyAdmin, 'requires PW_READ_ONLY_ADMIN_STORAGE_STATE');
    if (readOnlyAdmin) test.use({ storageState: readOnlyAdmin });
    test('sees member mutation control disabled', async ({ page }) => {
      await page.goto('/members');
      await expect(page.getByRole('button', { name: 'Add Member' }).first()).toBeDisabled();
    });
  });

  test.describe('no-permission Admin', () => {
    test.skip(!noPermissionAdmin, 'requires PW_NO_PERMISSION_ADMIN_STORAGE_STATE');
    if (noPermissionAdmin) test.use({ storageState: noPermissionAdmin });
    test('cannot obtain an enabled member mutation control', async ({ page }) => {
      await page.goto('/members');
      const button = page.getByRole('button', { name: 'Add Member' }).first();
      if (await button.count()) await expect(button).toBeDisabled();
    });
  });
});
