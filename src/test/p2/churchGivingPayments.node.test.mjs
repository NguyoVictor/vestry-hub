import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const stk = readFileSync(new URL('../../../supabase/functions/process-stk-push/index.ts', import.meta.url), 'utf8');
const webhook = readFileSync(new URL('../../../supabase/functions/payment-webhook/index.ts', import.meta.url), 'utf8');
const c2b = readFileSync(new URL('../../../supabase/functions/c2b-webhook/index.ts', import.meta.url), 'utf8');
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
  assert.doesNotMatch(stkCode, /tenant_payment_credentials|daraja|payhero/i);
  assert.doesNotMatch(stk, /\.from\(["']tenants["']\)\s*\.select\([^)]*(?:secret|passkey|consumer_key|api_key)/i);
  assert.match(stk, /auth\.getUser\(/, 'caller must be authenticated');
  assert.match(stk, /member_auth_memberships/, 'members may only give as themselves');
  assert.match(stk, /intasend_enabled/, 'church must be enabled by Vestry');
  // A pending gift is written BEFORE the push; only the webhook confirms.
  assert.match(stk, /payment_status: "pending"[\s\S]*mpesa-stk-push/);
  assert.doesNotMatch(stk, /payment_status: ["']confirmed["']/);
});

test('STK webhook delegates authoritative payment state to hardened RPC', () => {
  assert.match(webhook, /apply_mpesa_stk_callback/);
  assert.doesNotMatch(webhook, /\.from\(["']giving_records["']\)[\s\S]{0,500}\.update\(/);
});

test('C2B webhook resolves protected shortcode and delegates insert to hardened RPC', () => {
  assert.match(c2b, /tenant_payment_credentials/);
  assert.match(c2b, /record_mpesa_c2b_payment/);
  assert.doesNotMatch(c2b, /\.from\(["']giving_records["']\)[\s\S]{0,500}\.insert\(/);
});

test('active M-Pesa functions do not read legacy Daraja secret columns from tenants', () => {
  for (const [name, source] of [['process-stk-push', stk], ['payment-webhook', webhook], ['c2b-webhook', c2b]]) {
    assert.doesNotMatch(source, /tenants\.daraja_/i, `${name} reads legacy tenants.daraja_*`);
    assert.doesNotMatch(source, /\.from\(["']tenants["']\)\s*\.select\([^)]*daraja_(?:consumer_key|consumer_secret|passkey|transaction_type)/i, `${name} selects legacy Daraja credentials from tenants`);
  }
});

const registerCredentials = readFileSync(new URL('../../../supabase/functions/register-credentials/index.ts', import.meta.url), 'utf8');
const registerC2b = readFileSync(new URL('../../../supabase/functions/register-c2b-urls/index.ts', import.meta.url), 'utf8');

test('credential registration writes secrets only to protected credential storage', () => {
  assert.match(registerCredentials, /tenant_payment_credentials/);
  assert.match(registerCredentials, /authorizeTenantActor/);
  assert.doesNotMatch(registerCredentials, /\.from\(["']tenants["']\)\s*\.update\([\s\S]{0,500}daraja_consumer_/);
});

test('C2B URL registration reads protected credentials and authorizes tenant actor', () => {
  assert.match(registerC2b, /tenant_payment_credentials/);
  assert.match(registerC2b, /authorizeTenantActor/);
  assert.doesNotMatch(registerC2b, /\.from\(["']tenants["']\)\s*\.select\([^)]*daraja_consumer_/);
});

test('tenant-authorized payment setup functions use throwing authorizeTenantActor contract correctly', () => {
  for (const [name, source] of [['register-credentials', registerCredentials], ['register-c2b-urls', registerC2b]]) {
    assert.match(source, /await authorizeTenantActor\(/, `${name} must authorize`);
    assert.doesNotMatch(source, /actor\.(?:ok|error|status)/, `${name} assumes obsolete authorizeTenantActor return shape`);
  }
});

test('IntaSend webhook authenticates, re-verifies with the status API and never trusts the body alone', () => {
  assert.match(intasendWebhook, /searchParams\.get\(["']church["']\)/, 'church identified by its webhook URL');
  assert.match(intasendWebhook, /rpc\(["']intasend_challenge_ok["']/, 'challenge checked against that church');
  assert.match(intasendWebhook, /\.eq\(["']tenant_id["'], church\)/, 'gift must belong to that church');
  assert.match(intasendWebhook, /rpc\(["']intasend_secret_for_tenant["']/, 're-verified with the church\'s own key');
  assert.doesNotMatch(intasendWebhook, /INTASEND_SECRET_KEY|INTASEND_WEBHOOK_CHALLENGE/);
  assert.match(intasendWebhook, /\/payment\/status\//, 'confirmation via status API');
  assert.match(intasendWebhook, /amountMatches\(/);
  assert.match(intasendWebhook, /nextStatus\(/, 'no downgrade of confirmed gifts');
  assert.match(intasendWebhook, /\.eq\(["']payment_status["'], gift\.payment_status\)/, 'optimistic update');
  assert.match(functionConfig, /\[functions\.intasend-webhook\]\s*\nverify_jwt = false/);
  assert.match(functionConfig, /\[functions\.process-stk-push\]\s*\nverify_jwt = true/);
  assert.match(functionConfig, /\[functions\.intasend-connect\]\s*\nverify_jwt = true/);
});

test('intasend-connect: church admins only, keys verified with IntaSend, never returned or logged', () => {
  assert.match(connect, /\["super_admin", "church_admin"\]/);
  assert.match(connect, /actor\.tenant_id === tenantId/);
  assert.match(connect, /intasendGet\(["']\/wallets\//, 'key proven before storing');
  assert.match(connect, /rpc\(["']intasend_store_credentials["']/);
  assert.doesNotMatch(connect, /console\.[a-z]+\([^)]*(secret|publishable)/i, 'keys never logged');
  assert.doesNotMatch(connect, /reply\(\{[^}]*secret_key/, 'secret never returned');
});

test('church M-Pesa callbacks require a server-only webhook secret', () => {
  assert.match(webhook, /CHURCH_DARAJA_WEBHOOK_SECRET/);
  assert.match(webhook, /searchParams\.get\(["']token["']/);
  assert.match(registerC2b, /CHURCH_DARAJA_WEBHOOK_SECRET/);
  assert.match(c2b, /CHURCH_DARAJA_WEBHOOK_SECRET/);
  assert.match(c2b, /searchParams\.get\(["']token["']/);
});

test('C2B registration never returns secret-bearing callback URLs to the browser', () => {
  assert.doesNotMatch(registerC2b, /confirmation_url\s*:/i);
  assert.doesNotMatch(registerC2b, /validation_url\s*:/i);
});
