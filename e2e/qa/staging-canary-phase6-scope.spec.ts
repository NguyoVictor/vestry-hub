/** Phase 6 launch scope: deferred pages hidden + guarded calls make no network request. */
import { expect, test } from '@playwright/test';
import { signIn, watch } from './staging-canary-helpers';
const A = process.env.PW_TENANT_A_ID ?? '';
test('deferred areas hidden for Church A (Resources & Media module ON)', async ({ page }) => {
  const w = watch(page);
  const fnCalls: string[] = [];
  page.on('request', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/functions/v1/')) fnCalls.push(u.pathname); });
  await signIn(page, 'A_ADMIN');
  await page.waitForLoadState('networkidle').catch(() => {});
  const nav = (await page.locator('aside, nav').allInnerTexts()).join(' ');
  const hiddenInNav = ['AI Tools', 'Graphics Studio', 'Church Studio', 'Song Library', 'Church Media', 'Sermon Preparation', 'Livestreaming'].filter(t => nav.includes(t));
  const r: Record<string, unknown> = { navStillShows: hiddenInNav, navHasAssetMgmt: nav.includes('Asset Management') };
  for (const p of ['/ai-tools', '/church-media', '/livestreaming', '/graphics-studio']) {
    await page.goto(p); await page.waitForLoadState('networkidle').catch(() => {});
    r[`redirect_${p}`] = new URL(page.url()).pathname;
  }
  // Super-admin console function: Church admin is not a platform super admin.
  let apikey = ''; page.on('request', x => { if (!apikey && new URL(x.url()).hostname.endsWith('.supabase.co')) apikey = x.headers()['apikey'] ?? ''; });
  await page.goto('/dashboard'); await page.waitForLoadState('networkidle').catch(() => {});
  const { token, origin } = await page.evaluate(() => { const k = Object.keys(localStorage).find(x => /^sb-.*-auth-token$/.test(x))!; return { token: JSON.parse(localStorage.getItem(k) as string).access_token as string, origin: `https://${k.slice(3, k.indexOf('-auth-token'))}.supabase.co` }; });
  r.platformOverviewAsChurchAdmin = (await page.request.post(`${origin}/functions/v1/platform-admin-overview`, { headers: { Authorization: `Bearer ${token}`, apikey, 'Content-Type': 'application/json' }, data: {} })).status();
  r.deferredFnRequests = fnCalls.filter(p => /register-device-token|generate-ai|send-|africastalking|at-sms|canva|sentry/.test(p));
  r.pageErrors = w.pageErrors;
  console.log('Scope:', JSON.stringify(r));
  expect(hiddenInNav).toEqual([]);
  expect(r.navHasAssetMgmt).toBe(true);
  for (const p of ['/ai-tools', '/church-media', '/livestreaming', '/graphics-studio']) expect(r[`redirect_${p}`], p).not.toBe(p);
  expect(r.platformOverviewAsChurchAdmin).toBe(403);
  expect(r.deferredFnRequests).toEqual([]);
  expect(w.pageErrors).toEqual([]);
  void A;
});
