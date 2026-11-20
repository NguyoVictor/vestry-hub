/** Phase 6: hardened functions — refusals and SSRF guard (no church code is changed). */
import { expect, test, type Browser } from '@playwright/test';
import { signIn, type Actor } from './staging-canary-helpers';
const A = process.env.PW_TENANT_A_ID ?? '';
const bypass = { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET!, 'x-vercel-set-bypass-cookie': 'true' };
async function s(browser: Browser, actor: Actor) {
  const ctx = await browser.newContext({ extraHTTPHeaders: bypass }); const page = await ctx.newPage();
  let apikey = ''; page.on('request', r => { if (!apikey && new URL(r.url()).hostname.endsWith('.supabase.co')) apikey = r.headers()['apikey'] ?? ''; });
  await signIn(page, actor); await page.waitForLoadState('networkidle').catch(() => {});
  const v = await page.evaluate(() => { const k = Object.keys(localStorage).find(x => /^sb-.*-auth-token$/.test(x))!; return { token: JSON.parse(localStorage.getItem(k) as string).access_token as string, origin: `https://${k.slice(3, k.indexOf('-auth-token'))}.supabase.co` }; });
  const post = async (fn: string, data: object, auth = true) => { const r = await page.request.post(`${v.origin}/functions/v1/${fn}`, { headers: { apikey, 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${v.token}` } : {}) }, data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  return { post, close: () => ctx.close() };
}
test('Phase 6 hardened functions', async ({ browser }) => {
  test.setTimeout(180_000);
  const staff = await s(browser, 'A_STAFF'); const bAdmin = await s(browser, 'B_ADMIN');
  const r: Record<string, unknown> = {};
  r.codeNoAuth = (await staff.post('generate-church-code', { tenantId: A, churchName: 'X' }, false)).status;
  r.codeStaff = (await staff.post('generate-church-code', { tenantId: A, churchName: 'X' })).status;
  r.codeOtherChurchAdmin = (await bAdmin.post('generate-church-code', { tenantId: A, churchName: 'X' })).status;
  r.ogNoAuth = (await staff.post('fetch-og-metadata', { url: 'https://example.com' }, false)).status;
  for (const u of ['http://169.254.169.254/latest/meta-data/', 'http://127.0.0.1/', 'http://[::1]/', 'file:///etc/passwd', 'http://10.0.0.1/', 'http://example.com:8080/']) {
    r[`og_${u}`] = (await staff.post('fetch-og-metadata', { url: u })).status;
  }
  const pub = await staff.post('fetch-og-metadata', { url: 'https://example.com/' });
  r.ogPublic = pub.status; r.ogPublicTitle = pub.body?.title ?? null;
  console.log('P6 fns:', JSON.stringify(r));
  expect(r.codeNoAuth).toBe(401); expect(r.codeStaff).toBe(403); expect(r.codeOtherChurchAdmin).toBe(403);
  expect(r.ogNoAuth).toBe(401);
  for (const k of Object.keys(r).filter(k => k.startsWith('og_'))) expect(r[k], k).toBe(400);
  expect(r.ogPublic).toBe(200);
  await Promise.all([staff.close(), bAdmin.close()]);
});
