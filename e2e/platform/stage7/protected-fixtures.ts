import { expect, type Page } from '@playwright/test';
import { actorStorageState } from '../fixtures/auth';
import { requireDisposablePlatformTestEnv } from '../fixtures/safety';

export const protectedState = {
  fullAdmin: actorStorageState('full-admin'),
  readOnlyAdmin: actorStorageState('read-only-admin'),
  noPermissionAdmin: actorStorageState('no-permission-admin'),
  memberA: actorStorageState('member-a'),
  memberB: actorStorageState('member-b'),
};

export function protectedBaseUrl() {
  return requireDisposablePlatformTestEnv().baseUrl;
}

export function env(name: string) {
  return process.env[name]?.trim() || undefined;
}

export async function expectNoHardCrash(page: Page) {
  await expect(page.locator('body')).toBeVisible();
  const body = (await page.locator('body').innerText()).trim();
  expect(body.length).toBeGreaterThan(0);
  expect(body).not.toMatch(/application error|unexpected error|internal server error/i);
}

export async function expectMutationControlUnavailable(page: Page, names: RegExp[]) {
  for (const name of names) {
    const locator = page.getByRole('button', { name }).first();
    if (await locator.count()) {
      await expect(locator).toBeDisabled();
    }
  }
}
