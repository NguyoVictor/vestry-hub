/** Phase 6 Finding 8: server-generated security alerts + admin-only sessions/access log. */
import { expect, test, type Browser, type Page } from '@playwright/test';
import { signIn, watch, type Actor } from './staging-canary-helpers';
const A = process.env.PW_TENANT_A_ID ?? '';
const bypass = { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET!, 'x-vercel-set-bypass-cookie': 'true' };

async function session(browser: Browser, actor: Actor) {
  const ctx = await browser.newContext({ extraHTTPHeaders: bypass }); const page: Page = await ctx.newPage();
  let apikey = ''; page.on('request', r => { if (!apikey && new URL(r.url()).hostname.endsWith('.supabase.co')) apikey = r.headers()['apikey'] ?? ''; });
  await signIn(page, actor); await page.waitForLoadState('networkidle').catch(() => {});
  const s = await page.evaluate(() => { const k = Object.keys(localStorage).find(x => /^sb-.*-auth-token$/.test(x))!; const v = JSON.parse(localStorage.getItem(k) as string); return { token: v.access_token as string, uid: v.user.id as string, origin: `https://${k.slice(3, k.indexOf('-auth-token'))}.supabase.co` }; });
  const h = { Authorization: `Bearer ${s.token}`, apikey, 'Content-Type': 'application/json' };
  return { ...s, page, ctx, apikey, h };
}

test('Finding 8: real security alerts', async ({ browser, page }) => {
  test.setTimeout(240_000);
  // 1) Three wrong-password attempts for A-STAFF via the real sign-in page.
  const email = process.env.E2E_A_STAFF_EMAIL!;
  for (let i = 0; i < 3; i++) {
    await page.goto('/auth/signin');
    await page.getByPlaceholder('you@church.org').fill(email);
    await page.getByPlaceholder('••••••••').fill(`wrong-password-canary-${i}`);
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(2500);
  }
  // Unknown email: must produce nothing (and reveal nothing).
  await page.goto('/auth/signin');
  await page.getByPlaceholder('you@church.org').fill(`no-such-user-${Date.now()}@example.test`);
  await page.getByPlaceholder('••••••••').fill('whatever-123');
  await page.locator('form button[type="submit"]').click();
  await page.waitForTimeout(2500);

  const admin = await session(browser, 'A_ADMIN');
  const staff = await session(browser, 'A_STAFF');
  // 2) Role change through the secured server function → medium alerts.
  const fn = (s: typeof admin, body: object) => s.page.request.post(`${s.origin}/functions/v1/update-user-role`, { headers: s.h, data: body }).then(r => r.status());
  const r: Record<string, unknown> = {};
  r.rolePastor = await fn(admin, { action: 'update_role', targetUserId: staff.uid, role: 'pastor', status: 'active' });
  r.roleStaff = await fn(admin, { action: 'update_role', targetUserId: staff.uid, role: 'staff', status: 'active' });

  // 3) Alerts visible to admin via REST (as the Security Centre reads them).
  const alerts = await admin.page.request.get(`${admin.origin}/rest/v1/security_alerts?select=alert_type,severity,status,created_at&tenant_id=eq.${A}&created_at=gte.${new Date(Date.now() - 15 * 60000).toISOString()}&order=created_at.desc`, { headers: admin.h }).then(x => x.json());
  const types = (alerts as Array<{ alert_type: string; severity: string }>).map(a => `${a.alert_type}:${a.severity}`);
  r.alertTypes = types;
  // 4) Admin-only functions; staff refused; browser cannot forge/delete alerts.
  const call = (s: typeof admin, name: string) => s.page.request.post(`${s.origin}/functions/v1/${name}`, { headers: s.h, data: { tenant_id: A } }).then(x => x.status());
  r.adminSessions = await call(admin, 'get-active-sessions');
  r.adminAccessLog = await call(admin, 'get-security-access-log');
  r.staffSessions = await call(staff, 'get-active-sessions');
  r.staffAccessLog = await call(staff, 'get-security-access-log');
  r.staffForgeAlert = await staff.page.request.post(`${staff.origin}/rest/v1/security_alerts`, { headers: staff.h, data: { tenant_id: A, severity: 'low', alert_type: 'fake', description: 'x' } }).then(x => x.status());
  const del = await admin.page.request.delete(`${admin.origin}/rest/v1/security_alerts?tenant_id=eq.${A}&alert_type=eq.failed_login`, { headers: { ...admin.h, Prefer: 'return=representation' } });
  r.adminDeleteRows = await del.json().then(j => Array.isArray(j) ? j.length : del.status()).catch(() => del.status());
  // 5) Security Centre page shows the alerts.
  const w = watch(admin.page);
  await admin.page.goto('/security-centre');
  await admin.page.waitForLoadState('networkidle').catch(() => {});
  r.pageShowsBruteForce = await admin.page.getByText(/Multiple failed sign-in attempts/).count();
  r.pageFailures = w.failures.filter(f => /security|sessions|access-log/.test(f));
  console.log('F8:', JSON.stringify(r));

  expect(r.rolePastor).toBe(200); expect(r.roleStaff).toBe(200);
  expect(types).toContain('failed_login:low');
  expect(types).toContain('brute_force_attempt:high');
  expect(types.filter(t => t.startsWith('role_changed')).length).toBeGreaterThanOrEqual(2);
  expect(r.adminSessions).toBe(200); expect(r.adminAccessLog).toBe(200);
  expect(r.staffSessions).toBe(403); expect(r.staffAccessLog).toBe(403);
  expect([401, 403]).toContain(r.staffForgeAlert);
  expect(r.adminDeleteRows).toBe(0);
  expect(r.pageShowsBruteForce as number).toBeGreaterThan(0);
  expect(r.pageFailures).toEqual([]);
  await Promise.all([admin.ctx.close(), staff.ctx.close()]);
});
