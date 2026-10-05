import { test, expect } from '@playwright/test';
import { protectedState, expectMutationControlUnavailable, expectNoHardCrash } from './protected-fixtures';

const mutationSurfaces = [
  { route: '/members', names: [/Add Member/i, /Import Members/i] },
  { route: '/events', names: [/Create Event/i, /Add Event/i, /New Event/i] },
  { route: '/services', names: [/Create Service/i, /Add Service/i, /New Service/i] },
  { route: '/announcements', names: [/Post Announcement/i, /Create Announcement/i] },
  { route: '/surveys', names: [/Create Survey/i, /New Survey/i] },
  { route: '/giving-records', names: [/Add Giving/i, /Record Giving/i, /Add Donation/i] },
  { route: '/church-expenses', names: [/Add Expense/i, /Record Expense/i, /New Expense/i] },
  { route: '/communications/compose', names: [/Send/i, /Send Email/i] },
];

test.describe('Stage 7 read-only Admin mutation enforcement', () => {
  test.skip(!protectedState.readOnlyAdmin || process.env.PW_PLATFORM_TEST_ENV !== 'disposable', 'requires disposable read-only Admin storage state');
  if (protectedState.readOnlyAdmin) test.use({ storageState: protectedState.readOnlyAdmin });

  for (const surface of mutationSurfaces) {
    test(`read-only Admin cannot activate mutations on ${surface.route}`, async ({ page }) => {
      await page.goto(surface.route);
      await expectNoHardCrash(page);
      await expectMutationControlUnavailable(page, surface.names);
    });
  }
});

test.describe('Stage 7 no-permission Admin route enforcement', () => {
  test.skip(!protectedState.noPermissionAdmin || process.env.PW_PLATFORM_TEST_ENV !== 'disposable', 'requires disposable no-permission Admin storage state');
  if (protectedState.noPermissionAdmin) test.use({ storageState: protectedState.noPermissionAdmin });

  for (const route of ['/members', '/giving-records', '/church-expenses', '/communications', '/settings/access-control']) {
    test(`no-permission Admin cannot obtain usable mutation surface at ${route}`, async ({ page }) => {
      await page.goto(route);
      await expectNoHardCrash(page);
      const enabledMutations = page.locator('button:not([disabled])').filter({ hasText: /add|create|delete|send|approve|invite|save permissions/i });
      expect(await enabledMutations.count()).toBe(0);
    });
  }
});
