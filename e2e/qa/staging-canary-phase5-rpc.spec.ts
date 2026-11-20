/** Phase 5: anonymous + cross-church calls to the analytics RPCs. Logs only status and top-level key names. */
import { expect, test } from '@playwright/test';
import { signIn } from './staging-canary-helpers';
const A = process.env.PW_TENANT_A_ID ?? '';
const B = process.env.PW_TENANT_B_ID ?? '';
const FNS = ['get_dashboard_stats_optimized', 'get_member_analytics_optimized', 'get_financial_analytics_optimized', 'get_performance_metrics_optimized', 'get_activity_feed_optimized'];
test('analytics RPC exposure', async ({ page }) => {
  let apikey = '';
  page.on('request', r => { if (!apikey && new URL(r.url()).hostname.endsWith('.supabase.co')) apikey = r.headers()['apikey'] ?? ''; });
  await signIn(page, 'A_ADMIN');
  await page.waitForLoadState('networkidle').catch(() => {});
  const { token, origin } = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => /^sb-.*-auth-token$/.test(k))!;
    return { token: JSON.parse(localStorage.getItem(key) as string).access_token as string, origin: `https://${key.slice(3, key.indexOf('-auth-token'))}.supabase.co` };
  });
  const call = async (fn: string, tenant: string, auth: boolean) => {
    const r = await page.request.post(`${origin}/rest/v1/rpc/${fn}`, { headers: { apikey, 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) }, data: { p_tenant_id: tenant } });
    const j = await r.json().catch(() => null);
    return `${r.status()}${j && (j as any).code ? " " + (j as any).code + ":" + String((j as any).message).slice(0, 90) : ""}${j && typeof j === 'object' && !Array.isArray(j) && !('code' in j) ? ' keys=' + Object.keys(j).slice(0, 4).join('|') : ''}`;
  };
  const out: Record<string, string[]> = {};
  for (const fn of FNS) out[fn] = [await call(fn, B, false), await call(fn, B, true), await call(fn, A, true)];
  console.log('RPC [anon→B, A-admin→B, A-admin→A]:', JSON.stringify(out));
  if (process.env.PW_EXPECT_FIXED === '1') {
    for (const fn of FNS) {
      expect(out[fn][0], `${fn} anon`).toMatch(/^(401|403|404)/);
      expect(out[fn][1], `${fn} cross-church`).toMatch(/^403/);
      // Own church passes the guard (no 403). The impl bodies themselves are broken
      // on staging (42883 varchar = uuid) — queued for reporting, not Phase 5.
      expect(out[fn][2], `${fn} own church`).not.toMatch(/^40[13]/);
    }
  }
});
