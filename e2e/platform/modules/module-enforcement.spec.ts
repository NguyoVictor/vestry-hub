import { test, expect } from "@playwright/test";
import { actorStorageState } from "../fixtures/auth";
import { platformServiceClient } from "../fixtures/supabase";
import { getPlatformTenants } from "../fixtures/tenants";
import { DEFAULT_MODULE_CONFIG, normalizeModuleConfig } from "../../../src/config/modules";

const adminStorage = actorStorageState("full-admin");
const memberStorage = actorStorageState("member-a");
const hasProtectedFixtures = Boolean(process.env.PW_PLATFORM_TEST_ENV && process.env.PW_SUPABASE_SERVICE_ROLE_KEY);

async function tenantModules() {
  const { tenantA } = getPlatformTenants();
  const client = platformServiceClient();
  const { data, error } = await client.from("tenants").select("enabled_modules").eq("id", tenantA.id).single();
  if (error) throw error;
  return { client, tenantA, raw: data?.enabled_modules ?? null };
}

async function setModules(raw: unknown) {
  const { client, tenantA } = await tenantModules();
  const { error } = await client.from("tenants").update({ enabled_modules: raw }).eq("id", tenantA.id);
  if (error) throw error;
}

test.describe("canonical module enforcement", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!hasProtectedFixtures, "requires disposable platform fixtures and service-role fixture setup");

  let originalModules: unknown;

  test.beforeAll(async () => {
    const current = await tenantModules();
    originalModules = current.raw;
  });

  test.afterAll(async () => {
    if (hasProtectedFixtures) await setModules(originalModules);
  });

  test.describe("Admin portal", () => {
    test.skip(!adminStorage, "requires full-admin storage state");
    if (adminStorage) test.use({ storageState: adminStorage });

    test("disabled admin module is absent from nav and blocked by direct URL", async ({ page }) => {
      const config = normalizeModuleConfig(originalModules);
      config.admin.communications = false;
      await setModules(config);

      await page.goto("/dashboard");
      await expect(page.locator('a[href="/announcements"]')).toHaveCount(0);
      await expect(page.locator('a[href="/communications"]')).toHaveCount(0);

      await page.goto("/announcements");
      await expect(page).toHaveURL(/\/dashboard(?:[?#]|$)/);
    });
  });

  test.describe("Member portal", () => {
    test.skip(!memberStorage, "requires member-a storage state");
    if (memberStorage) test.use({ storageState: memberStorage });

    test("stale member module snapshot is refreshed and parent-disabled route is blocked", async ({ page }) => {
      const config = normalizeModuleConfig(originalModules);
      config.admin.communications = false;
      config.member_portal.messages = true;
      await setModules(config);

      await page.addInitScript((defaults) => {
        const raw = localStorage.getItem("member_session");
        if (!raw) return;
        const session = JSON.parse(raw);
        session.enabledModules = defaults;
        localStorage.setItem("member_session", JSON.stringify(session));
      }, DEFAULT_MODULE_CONFIG);

      await page.goto("/member/messages");
      await expect(page).toHaveURL(/\/member(?:[?#]|$)/);
      await expect(page.locator('a[href="/member/messages"]')).toHaveCount(0);

      const refreshed = await page.evaluate(() => JSON.parse(localStorage.getItem("member_session") || "{}"));
      expect(refreshed.enabledModules?.admin?.communications).toBe(false);
    });

    test("member feature toggle blocks route even when parent admin module stays enabled", async ({ page }) => {
      const config = normalizeModuleConfig(originalModules);
      config.admin.communications = true;
      config.member_portal.messages = false;
      await setModules(config);

      await page.goto("/member/messages");
      await expect(page).toHaveURL(/\/member(?:[?#]|$)/);
      await expect(page.locator('a[href="/member/messages"]')).toHaveCount(0);
    });
  });
});
