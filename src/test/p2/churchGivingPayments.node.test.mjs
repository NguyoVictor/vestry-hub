import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

const stk = readFileSync(new URL('../../../supabase/functions/process-stk-push/index.ts', import.meta.url), 'utf8');
const intasendWebhook = readFileSync(new URL('../../../supabase/functions/intasend-webhook/index.ts', import.meta.url), 'utf8');
const functionConfig = readFileSync(new URL('../../../supabase/config.toml', import.meta.url), 'utf8');

// Phase 9 (21 Nov 2026): STK push moved from direct Daraja to IntaSend (user
// decision). Provider secrets are function secrets only — never tenant rows.
const connect = readFileSync(new URL('../../../supabase/functions/intasend-connect/index.ts', import.meta.url), 'utf8');

// One account per church (20261123160000): each church's own secret from Vault.
test('STK initiation (IntaSend) uses the church\'s own key from the server and verifies the caller', () => {
  assert.match(stk, /rpc\(["']intasend_secret_for_tenant["']/);
  const stkNoComments = stk.replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(stkNoComments, /INTASEND_SECRET_KEY/, 'no platform-wide key');
  assert.doesNotMatch(stkNoComments, /wallet_id/, 'pays into the church account itself');
  const stkCode = stk.replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(stkCode, /tenant_payment_credentials|payhero/i, 'credentials only via service-role RPCs');
  assert.doesNotMatch(stk, /\.from\(["']tenants["']\)\s*\.select\([^)]*(?:secret|passkey|consumer_key|api_key)/i);
  assert.match(stk, /auth\.getUser\(/, 'caller must be authenticated');
  assert.match(stk, /member_auth_memberships/, 'members may only give as themselves');
  assert.match(stk, /mpesa_enabled/, 'church must have M-Pesa giving enabled (either provider)');
  // A pending gift is written BEFORE the push; only the webhook confirms.
  assert.match(stk, /payment_status: "pending"[\s\S]*mpesa-stk-push/);
  assert.doesNotMatch(stk, /payment_status: ["']confirmed["']/);
});








test('IntaSend webhook authenticates, re-verifies with the status API and never trusts the body alone', () => {
  assert.match(intasendWebhook, /searchParams\.get\(["']church["']\)/, 'church identified by its webhook URL');
  assert.match(intasendWebhook, /rpc\(["']intasend_challenge_ok["']/, 'challenge checked against that church');
  assert.match(intasendWebhook, /\.eq\(["']tenant_id["'], church\)/, 'gift must belong to that church');
  assert.match(intasendWebhook, /rpc\(["']intasend_secret_for_tenant["']/, 're-verified with the church\'s own key');
  assert.doesNotMatch(intasendWebhook, /INTASEND_SECRET_KEY|INTASEND_WEBHOOK_CHALLENGE/);
  assert.match(intasendWebhook, /\/payment\/status\//, 'confirmation via status API');
  assert.match(intasendWebhook, /verifyStatusReply\(/, 'state + api_ref + amount + currency checked (shared, unit-tested)');
  assert.match(intasendWebhook, /nextStatus\(/, 'no downgrade of confirmed gifts');
  assert.match(intasendWebhook, /\.eq\(["']payment_status["'], gift\.payment_status\)/, 'optimistic update');
  assert.match(functionConfig, /\[functions\.intasend-webhook\]\s*\nverify_jwt = false/);
  assert.match(functionConfig, /\[functions\.process-stk-push\]\s*\nverify_jwt = true/);
  assert.match(functionConfig, /\[functions\.intasend-connect\]\s*\nverify_jwt = true/);
});

test('intasend-connect recheck: one gift of this church, same verification as the webhook', () => {
  assert.match(connect, /action === "recheck"/);
  assert.match(connect, /\.eq\("tenant_id", tenantId\)/);
  assert.match(connect, /verifyStatusReply\(/);
  assert.match(connect, /\.eq\("payment_status", gift\.payment_status\)/, 'optimistic update');
});

test('intasend-connect: church admins only, keys verified with IntaSend, never returned or logged', () => {
  assert.match(connect, /\["super_admin", "church_admin"\]/);
  assert.match(connect, /actor\.tenant_id === tenantId/);
  assert.match(connect, /intasendGet\(["']\/wallets\//, 'key proven before storing');
  assert.match(connect, /rpc\(["']intasend_store_credentials["']/);
  assert.doesNotMatch(connect, /console\.[a-z]+\([^)]*(secret|publishable)/i, 'keys never logged');
  assert.doesNotMatch(connect, /reply\(\{[^}]*secret_key/, 'secret never returned');
});

// 24 Nov: the PayHero / Daraja functions (payment-webhook, c2b-webhook,
// register-credentials, register-c2b-urls, test-payhero-*, banks, channel
// registration, initiate-payment) were removed — IntaSend replaced them and
// none was deployed. Guard against them coming back unreviewed.
test('legacy PayHero / Daraja functions stay removed', () => {
  for (const f of ['payment-webhook', 'c2b-webhook', 'register-credentials', 'register-c2b-urls', 'test-payhero-api',
                   'test-payhero-stk', 'get-payhero-banks', 'get-supported-banks', 'register-payment-channel', 'initiate-payment']) {
    assert.equal(existsSync(new URL(`../../../supabase/functions/${f}/index.ts`, import.meta.url)), false, f);
  }
});

// Provider choice (24 Nov): Safaricom Daraja direct to the church's own paybill / till.
const darajaConnect = readFileSync(new URL('../../../supabase/functions/daraja-connect/index.ts', import.meta.url), 'utf8');
const darajaCallback = readFileSync(new URL('../../../supabase/functions/daraja-callback/index.ts', import.meta.url), 'utf8');

test('daraja-connect: church admins only, credentials proven with a Daraja token before storing, never logged or returned', () => {
  assert.match(darajaConnect, /\["super_admin", "church_admin"\]/);
  assert.match(darajaConnect, /actor\.tenant_id === tenantId/);
  assert.match(darajaConnect, /darajaToken\(/, 'credentials proven first');
  assert.match(darajaConnect, /rpc\("daraja_store_credentials"/);
  assert.doesNotMatch(darajaConnect, /console\.[a-z]+\([^)]*(consumer|passkey|secret)/i);
  assert.doesNotMatch(darajaConnect, /reply\(\{[^}]*:\s*(consumerSecret|consumerKey|passkey)\b/, 'credential values never returned');
});

test('daraja-callback: per-church token, only that church\'s gifts, Safaricom re-check + amount before confirming', () => {
  assert.match(darajaCallback, /rpc\("daraja_callback_ok"/);
  assert.match(darajaCallback, /\.eq\("tenant_id", church\)/);
  assert.match(darajaCallback, /stkQuery\(/, 're-verified with Safaricom');
  assert.match(darajaCallback, /amountMatches\(gift\.amount, cb\.amount/);
  assert.match(darajaCallback, /nextStatus\(/);
  assert.match(darajaCallback, /\.eq\("payment_status", gift\.payment_status\)/, 'optimistic update');
  assert.match(functionConfig, /\[functions\.daraja-callback\]\s*\nverify_jwt = false/);
  assert.match(functionConfig, /\[functions\.daraja-connect\]\s*\nverify_jwt = true/);
});

test('process-stk-push picks the church\'s active provider; Daraja credentials only from the server', () => {
  assert.match(stk, /mpesa_provider/);
  assert.match(stk, /rpc\("daraja_config_for_tenant"/);
  assert.match(stk, /daraja-callback\?c=/);
  assert.doesNotMatch(stk.replace(/^\s*\/\/.*$/gm, ''), /DARAJA_|consumer_secret"\s*:/);
});
