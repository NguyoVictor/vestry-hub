import { test, expect } from '@playwright/test';
import { PLATFORM_ROUTES, type PlatformActor } from './action-manifest';
import { actorStorageState } from './fixtures/auth';

const replacements: Record<string, string> = {
  ':tenantId': process.env.PW_TENANT_A_ID || '00000000-0000-0000-0000-000000000001',
  ':facilityId': process.env.PW_FACILITY_ID || '00000000-0000-0000-0000-000000000001',
  ':surveyId': process.env.PW_SURVEY_ID || '00000000-0000-0000-0000-000000000001',
  ':sermonId': process.env.PW_SERMON_ID || '00000000-0000-0000-0000-000000000001',
  ':memberId': process.env.PW_MEMBER_A_ID || '00000000-0000-0000-0000-000000000001',
  ':groupId': process.env.PW_GROUP_ID || '00000000-0000-0000-0000-000000000001',
  ':fellowshipId': process.env.PW_FELLOWSHIP_ID || '00000000-0000-0000-0000-000000000001',
  ':branchId': process.env.PW_BRANCH_ID || '00000000-0000-0000-0000-000000000001',
  ':activityId': process.env.PW_ACTIVITY_ID || '00000000-0000-0000-0000-000000000001',
  ':albumId': process.env.PW_ALBUM_ID || '00000000-0000-0000-0000-000000000001',
  ':eventId': process.env.PW_EVENT_ID || '00000000-0000-0000-0000-000000000001',
  ':courseId': process.env.PW_COURSE_ID || '00000000-0000-0000-0000-000000000001',
  ':lessonId': process.env.PW_LESSON_ID || '00000000-0000-0000-0000-000000000001',
  ':sessionId': process.env.PW_SESSION_ID || 'e2e-session',
  ':participantId': process.env.PW_PARTICIPANT_ID || 'e2e-participant',
  ':joinCode': process.env.PW_JOIN_CODE || 'e2e-join-code',
  ':orgId': process.env.PW_TENANT_A_ID || '00000000-0000-0000-0000-000000000001',
  ':churchId': process.env.PW_TENANT_A_ID || '00000000-0000-0000-0000-000000000001',
  ':slug': process.env.PW_TENANT_A_SLUG || 'tenant-a-e2e',
  ':id': process.env.PW_GENERIC_ID || '00000000-0000-0000-0000-000000000001',
};

function materialize(path: string) {
  let output = path;
  for (const [key, value] of Object.entries(replacements)) output = output.replaceAll(key, value);
  return output === '*' ? '/__e2e-not-found__' : output;
}

async function assertRouteLoads(page: import('@playwright/test').Page, route: string) {
  const consoleErrors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  const response = await page.goto(materialize(route));
  expect(response?.status() ?? 200).toBeLessThan(500);
  await expect(page.locator('body')).toBeVisible();
  expect(consoleErrors.filter((x) => /uncaught|fatal/i.test(x))).toEqual([]);
}

for (const route of PLATFORM_ROUTES.filter((r) => r.actor === 'public')) {
  test(`public route ${route.path} does not hard-crash`, async ({ page }) => {
    await assertRouteLoads(page, route.path);
  });
}

function protectedRouteSuite(actor: Extract<PlatformActor, 'admin' | 'member'>, storageActor: 'full-admin' | 'member-a') {
  const storageState = actorStorageState(storageActor);
  test.describe(`${actor} route smoke`, () => {
    test.skip(!storageState, `requires ${storageActor} storage state`);
    if (storageState) test.use({ storageState });
    for (const route of PLATFORM_ROUTES.filter((r) => r.actor === actor && !r.path.includes(':'))) {
      test(`${actor} route ${route.path} does not hard-crash`, async ({ page }) => {
        await assertRouteLoads(page, route.path);
      });
    }
  });
}

protectedRouteSuite('admin', 'full-admin');
protectedRouteSuite('member', 'member-a');
