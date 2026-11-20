import { test } from '@playwright/test';
test('diag: capture startup errors', async ({ page }) => {
  const errs: string[] = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message.slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
  page.on('requestfailed', r => errs.push('reqfailed: ' + new URL(r.url()).pathname + ' ' + (r.failure()?.errorText ?? '')));
  await page.goto('/auth/signin');
  await page.waitForTimeout(6000);
  console.log('DIAG', JSON.stringify({ url: page.url(), title: await page.title(), errs: errs.slice(0, 8) }));
});
