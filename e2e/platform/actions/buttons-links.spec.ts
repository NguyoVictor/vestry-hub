import { test, expect } from '@playwright/test';
import { actorStorageState } from '../fixtures/auth';

const adminState = actorStorageState('full-admin');

test.describe('critical Admin controls', () => {
  test.skip(!adminState, 'requires PW_FULL_ADMIN_STORAGE_STATE');
  if (adminState) test.use({ storageState: adminState });

  test('Members exposes Add Member and export controls', async ({ page }) => {
    await page.goto('/members');
    await expect(page.getByRole('button', { name: 'Add Member' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export' }).first()).toBeVisible();
  });

  test('Announcements exposes Post Announcement', async ({ page }) => {
    await page.goto('/announcements');
    await expect(page.getByRole('button', { name: /Post Announcement/i }).first()).toBeVisible();
  });

  test('Surveys exposes Create Survey', async ({ page }) => {
    await page.goto('/surveys');
    await expect(page.getByRole('button', { name: /Create Survey/i }).first()).toBeVisible();
  });
});
