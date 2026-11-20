/**
 * Phase 5 E11 + read-only permission path (end to end through PostgREST).
 * Church A admin sets A-STAFF's reports_analytics level to read_only, A-STAFF
 * is refused an incident write but can still read; restriction removed → write
 * allowed. Cleans up the incident and the permission row.
 */
import { expect, test, type Browser } from '@playwright/test';
import { CANARY_TAG, signIn, type Actor } from './staging-canary-helpers';
const A = process.env.PW_TENANT_A_ID ?? '';
const bypass = { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET!, 'x-vercel-set-bypass-cookie': 'true' };

async function api(browser: Browser, actor: Actor) {
  const ctx = await browser.newContext({ extraHTTPHeaders: bypass }); const page = await ctx.newPage();
  let apikey = ''; page.on('request', r => { if (!apikey && new URL(r.url()).hostname.endsWith('.supabase.co')) apikey = r.headers()['apikey'] ?? ''; });
  await signIn(page, actor); await page.waitForLoadState('networkidle').catch(() => {});
  const s = await page.evaluate(() => { const k = Object.keys(localStorage).find(x => /^sb-.*-auth-token$/.test(x))!; const v = JSON.parse(localStorage.getItem(k) as string); return { token: v.access_token as string, uid: v.user.id as string, base: `https://${k.slice(3, k.indexOf('-auth-token'))}.supabase.co/rest/v1` }; });
  const h = { Authorization: `Bearer ${s.token}`, apikey, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  return {
    uid: s.uid, close: () => ctx.close(),
    post: async (t: string, row: object) => { const r = await page.request.post(`${s.base}/${t}`, { headers: h, data: row }); return { status: r.status(), body: await r.json().catch(() => null) }; },
    del: async (t: string, q: string) => (await page.request.delete(`${s.base}/${t}?${q}`, { headers: h })).status(),
    count: async (t: string, q: string) => { const r = await page.request.get(`${s.base}/${t}?select=id&${q}`, { headers: h }); const j = await r.json().catch(() => null); return Array.isArray(j) ? j.length : -r.status(); },
  };
}

test('E11: reports_analytics read_only blocks incident writes; reads still allowed', async ({ browser }) => {
  test.setTimeout(180_000);
  const admin = await api(browser, 'A_ADMIN');
  const staff = await api(browser, 'A_STAFF');
  const incident = () => ({ id: crypto.randomUUID(), tenant_id: A, incident_date: new Date().toISOString().slice(0, 10), incident_type: 'Other', description: `${CANARY_TAG} E11 canary`, status: 'open' });
  const r: Record<string, unknown> = {};
  const perm = await admin.post('user_fine_permissions', { user_id: staff.uid, tenant_id: A, permission_key: 'reports_analytics', level: 'read_only' });
  r.adminSetsReadOnly = perm.status;
  r.staffWriteWhileReadOnly = (await staff.post('incidents', incident())).status;
  r.staffReadsWhileReadOnly = await staff.count('incidents', `tenant_id=eq.${A}`);
  r.adminRemovesRestriction = await admin.del('user_fine_permissions', `user_id=eq.${staff.uid}&permission_key=eq.reports_analytics`);
  const ok = await staff.post('incidents', incident());
  r.staffWriteAfter = ok.status;
  const id = Array.isArray(ok.body) ? ok.body[0]?.id : undefined;
  r.cleanupIncident = id ? await admin.del('incidents', `id=eq.${id}`) : 'n/a';
  console.log('E11:', JSON.stringify(r));
  expect(r.adminSetsReadOnly).toBe(201);
  expect(r.staffWriteWhileReadOnly).toBe(403);
  expect(r.staffReadsWhileReadOnly as number).toBeGreaterThan(0);
  expect([200, 204]).toContain(r.adminRemovesRestriction);
  expect(r.staffWriteAfter).toBe(201);
  await Promise.all([admin.close(), staff.close()]);
});
