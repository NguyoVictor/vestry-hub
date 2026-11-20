/**
 * Phase 5 canary (Findings 14, 19, 26 + restored tenant RLS).
 * - F26 in the real browser (Settings → Giving is reachable).
 * - F14/F19 + negative matrix through PostgREST with REAL QA user sessions
 *   (Church A admin, Church A staff, Church B admin). /asset-management and
 *   /resources-store are behind the resources_media module, which is OFF for
 *   the QA churches, so their browser check waits for user approval.
 * Records are tagged QA-CANARY in Church A only.
 */
import { expect, test, type Page } from '@playwright/test';
import { CANARY_TAG, signIn, watch, type Actor } from './staging-canary-helpers';

test.describe.configure({ mode: 'serial' });
const A = process.env.PW_TENANT_A_ID ?? '';
const B = process.env.PW_TENANT_B_ID ?? '';

async function session(page: Page, actor: Actor) {
  let apikey = '';
  page.on('request', r => { if (!apikey && new URL(r.url()).hostname.endsWith('.supabase.co')) apikey = r.headers()['apikey'] ?? ''; });
  await signIn(page, actor);
  await page.waitForLoadState('networkidle').catch(() => {});
  const { token, base, uid } = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => /^sb-.*-auth-token$/.test(k))!;
    const s = JSON.parse(localStorage.getItem(key) as string);
    return { token: s.access_token as string, uid: s.user.id as string,
             base: `https://${key.slice(3, key.indexOf('-auth-token'))}.supabase.co/rest/v1` };
  });
  const h = { Authorization: `Bearer ${token}`, apikey, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  const api = {
    uid,
    insert: async (t: string, row: object) => { const r = await page.request.post(`${base}/${t}`, { headers: h, data: row }); return { status: r.status(), body: await r.json().catch(() => null) }; },
    patch: async (t: string, q: string, row: object) => { const r = await page.request.patch(`${base}/${t}?${q}`, { headers: h, data: row }); return { status: r.status(), body: await r.json().catch(() => null) }; },
    count: async (t: string, q: string) => { const r = await page.request.get(`${base}/${t}?select=id&${q}`, { headers: h }); const j = await r.json().catch(() => null); return Array.isArray(j) ? j.length : -r.status(); },
  };
  return api;
}

test('F26 (browser): Church A admin creates a giving category; it persists', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/giving');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('button', { name: /^Add Category$/ }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder('e.g., Tithe, Offering, Missions').fill(`${CANARY_TAG} Fund`);
  // Code auto-fills from the name.
  await dlg.getByRole('button', { name: /^Create$/ }).click();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: /Category created successfully/ }).first()).toBeVisible();
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByText(`${CANARY_TAG} Fund`).first()).toBeVisible();
  const f = w.failures.filter(x => /giving_categories/.test(x));
  console.log('F26 failures:', JSON.stringify(f), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(f).toEqual([]);
});

test('F14/F19 + RLS matrix (API, real sessions)', async ({ browser }) => {
  expect(A && B && A !== B).toBeTruthy();
  const ctx = async () => browser.newContext({ extraHTTPHeaders: { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET!, 'x-vercel-set-bypass-cookie': 'true' } });
  const [ca, cs, cb] = await Promise.all([ctx(), ctx(), ctx()]);
  const aAdmin = await session(await ca.newPage(), 'A_ADMIN');
  const aStaff = await session(await cs.newPage(), 'A_STAFF');
  const bAdmin = await session(await cb.newPage(), 'B_ADMIN');
  const res: Record<string, unknown> = {};

  // F19: store category create + read back (A admin), invisible to B.
  const sc = await aAdmin.insert('store_categories', { tenant_id: A, name: `${CANARY_TAG} Books`, slug: `qa-canary-${Date.now()}` });
  res.F19_aAdminCreate = sc.status;
  res.F19_aAdminReads = await aAdmin.count('store_categories', `tenant_id=eq.${A}&name=like.${encodeURIComponent(CANARY_TAG)}*`);
  res.F19_bAdminReadsA = await bAdmin.count('store_categories', `tenant_id=eq.${A}`);
  res.F19_bAdminWritesIntoA = (await bAdmin.insert('store_categories', { tenant_id: A, name: 'x', slug: `x-${Date.now()}` })).status;

  // F14: asset + release request create, approve (A admin); B cannot see/approve.
  const asset = await aAdmin.insert('church_assets', { tenant_id: A, name: `${CANARY_TAG} Projector` });
  res.F14_assetCreate = asset.status;
  const assetId = Array.isArray(asset.body) ? asset.body[0]?.id : undefined;
  const rr = await aAdmin.insert('asset_release_requests', { tenant_id: A, asset_id: assetId, requested_by: aAdmin.uid, purpose: `${CANARY_TAG} release`, status: 'pending' });
  res.F14_requestCreate = rr.status;
  const rrId = Array.isArray(rr.body) ? rr.body[0]?.id : undefined;
  const ap = await aAdmin.patch('asset_release_requests', `id=eq.${rrId}`, { status: 'approved' });
  res.F14_adminApprove = ap.status; res.F14_approvedRows = Array.isArray(ap.body) ? ap.body.length : 0;
  res.F14_bAdminSeesA = await bAdmin.count('asset_release_requests', `tenant_id=eq.${A}`);
  const bp = await bAdmin.patch('asset_release_requests', `id=eq.${rrId}`, { status: 'returned' });
  res.F14_bAdminUpdatesA_rows = Array.isArray(bp.body) ? bp.body.length : bp.status;
  res.F14_aStaffReads = await aStaff.count('asset_release_requests', `id=eq.${rrId}`);

  // Permission administration: church admins only.
  res.PERM_aStaffWritesFeaturePerm = (await aStaff.insert('feature_permissions', { tenant_id: A, feature: 'qa_canary', role: 'staff', access_level: 'none' })).status;
  res.PERM_bAdminWritesFeaturePermIntoA = (await bAdmin.insert('feature_permissions', { tenant_id: A, feature: 'qa_canary', role: 'staff', access_level: 'none' })).status;

  // F26 negative: B cannot create giving categories in A; A staff (default level) can read A's.
  res.F26_bAdminWritesIntoA = (await bAdmin.insert('giving_categories', { tenant_id: A, name: 'x', code: `X${Date.now() % 100000}` })).status;
  res.F26_aStaffReadsA = await aStaff.count('giving_categories', `tenant_id=eq.${A}`);
  res.F26_bAdminReadsA = await bAdmin.count('giving_categories', `tenant_id=eq.${A}`);

  console.log('Phase 5 matrix:', JSON.stringify(res));
  expect(res.F19_aAdminCreate).toBe(201);
  expect(res.F19_aAdminReads).toBe(1);
  expect(res.F19_bAdminReadsA).toBe(0);
  expect(res.F19_bAdminWritesIntoA).toBe(403);
  expect(res.F14_assetCreate).toBe(201);
  expect(res.F14_requestCreate).toBe(201);
  expect(res.F14_adminApprove).toBe(200);
  expect(res.F14_approvedRows).toBe(1);
  expect(res.F14_bAdminSeesA).toBe(0);
  expect(res.F14_bAdminUpdatesA_rows).toBe(0);
  expect(res.F14_aStaffReads).toBe(1);
  expect(res.PERM_aStaffWritesFeaturePerm).toBe(403);
  expect(res.PERM_bAdminWritesFeaturePermIntoA).toBe(403);
  expect(res.F26_bAdminWritesIntoA).toBe(403);
  expect(res.F26_aStaffReadsA as number).toBeGreaterThan(0);
  expect(res.F26_bAdminReadsA).toBe(0);
  await Promise.all([ca.close(), cs.close(), cb.close()]);
});
