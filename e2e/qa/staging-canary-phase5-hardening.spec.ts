/**
 * Phase 5 hardening canary (E3/E7/E9/E10 + update-user-role) with real QA
 * sessions. Changes A-STAFF's role to "pastor" and back to "staff".
 */
import { expect, test, type Browser, type Page } from '@playwright/test';
import { signIn, watch, type Actor } from './staging-canary-helpers';

const A = process.env.PW_TENANT_A_ID ?? '';
const bypass = { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET!, 'x-vercel-set-bypass-cookie': 'true' };

async function session(browser: Browser, actor: Actor) {
  const ctx = await browser.newContext({ extraHTTPHeaders: bypass });
  const page: Page = await ctx.newPage();
  const w = watch(page);
  let apikey = '';
  page.on('request', r => { if (!apikey && new URL(r.url()).hostname.endsWith('.supabase.co')) apikey = r.headers()['apikey'] ?? ''; });
  await signIn(page, actor);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  const s = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => /^sb-.*-auth-token$/.test(k))!;
    const v = JSON.parse(localStorage.getItem(key) as string);
    return { token: v.access_token as string, uid: v.user.id as string, origin: `https://${key.slice(3, key.indexOf('-auth-token'))}.supabase.co` };
  });
  const h = { Authorization: `Bearer ${s.token}`, apikey, 'Content-Type': 'application/json' };
  const fn = async (body: object) => {
    const r = await page.request.post(`${s.origin}/functions/v1/update-user-role`, { headers: h, data: body });
    return { status: r.status(), body: await r.json().catch(() => null) };
  };
  const patchUser = async (id: string, row: object) =>
    (await page.request.patch(`${s.origin}/rest/v1/users?id=eq.${id}`, { headers: h, data: row })).status();
  const upload = async (bucket: string, path: string) =>
    (await page.request.post(`${s.origin}/storage/v1/object/${bucket}/${path}`, { headers: { ...h, 'Content-Type': 'image/png' }, data: Buffer.from([137, 80, 78, 71]) })).status();
  return { ...s, apikey, w, fn, patchUser, upload, close: () => ctx.close(), page };
}

test('Phase 5 hardening matrix', async ({ browser }) => {
  test.setTimeout(240_000);
  const aAdmin = await session(browser, 'A_ADMIN');
  const aStaff = await session(browser, 'A_STAFF');
  const bAdmin = await session(browser, 'B_ADMIN');
  const r: Record<string, unknown> = {};

  // E7: sign-in + page loads no longer produce denied users/login_events calls.
  r.E7_aAdminDeniedLoginCalls = aAdmin.w.failures.filter(f => /login_events|\/rest\/v1\/users/.test(f));
  // Guard still blocks direct browser changes of protected fields.
  r.E7_directLastLoginPatch = await aAdmin.patchUser(aAdmin.uid, { last_login_at: new Date().toISOString() });
  r.E7_directRolePatch = await aStaff.patchUser(aStaff.uid, { role: 'super_admin' });

  // update-user-role authorization.
  r.UUR_staffCaller = (await aStaff.fn({ action: 'update_role', targetUserId: aAdmin.uid, role: 'staff' })).status;
  r.UUR_otherChurch = (await bAdmin.fn({ action: 'deactivate', targetUserId: aStaff.uid })).status;
  r.UUR_self = (await aAdmin.fn({ action: 'update_role', targetUserId: aAdmin.uid, role: 'staff' })).status;
  r.UUR_badRole = (await aAdmin.fn({ action: 'update_role', targetUserId: aStaff.uid, role: 'god_mode' })).status;
  r.UUR_badStatus = (await aAdmin.fn({ action: 'update_role', targetUserId: aStaff.uid, role: 'pastor', status: 'banned' })).status;
  r.UUR_toPastor = (await aAdmin.fn({ action: 'update_role', targetUserId: aStaff.uid, role: 'pastor', status: 'active' })).status;
  r.UUR_backToStaff = (await aAdmin.fn({ action: 'update_role', targetUserId: aStaff.uid, role: 'staff', status: 'active' })).status;

  // E9: anon cannot read booker contact columns; public listing still works.
  const anon = { apikey: aAdmin.apikey };
  r.E9_anonBookerEmail = (await aAdmin.page.request.get(`${aAdmin.origin}/rest/v1/facilities?select=booker_email&limit=1`, { headers: anon })).status();
  r.E9_anonPublicCols = (await aAdmin.page.request.get(`${aAdmin.origin}/rest/v1/facilities?select=id,name&limit=1`, { headers: anon })).status();

  // E10: image buckets scoped to the uploader's church folder.
  const t = Date.now();
  r.E10_bIntoA_asset = await bAdmin.upload('asset-images', `${A}/qa-canary-x-${t}.png`);
  r.E10_bIntoA_facility = await bAdmin.upload('facility-images', `${A}/qa-canary-x-${t}.png`);
  r.E10_aOwn_asset = await aAdmin.upload('asset-images', `${A}/qa-canary-own-${t}.png`);
  r.E10_aOwn_facility = await aAdmin.upload('facility-images', `${A}/qa-canary-own-${t}.png`);

  console.log('Hardening matrix:', JSON.stringify(r));
  expect(r.E7_aAdminDeniedLoginCalls).toEqual([]);
  expect(r.E7_directLastLoginPatch).toBe(403);
  expect(r.E7_directRolePatch).toBe(403);
  expect(r.UUR_staffCaller).toBe(403);
  expect(r.UUR_otherChurch).toBe(404);
  expect(r.UUR_self).toBe(400);
  expect(r.UUR_badRole).toBe(400);
  expect(r.UUR_badStatus).toBe(400);
  expect(r.UUR_toPastor).toBe(200);
  expect(r.UUR_backToStaff).toBe(200);
  expect([401, 403]).toContain(r.E9_anonBookerEmail);
  expect(r.E9_anonPublicCols).toBe(200);
  expect(r.E10_bIntoA_asset).toBe(400);
  expect(r.E10_bIntoA_facility).toBe(400);
  expect(r.E10_aOwn_asset).toBe(200);
  expect(r.E10_aOwn_facility).toBe(200);
  await Promise.all([aAdmin.close(), aStaff.close(), bAdmin.close()]);
});
