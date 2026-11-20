/** Phase 5 E4: staff with member_management may provision; other church may not. Uses an ALREADY-linked member (no new identity). */
import { expect, test, type Browser } from '@playwright/test';
import { signIn, type Actor } from './staging-canary-helpers';
const A = process.env.PW_TENANT_A_ID ?? '';
const MEMBER = process.env.PW_LINKED_MEMBER_A ?? '';
const bypass = { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET!, 'x-vercel-set-bypass-cookie': 'true' };
async function call(browser: Browser, actor: Actor) {
  const ctx = await browser.newContext({ extraHTTPHeaders: bypass }); const page = await ctx.newPage();
  let apikey = ''; page.on('request', r => { if (!apikey && new URL(r.url()).hostname.endsWith('.supabase.co')) apikey = r.headers()['apikey'] ?? ''; });
  await signIn(page, actor); await page.waitForLoadState('networkidle').catch(() => {});
  const { token, origin } = await page.evaluate(() => { const k = Object.keys(localStorage).find(x => /^sb-.*-auth-token$/.test(x))!; return { token: JSON.parse(localStorage.getItem(k) as string).access_token as string, origin: `https://${k.slice(3, k.indexOf('-auth-token'))}.supabase.co` }; });
  const r = await page.request.post(`${origin}/functions/v1/member-provision-access`, { headers: { Authorization: `Bearer ${token}`, apikey, 'Content-Type': 'application/json' }, data: { memberId: MEMBER, tenantId: A } });
  const out = { status: r.status(), body: await r.json().catch(() => null) }; await ctx.close(); return out;
}
test('E4 provisioning authorization', async ({ browser }) => {
  expect(A && MEMBER).toBeTruthy();
  const aStaff = await call(browser, 'A_STAFF');
  const bStaff = await call(browser, 'B_STAFF');
  console.log('E4:', JSON.stringify({ aStaff, bStaff }));
  expect(aStaff.status).toBe(200);
  expect(aStaff.body?.status).toBe('already_provisioned');
  expect(bStaff.status).toBe(403);
});
