/** Phase 5 E5: secret columns unreadable from browsers; safe/public columns and real pages still work. */
import { expect, test } from '@playwright/test';
import { signIn, watch } from './staging-canary-helpers';
const A = process.env.PW_TENANT_A_ID ?? '';

test('secrets refused; settings pages still load and save', async ({ page }) => {
  test.setTimeout(180_000);
  const w = watch(page);
  let apikey = '';
  page.on('request', r => { if (!apikey && new URL(r.url()).hostname.endsWith('.supabase.co')) apikey = r.headers()['apikey'] ?? ''; });
  await signIn(page, 'A_STAFF');
  await expect(page).toHaveURL(/dashboard/);            // AuthGuard tenant load (safe column list) works
  await page.waitForLoadState('networkidle').catch(() => {});
  const { token, base } = await page.evaluate(() => {
    const k = Object.keys(localStorage).find(x => /^sb-.*-auth-token$/.test(x))!;
    return { token: JSON.parse(localStorage.getItem(k) as string).access_token as string, base: `https://${k.slice(3, k.indexOf('-auth-token'))}.supabase.co/rest/v1` };
  });
  const get = async (path: string, auth = true) => (await page.request.get(`${base}/${path}`, { headers: { apikey, ...(auth ? { Authorization: `Bearer ${token}` } : {}) } })).status();
  const r: Record<string, number> = {
    staffTenantSecret: await get(`tenants?select=daraja_consumer_secret&id=eq.${A}`),
    staffTenantAtKey: await get(`tenants?select=at_api_key&id=eq.${A}`),
    staffTenantStar: await get(`tenants?select=*&id=eq.${A}`),
    staffTenantSafe: await get(`tenants?select=id,name,timezone,enabled_modules&id=eq.${A}`),
    staffSmsKey: await get(`sms_settings?select=at_api_key&tenant_id=eq.${A}`),
    staffSmsSafe: await get(`sms_settings?select=id,is_configured&tenant_id=eq.${A}`),
    staffBranchHash: await get(`branches?select=branch_password_hash&tenant_id=eq.${A}`),
    anonPublicLookup: await get(`tenants?select=id,name,slug,church_code,logo&limit=1`, false),
    anonTenantSecret: await get(`tenants?select=daraja_passkey&limit=1`, false),
  };
  console.log('E5 matrix:', JSON.stringify(r));
  for (const k of ['staffTenantSecret', 'staffTenantAtKey', 'staffTenantStar', 'staffSmsKey', 'staffBranchHash', 'anonTenantSecret']) expect([401, 403], k).toContain(r[k]);
  for (const k of ['staffTenantSafe', 'staffSmsSafe', 'anonPublicLookup']) expect(r[k], k).toBe(200);
  await page.context().clearCookies();
});

test('admin General Settings still loads and saves with the safe column list', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/general');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: /Settings saved successfully/ }).first()).toBeVisible();
  const bad = w.failures.filter(f => /\/rest\/v1\/(tenants|sms_settings|branches)/.test(f));
  console.log('Settings failures:', JSON.stringify(bad));
  expect(bad).toEqual([]);
});
