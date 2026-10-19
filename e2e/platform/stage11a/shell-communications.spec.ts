import { test, expect } from "@playwright/test";
import { actorStorageState } from "../fixtures/auth";
import { platformServiceClient } from "../fixtures/supabase";
import { getPlatformTenants } from "../fixtures/tenants";

const adminStorage = actorStorageState("full-admin");
const hasProtectedFixtures = Boolean(process.env.PW_PLATFORM_TEST_ENV && process.env.PW_SUPABASE_SERVICE_ROLE_KEY);

test.describe("Stage 11A shell and communications", () => {
  test.skip(!hasProtectedFixtures, "requires disposable platform fixtures and service-role fixture setup");
  test.skip(!adminStorage, "requires full-admin storage state");
  if (adminStorage) test.use({ storageState: adminStorage });

  test("global search returns a tenant-scoped member and navigates to the member profile", async ({ page }) => {
    const { tenantA } = getPlatformTenants();
    const client = platformServiceClient();
    const marker = `Stage11A-${Date.now()}`;
    const { data: member, error } = await client
      .from("members")
      .insert({ tenant_id: tenantA.id, first_name: marker, last_name: "Search", status: "Active" })
      .select("id")
      .single();
    if (error) throw error;

    try {
      await page.goto("/dashboard");
      await page.getByRole("button").filter({ has: page.locator("svg.lucide-search") }).first().click();
      const input = page.getByPlaceholder("Search members, events, transactions...");
      await expect(input).toBeVisible();
      await input.fill(marker);
      await expect(page.getByText(`${marker} Search`, { exact: true })).toBeVisible();
      await page.getByText(`${marker} Search`, { exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/members/${member.id}(?:[?#]|$)`));
    } finally {
      await client.from("members").delete().eq("id", member.id).eq("tenant_id", tenantA.id);
    }
  });

  test("notification bell and breadcrumb are functional shell controls", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("header").getByRole("button").filter({ has: page.locator("svg.lucide-bell") })).toHaveCount(1);
    await page.goto("/members");
    await expect(page.locator("header")).toContainText("Members");
  });
});
