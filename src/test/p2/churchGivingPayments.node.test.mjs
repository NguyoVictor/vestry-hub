import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const stk = readFileSync(new URL('../../../supabase/functions/process-stk-push/index.ts', import.meta.url), 'utf8');
const webhook = readFileSync(new URL('../../../supabase/functions/payment-webhook/index.ts', import.meta.url), 'utf8');
const c2b = readFileSync(new URL('../../../supabase/functions/c2b-webhook/index.ts', import.meta.url), 'utf8');

test('STK initiation reads protected tenant payment credentials', () => {
  assert.match(stk, /tenant_payment_credentials/);
  assert.match(stk, /daraja_shortcode/);
  assert.doesNotMatch(stk, /\.from\(["']tenants["']\)\s*\.select\([^)]*daraja_consumer_(?:key|secret)/);
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

test('church M-Pesa callbacks require a server-only webhook secret', () => {
  assert.match(stk, /CHURCH_DARAJA_WEBHOOK_SECRET/);
  assert.match(stk, /searchParams\.set\(["']token["']/);
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
