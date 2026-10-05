import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { actorStorageState } from './fixtures/auth';

const adminState = actorStorageState('full-admin');

test('import fixtures cover valid invalid and duplicate rows', () => {
  for (const file of ['members-valid.csv', 'members-invalid.csv', 'members-duplicates.csv']) {
    expect(readFileSync(new URL(`./fixtures/imports/${file}`, import.meta.url), 'utf8').trim()).not.toBe('');
  }
});

test.describe('member import/export UI', () => {
  test.skip(!adminState, 'requires PW_FULL_ADMIN_STORAGE_STATE');
  if (adminState) test.use({ storageState: adminState });

  test('Import Members opens the tenant-scoped importer', async ({ page }) => {
    await page.goto('/members');
    await page.getByRole('button', { name: 'Import Members' }).click();
    await expect(page.getByText(/Import Members/i).first()).toBeVisible();
  });

  test('Export downloads a CSV and does not include the configured Tenant B marker', async ({ page }) => {
    await page.goto('/members');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/members\.csv$/i);
    const path = await download.path();
    expect(path).toBeTruthy();
    const csv = readFileSync(path!, 'utf8');
    expect(csv).toMatch(/Name,Email,Phone,Status,City,Join Date/);
    const tenantBMarker = process.env.PW_TENANT_B_MARKER;
    if (tenantBMarker) expect(csv).not.toContain(tenantBMarker);
  });
});
