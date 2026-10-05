import { expect, test } from "@playwright/test";

const baseDomain = process.env.PW_TENANT_BASE_DOMAIN;
const tenantSlug = process.env.PW_TENANT_SLUG || process.env.PW_TENANT_A_SLUG;
const otherTenantSlug = process.env.PW_OTHER_TENANT_SLUG || process.env.PW_TENANT_B_SLUG;
const memberSession = process.env.PW_MEMBER_A_SESSION_JSON;

test.describe("tenant domain isolation", () => {
  test.skip(process.env.PW_PLATFORM_TEST_ENV !== 'disposable' || !baseDomain || !tenantSlug || !otherTenantSlug, "Requires disposable tenant domain fixtures");

  test("tenant host stays bound to its own tenant", async ({ page }) => {
    await page.goto(`https://${tenantSlug}.${baseDomain}/member/login`);
    await expect(page).toHaveURL(new RegExp(`https://${tenantSlug!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.${baseDomain!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  });

  test("an authenticated member session cannot cross to another tenant host", async ({ page }) => {
    test.skip(!memberSession, 'requires PW_MEMBER_A_SESSION_JSON captured from disposable Tenant A');
    await page.addInitScript((raw) => localStorage.setItem('member_session', raw), memberSession!);
    await page.goto(`https://${otherTenantSlug}.${baseDomain}/member`);
    await expect(page).toHaveURL(/\/member\/login(?:\?|$)/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('member_session'))).toBeNull();
  });
});
