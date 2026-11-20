// Phase 6 SSRF guard. node --experimental-strip-types --test scripts/recovery/og-url-guard.node.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkUrl, isBlockedAddress } from '../../supabase/functions/fetch-og-metadata/url-guard.ts';
test('allows ordinary public pages', () => {
  for (const u of ['https://example.com/a?b=1', 'http://news.example.org', 'https://example.com:443/x']) assert.equal(checkUrl(u).ok, true, u);
});
test('blocks internal / dangerous targets', () => {
  for (const u of ['http://localhost/', 'http://127.0.0.1/', 'http://10.1.2.3/', 'http://172.20.0.1/', 'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data/', 'http://[::1]/', 'http://[fd00::1]/', 'http://[fe80::1]/', 'http://[::ffff:127.0.0.1]/',
    'http://100.64.0.1/', 'http://0.0.0.0/', 'http://2130706433/', 'http://0x7f000001/', 'http://metadata.google.internal/',
    'http://svc.internal/', 'http://printer.local/', 'file:///etc/passwd', 'ftp://example.com/', 'gopher://x/',
    'https://user:pw@example.com/', 'http://example.com:8080/', 'javascript:alert(1)', 42, 'not a url']) {
    assert.equal(checkUrl(u).ok, false, String(u));
  }
});
test('resolved-address check', () => {
  assert.equal(isBlockedAddress('93.184.216.34'), false);
  for (const a of ['10.0.0.1', '127.0.0.53', '169.254.1.1', '::1', 'fc00::5', 'fe80::2']) assert.equal(isBlockedAddress(a), true, a);
});
