/** B3 backfill function: DRY RUN + authorization only (provisions nothing). */
import { expect, test, type Browser } from '@playwright/test';
import { signIn, type Actor } from './staging-canary-helpers';
const A = process.env.PW_TENANT_A_ID ?? '';
const bypass = { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET!, 'x-vercel-set-bypass-cookie': 'true' };
async function call(browser: Browser, actor: Actor, body: object) {
  const ctx = await browser.newContext({ extraHTTPHeaders: bypass }); const page = await ctx.newPage();
  let apikey = ''; page.on('request', r => { if (!apikey && new URL(r.url()).hostname.endsWith('.supabase.co')) apikey = r.headers()['apikey'] ?? ''; });
  await signIn(page, actor); await page.waitForLoadState('networkidle').catch(() => {});
  const v = await page.evaluate(() => { const k = Object.keys(localStorage).find(x => /^sb-.*-auth-token$/.test(x))!; return { t: JSON.parse(localStorage.getItem(k) as string).access_token as string, o: `https://${k.slice(3, k.indexOf('-auth-token'))}.supabase.co` }; });
  const r = await page.request.post(`${v.o}/functions/v1/member-portal-backfill`, { headers: { Authorization: `Bearer ${v.t}`, apikey, 'Content-Type': 'application/json' }, data: body });
  const out = { status: r.status(), body: await r.json().catch(() => null) }; await ctx.close(); return out;
}
test('B3 backfill dry run + authorization', async ({ browser }) => {
  test.setTimeout(180_000);
  const adminDry = await call(browser, 'A_ADMIN', { dryRun: true });
  const staff = await call(browser, 'A_STAFF', { dryRun: true });
  const bIntoA = await call(browser, 'B_ADMIN', { tenantId: A, dryRun: true });
  console.log('B3:', JSON.stringify({ adminDry, staff: staff.status, bIntoA: bIntoA.status }));
  expect(adminDry.status).toBe(200);
  expect(adminDry.body?.dryRun).toBe(true);
  expect(adminDry.body?.tenantId).toBe(A);
  expect(staff.status).toBe(403);
  expect(bIntoA.status).toBe(403);
});
