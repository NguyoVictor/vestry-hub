/** Read-only: screenshot the Facilities tab as Church A admin. */
import { test } from '@playwright/test';
import { signIn, watch } from './staging-canary-helpers';
test('look at facilities tab (read-only)', async ({ page }, info) => {
  const w = watch(page);
  const bodies: string[] = [];
  page.on('response', async r => {
    const u = new URL(r.url());
    if (u.pathname === '/rest/v1/facilities' && r.request().method() === 'GET') {
      try { const j = await r.json(); bodies.push(`rows=${Array.isArray(j) ? j.length : 'n/a'} status=${r.status()} q=${u.searchParams.get('select')?.slice(0, 60)}`); } catch { bodies.push(`status=${r.status()}`); }
    }
  });
  await signIn(page, 'A_ADMIN');
  await page.goto('/facility-booking');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: info.outputPath('facilities.png'), fullPage: true });
  console.log('facilities GETs:', JSON.stringify(bodies));
  console.log('failures:', JSON.stringify(w.failures.filter(f => !/login_events|\/users/.test(f))), 'pageErrors:', JSON.stringify(w.pageErrors));
});
