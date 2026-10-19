import { test, expect } from "@playwright/test";
import { actorStorageState } from "../fixtures/auth";

const adminStorage = actorStorageState("full-admin");
const platformSuperAdminStorage = process.env.PW_PLATFORM_SUPERADMIN_STORAGE_STATE;

test.describe("Stage 11B security and platform administration", () => {
  test.describe("tenant admin boundary", () => {
    test.skip(!adminStorage, "requires PW_FULL_ADMIN_STORAGE_STATE");
    if (adminStorage) test.use({ storageState: adminStorage });

    test("normal tenant admin is denied the platform super-admin surface", async ({ page }) => {
      await page.goto("/superadmin");
      await expect(page.getByText("Access Denied", { exact: true })).toBeVisible();
      await expect(page.getByText("403", { exact: true })).toBeVisible();
    });

    test("tenant Security Centre exposes working access-log and export controls", async ({ page }) => {
      await page.goto("/security-centre");
      await expect(page.getByText("Security Centre", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: /Export Logs/i })).toBeVisible();
      await expect(page.getByText("Recent Access Log", { exact: true })).toBeVisible();
    });
  });

  test.describe("platform super-admin happy path", () => {
    test.skip(!platformSuperAdminStorage, "requires PW_PLATFORM_SUPERADMIN_STORAGE_STATE");
    if (platformSuperAdminStorage) test.use({ storageState: platformSuperAdminStorage });

    test("platform admin can load overview, churches, and subscriptions", async ({ page }) => {
      await page.goto("/superadmin");
      await expect(page.getByText("Platform Dashboard", { exact: true })).toBeVisible();
      await expect(page.getByText("Total Churches", { exact: true })).toBeVisible();

      await page.goto("/superadmin/churches");
      await expect(page.getByText("Churches", { exact: true })).toBeVisible();

      await page.goto("/superadmin/storage-requests");
      await expect(page.getByText("Subscriptions", { exact: true })).toBeVisible();
      await expect(page.getByText("Tenant Subscriptions", { exact: true })).toBeVisible();
    });
  });
});
