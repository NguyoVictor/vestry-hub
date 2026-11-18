/**
 * Vercel Preview authentication transport for read-only staging smoke.
 *
 * The OIDC credential must NEVER be attached to BrowserContext.extraHTTPHeaders:
 * that would send it to Supabase and third-party origins. Only fetch the
 * exact, previously-allowlisted Preview origin with the development token.
 * maxRedirects: 0 prevents APIRequestContext from forwarding the token on a
 * Location redirect, including a Vercel SSO redirect.
 */
import { classifyReadOnlyRequest } from './staging-readonly-guard.mjs';

export const VERCEL_TRUSTED_HEADER = 'x-vercel-trusted-oidc-idp-token';

/**
 * Only recognize Sentry's ingestion envelope/store endpoint as expected
 * telemetry noise. The POST is still BLOCKED; it is never allowed to reach
 * the network. Any other POST remains a test failure, including POSTs to
 * the application, Supabase, PostHog, or unknown third-party endpoints.
 */
export function isExpectedBlockedSentryTelemetry(rawUrl, method) {
  if (String(method).toUpperCase() !== 'POST') return false;
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' &&
      /^o[0-9]+\.ingest(?:\.[a-z0-9-]+)?\.sentry\.io$/i.test(url.hostname) &&
      /^\/api\/[0-9]+\/(?:envelope|store)\/?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

/**
 * Known GA browser collection endpoints. These requests are still aborted;
 * the exception only stops expected background telemetry from being counted
 * as a functional application write. Do not match whole hostnames or arbitrary
 * paths (e.g. /api/delete, /pagead/*, other Supabase backends).
 *
 * Use exact HTTPS origins, POST only, and fixed collector paths. Any new or
 * unexpected endpoint remains a violation until explicitly reviewed.
 */
export function isExpectedBlockedGoogleTelemetry(rawUrl, method) {
  if (String(method).toUpperCase() !== 'POST') return false;
  try {
    const url = new URL(rawUrl);
    if (url.username || url.password || url.port || url.protocol !== 'https:') return false;
    const paths = {
      'https://www.google-analytics.com': ['/g/collect', '/collect', '/j/collect'],
      'https://www.google.com': ['/g/collect', '/ccm/collect'],
    };
    return (paths[url.origin] || []).includes(url.pathname);
  } catch {
    return false;
  }
}

function previewOrigin(rawUrl, cfg) {
  const url = new URL(rawUrl);
  return url.origin === cfg.baseURL;
}

/**
 * Requires @playwright/test's Route interface, but deliberately uses plain JS
 * so its origin and redirect protections can be tested with Node's test runner.
 */
export async function forwardStagingReadOnlyRequest(route, cfg, violations, token = '') {
  const request = route.request();
  const raw = request.url();
  const decision = classifyReadOnlyRequest(raw, request.method(), cfg);
  if (!decision.allow) {
    if (!isExpectedBlockedSentryTelemetry(raw, request.method()) &&
        !isExpectedBlockedGoogleTelemetry(raw, request.method())) {
      const url = new URL(raw);
      // If a Google endpoint is newly encountered, include pathname only,
      // never query string, headers, credentials, or request body. This lets
      // the next review distinguish genuine telemetry from unrelated writes.
      const safePath = (url.hostname === 'www.google-analytics.com' ||
        url.hostname === 'www.google.com') && /^[a-z0-9/_.-]{1,90}$/i.test(url.pathname)
        ? ` ${url.pathname}` : '';
      violations.push(`${request.method()} ${url.hostname}${safePath}: ${decision.reason}`);
    }
    // All POSTs stay blocked, including known Sentry/Google telemetry.
    // Only exact, reviewed collection endpoints are excluded from violations.
    await route.abort('blockedbyclient');
    return;
  }

  if (!token || !previewOrigin(raw, cfg)) {
    await route.continue();
    return;
  }

  // The header is not set on the Playwright context and never sent to any
  // other origin. maxRedirects:0 additionally prevents request API redirects.
  const response = await route.fetch({
    headers: { [VERCEL_TRUSTED_HEADER]: token },
    maxRedirects: 0,
    timeout: 20_000,
  });
  const status = response.status();
  const location = response.headers()['location'] || '';
  if (status >= 300 && status < 400 && location) {
    const next = new URL(location, raw);
    if (next.hostname === 'vercel.com' || next.hostname.endsWith('.vercel.com')) {
      violations.push('Vercel Preview OIDC token was not accepted; check Vercel CLI login and linked Preview project');
      await route.fulfill({
        status: 401,
        contentType: 'text/plain',
        body: 'Preview access denied by Vercel Deployment Protection. Check the local Vercel CLI login and same-project preview access.',
      });
      return;
    }
  }
  await route.fulfill({ response });
}

export function requirePreviewOidcIfConfigured(env = process.env) {
  if (env.PW_VERCEL_PREVIEW_AUTH === 'oidc' && !env.VERCEL_OIDC_TOKEN?.trim()) {
    throw new Error('Vercel Preview OIDC required: run vc env run -- bash scripts/qa/staging-readonly-run.sh after vc login/link.');
  }
  return (env.VERCEL_OIDC_TOKEN || '').trim();
}
