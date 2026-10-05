import { expect, test } from "@playwright/test";

const baseDomain = process.env.PW_TENANT_BASE_DOMAIN;
const tenantSlug = process.env.PW_TENANT_SLUG;
const otherTenantSlug = process.env.PW_OTHER_TENANT_SLUG;

test.describe("tenant domain isolation", () => {
  test.skip(!baseDomain || !tenantSlug || !otherTenantSlug, "Requires disposable tenant domain fixtures");

  test("tenant host stays bound to its own tenant", async ({ page }) => {
    await page.goto(`https://${tenantSlug}.${baseDomain}/member/login`);
    await expect(page).toHaveURL(new RegExp(`https://${tenantSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.${baseDomain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  });

  test("a session cannot silently cross to another tenant host", async ({ page }) => {
    test.fixme(true, "Fixture auth wiring lands in B6/B7; B1 establishes the product guard and this regression contract.");
    await page.goto(`https://${otherTenantSlug}.${baseDomain}/dashboard`);
  });
});
