/**
 * T12 canary (23 Nov): Settings → Billing shows the storage usage computed
 * on the server (refresh_storage_usage) for QA Church A. Read-only.
 */
import { expect, test } from '@playwright/test';
import { signIn, watch } from './staging-canary-helpers';

test('T12: Billing shows server-computed storage usage', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  const usageReply = page.waitForResponse(r => r.url().includes('/rest/v1/rpc/refresh_storage_usage') && r.request().method() === 'POST');
  await page.goto('/settings/billing');
  const reply = await usageReply;
  expect(reply.status()).toBe(200);
  const usage = await reply.json() as { used_bytes: number; used_gb: number; limit_gb: number };
  expect(usage.used_bytes).toBeGreaterThan(0);
  const expected = usage.used_gb * 1024 < 1
    ? `${Math.ceil(usage.used_gb * 1024 * 1024).toLocaleString('en-US')} KB used`
    : usage.used_gb < 1
    ? `${(usage.used_gb * 1024).toLocaleString('en-US', { maximumFractionDigits: 1 })} MB used`
    : `${usage.used_gb.toLocaleString('en-US', { maximumFractionDigits: 2 })} GB used`;
  await expect(page.getByText(expected, { exact: true })).toBeVisible();
  console.log('T12 usage', JSON.stringify(usage), '| shown:', expected, '| failures:', JSON.stringify(w.failures), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(w.pageErrors).toEqual([]);
});
