/**
 * Day 2 (21 Nov) canary as Church A admin — read-only UI checks, no writes,
 * no emails sent:
 *  - T2: live multiplayer quiz hidden (no Launch Live buttons; host route
 *    blocked; old /join links explain it is unavailable).
 *  - T6: Users page offers "Send set-password email" for other staff (the
 *    old always-409 "Send invitation" button is gone). Not clicked, to avoid
 *    using the Auth email rate limit before the afternoon UAT.
 */
import { expect, test } from '@playwright/test';
import { signIn, watch } from './staging-canary-helpers';

test.describe.configure({ mode: 'serial' });

test('T2: live quiz entry points are available', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/training');
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await expect(page.getByRole('heading', { name: /Training/ }).first()).toBeVisible();
  // 23 Nov: the live quiz was rebuilt (T2) and is now part of launch scope;
  // the full game is covered by staging-canary-live-quiz-gifts.spec.ts.
  await expect(page.getByRole('button', { name: 'Launch Live Quiz' })).toBeVisible();
  await page.goto('/join/ABC123');
  await expect(page.getByLabel('Nickname')).toBeVisible();
  console.log('T2 pageErrors:', JSON.stringify(w.pageErrors));
  expect(w.pageErrors).toEqual([]);
});

test('T6: Users page offers a set-password email instead of the failing invite', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/users');
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await expect(page.getByRole('button', { name: /^Send set-password email to /i }).first()).toBeVisible();
  await expect(page.locator('button[title="Send invitation"]')).toHaveCount(0);
  console.log('T6 failures:', JSON.stringify(w.failures), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(w.pageErrors).toEqual([]);
});
