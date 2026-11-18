import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forwardStagingReadOnlyRequest, isExpectedBlockedSentryTelemetry, requirePreviewOidcIfConfigured, VERCEL_TRUSTED_HEADER } from './staging-preview-auth.mjs';

const cfg = {
  baseURL: 'https://example-preview.vercel.app',
  appHost: 'example-preview.vercel.app',
  backend: 'https://xwbajophstetbnnemsyq.supabase.co',
};
function fakeRoute(url, method = 'GET', reply = null) {
  const events = [];
  return {
    events,
    request: () => ({ url: () => url, method: () => method }),
    abort: async (reason) => events.push({ name: 'abort', reason }),
    continue: async (args) => events.push({ name: 'continue', args }),
    fetch: async (args) => {
      events.push({ name: 'fetch', args });
      return reply || { status: () => 200, headers: () => ({}) };
    },
    fulfill: async (args) => events.push({ name: 'fulfill', args }),
  };
}

test('OIDC credential only travels to exact authorized Preview origin, without redirect following', async () => {
  const route = fakeRoute('https://example-preview.vercel.app/member/login');
  const violations = [];
  await forwardStagingReadOnlyRequest(route, cfg, violations, 'secret-token-not-for-logs');
  assert.deepEqual(violations, []);
  assert.deepEqual(route.events.map(e => e.name), ['fetch','fulfill']);
  assert.equal(route.events[0].args.headers[VERCEL_TRUSTED_HEADER], 'secret-token-not-for-logs');
  assert.equal(route.events[0].args.maxRedirects, 0);
});

test('Supabase requests never receive the Vercel OIDC header', async () => {
  const route = fakeRoute('https://xwbajophstetbnnemsyq.supabase.co/rest/v1/tenants?select=id');
  await forwardStagingReadOnlyRequest(route, cfg, [], 'short-lived-secret');
  assert.deepEqual(route.events.map(e => e.name), ['continue']);
  assert.equal(route.events[0].args, undefined);
});

test('third-party GETs never receive Vercel OIDC header', async () => {
  const route = fakeRoute('https://fonts.googleapis.com/css2?family=Inter');
  await forwardStagingReadOnlyRequest(route, cfg, [], 'short-lived-secret');
  assert.deepEqual(route.events.map(e => e.name), ['continue']);
});

test('all write verbs stay blocked even when Vercel OIDC is present', async () => {
  const violations = [];
  const route = fakeRoute('https://example-preview.vercel.app/api/update', 'POST');
  await forwardStagingReadOnlyRequest(route, cfg, violations, 'short-lived-secret');
  assert.deepEqual(route.events.map(e => e.name), ['abort']);
  assert.equal(violations.length, 1);
});

test('an OIDC-denied Vercel login redirect is not followed with the token', async () => {
  const route = fakeRoute('https://example-preview.vercel.app/member', 'GET', {
    status: () => 302,
    headers: () => ({ location: 'https://vercel.com/login?next=abc' }),
  });
  const violations = [];
  await forwardStagingReadOnlyRequest(route, cfg, violations, 'short-lived-secret');
  assert.deepEqual(route.events.map(e => e.name), ['fetch','fulfill']);
  assert.equal(route.events[0].args.maxRedirects, 0);
  assert.equal(route.events[1].args.status, 401);
  assert.match(violations[0], /was not accepted/);
});

test('missing OIDC token fails before navigation in explicit OIDC mode', () => {
  assert.throws(() => requirePreviewOidcIfConfigured({ PW_VERCEL_PREVIEW_AUTH: 'oidc' }), /vc env run/);
  assert.equal(requirePreviewOidcIfConfigured({ PW_VERCEL_PREVIEW_AUTH: 'oidc', VERCEL_OIDC_TOKEN: 'fresh' }), 'fresh');
});

test('backend drift and unexpected Supabase projects remain blocked', async () => {
  const route = fakeRoute('https://crjdsxxkspvdwknrmijs.supabase.co/rest/v1/tenants');
  const violations = [];
  await forwardStagingReadOnlyRequest(route, cfg, violations, 'short-lived-secret');
  assert.deepEqual(route.events.map(e => e.name), ['abort']);
  assert.match(violations[0], /unexpected Supabase backend/);
});


test('Sentry ingestion POST is still blocked but does not fail read-only smoke', async () => {
  const endpoint = 'https://o4511190534979584.ingest.de.sentry.io/api/4511190534979584/envelope/';
  assert.equal(isExpectedBlockedSentryTelemetry(endpoint, 'POST'), true);
  const route = fakeRoute(endpoint, 'POST');
  const violations = [];
  await forwardStagingReadOnlyRequest(route, cfg, violations, 'oidc-token');
  assert.deepEqual(route.events.map(e => e.name), ['abort']);
  assert.deepEqual(violations, []);
});

test('unexpected Sentry-looking write endpoints remain blocked AND reported', async () => {
  const suspicious = [
    'https://o4511190534979584.ingest.de.sentry.io/api/999/delete',
    'https://malicious.ingest.de.sentry.io/api/123/envelope/',
    'https://o4511190534979584.ingest.de.sentry.io/api/123/envelope/../admin',
  ];
  for (const url of suspicious) {
    assert.equal(isExpectedBlockedSentryTelemetry(url, 'POST'), false, url);
    const route = fakeRoute(url, 'POST');
    const violations = [];
    await forwardStagingReadOnlyRequest(route, cfg, violations, 'oidc-token');
    assert.deepEqual(route.events.map(e => e.name), ['abort']);
    assert.equal(violations.length, 1, url);
  }
});

test('Supabase and app POSTs always remain blocked AND reported', async () => {
  for (const url of [
    'https://xwbajophstetbnnemsyq.supabase.co/rest/v1/visitors',
    'https://example-preview.vercel.app/api/create',
  ]) {
    const route = fakeRoute(url, 'POST');
    const violations = [];
    await forwardStagingReadOnlyRequest(route, cfg, violations, 'oidc-token');
    assert.deepEqual(route.events.map(e => e.name), ['abort']);
    assert.equal(violations.length, 1, url);
  }
});
