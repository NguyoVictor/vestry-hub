/**
 * Genuine, read-only browser checks against the explicitly approved recovery
 * Preview and Vestry staging backend. Never submit credentials or write data.
 *
 * Failure diagnostics show ONLY HTTP methods + origins + paths, never query
 * strings, headers, API keys, session tokens, emails or response bodies.
 */
import { expect, test } from '@playwright/test';
import { requireStagingReadOnlyEnv } from '../../scripts/qa/staging-readonly-guard.mjs';
import { forwardStagingReadOnlyRequest, requirePreviewOidcIfConfigured } from '../../scripts/qa/staging-preview-auth.mjs';

const cfg = requireStagingReadOnlyEnv();
const previewOidc = requirePreviewOidcIfConfigured();

// Wait for in-flight origin-scoped OIDC GET handlers before Playwright closes
// the page/context. This prevents route.fetch() racing the fixture teardown.
test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'wait' });
});

function assertVestryNotVercelLogin(url: string) {
  const currentHost = new URL(url).hostname;
  expect(
    currentHost,
    'Vercel SSO intercepted the Preview. Use PW_VERCEL_PREVIEW_AUTH=oidc via vc env run.',
  ).not.toBe('vercel.com');
}

test('member login displays and performs URL-prefill and typed church lookups against staging', async ({ page }) => {
  const violations: string[] = [];
  const pageErrors: string[] = [];
  const seenSupabase: string[] = [];
  let lookupRequests = 0;

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.hostname.endsWith('.supabase.co')) {
      // Deliberately omit query strings, headers, tokens, response bodies and email.
      if (seenSupabase.length < 30) seenSupabase.push(`${request.method()} ${url.origin}${url.pathname}`);
    }
  });

  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === cfg.backend && url.pathname.startsWith('/rest/v1/tenants') && request.method() === 'GET') {
      lookupRequests += 1;
    }
    await forwardStagingReadOnlyRequest(route, cfg, violations, previewOidc);
  });

  const waitForLookup = async (previous: number, reason: string) => {
    try {
      await expect.poll(() => lookupRequests, { timeout: 9_000 }).toBeGreaterThan(previous);
    } catch {
      throw new Error([
        `No approved staging tenant GET observed after ${reason}.`,
        `Observed Supabase requests (no query/credentials): ${seenSupabase.join(' | ') || '(none)'}`,
        `Other prohibited requests: ${violations.join(' | ') || '(none)'}`,
        `Browser exceptions: ${pageErrors.join(' | ') || '(none)'}`,
        'Check the Preview VITE_SUPABASE_URL and the browser Network tab; do not weaken the read-only safety guard.',
      ].join('\n'));
    }
  };

  // The actual MemberLoginPage explicitly looks up church branding when the
  // ?code= URL parameter is present. Use a synthetic nonexistent code: the
  // GET must happen even if the database returns no matching church.
  const response = await page.goto(`${cfg.baseURL}/member/login?code=QATEST999`, { waitUntil: 'domcontentloaded' });
  assertVestryNotVercelLogin(page.url());
  expect(response, 'Member login route must return a document').not.toBeNull();
  expect(response!.status()).toBeLessThan(400);

  const email = page.getByPlaceholder('you@example.com');
  const code = page.getByPlaceholder('e.g. HOPE-2847');
  await expect(email).toBeVisible();
  await expect(code).toBeVisible();
  await expect(code).toHaveValue('QATEST999');
  await waitForLookup(0, 'URL ?code=QATEST999 prefill');

  // Also verify the real onChange path. Never click Sign In: it invokes a
  // write-capable Edge Function and is outside this read-only smoke suite.
  await email.fill('staging-readonly@example.test');
  const beforeInput = lookupRequests;
  await code.fill('QATEST998');
  await expect(code).toHaveValue('QATEST998');
  await waitForLookup(beforeInput, 'typing another 9-character church code');

  expect(violations, 'Unexpected or unsafe browser writes/hosts (all should be blocked)').toEqual([]);
  expect(pageErrors, 'Uncaught application browser exceptions').toEqual([]);
});

test('unauthenticated member portal redirects to member login without unsafe writes', async ({ page }) => {
  const violations: string[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/*', async route => {
    await forwardStagingReadOnlyRequest(route, cfg, violations, previewOidc);
  });

  await page.goto(`${cfg.baseURL}/member`, { waitUntil: 'domcontentloaded' });
  assertVestryNotVercelLogin(page.url());
  await expect(page).toHaveURL(/\/member\/login(?:[?#]|$)/);
  expect(violations, 'Unexpected or unsafe browser writes/hosts (all should be blocked)').toEqual([]);
  expect(pageErrors, 'Uncaught application browser exceptions').toEqual([]);
});
