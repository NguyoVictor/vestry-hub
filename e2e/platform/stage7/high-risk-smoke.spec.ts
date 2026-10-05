import { test, expect } from '@playwright/test';
import { protectedState, expectNoHardCrash } from './protected-fixtures';

const adminSurfaces = [
  ['/members', /Add Member|Import Members|Export/i],
  ['/events', /Create Event|Add Event|New Event/i],
  ['/services', /Create Service|Add Service|New Service/i],
  ['/announcements', /Post Announcement|Create Announcement/i],
  ['/surveys', /Create Survey|New Survey/i],
  ['/giving-records', /Giving|Donation|Export/i],
  ['/church-expenses', /Expense/i],
  ['/budget-management', /Budget/i],
  ['/accounts-payable', /Payable|Bill|Invoice/i],
  ['/pledge-campaigns', /Pledge|Campaign/i],
  ['/communications', /Email|SMS|Communication|Compose/i],
  ['/member-messaging', /Message|Conversation/i],
  ['/settings/users', /Invite|User/i],
  ['/settings/access-control', /Permission|Role|Access/i],
] as const;

test.describe('Stage 7 high-risk Admin surface smoke', () => {
  test.skip(process.env.PW_PLATFORM_TEST_ENV !== 'disposable' || !protectedState.fullAdmin, 'requires disposable full Admin storage state');
  if (protectedState.fullAdmin) test.use({ storageState: protectedState.fullAdmin });

  for (const [route, marker] of adminSurfaces) {
    test(`${route} exposes its expected high-risk workflow surface`, async ({ page }) => {
      await page.goto(route);
      await expectNoHardCrash(page);
      await expect(page.getByText(marker).first()).toBeVisible();
    });
  }
});
