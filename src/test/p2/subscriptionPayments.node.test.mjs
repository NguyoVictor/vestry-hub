import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const initPath = "supabase/functions/initiate-subscription-stk/index.ts";
const webhookPath = "supabase/functions/subscription-payment-webhook/index.ts";
const init = fs.existsSync(initPath) ? fs.readFileSync(initPath, "utf8") : "";
const webhook = fs.existsSync(webhookPath) ? fs.readFileSync(webhookPath, "utf8") : "";
const migrationFile = fs.readdirSync("supabase/migrations").find((f) => f.includes("p2_subscription_mpesa_foundation"));
const sql = migrationFile ? fs.readFileSync(path.join("supabase/migrations", migrationFile), "utf8") : "";

test("STK initiation derives amount from catalog, not client input", () => {
  assert.match(init, /subscription_catalog/);
  assert.match(init, /product_code/);
  assert.doesNotMatch(init, /const\s*\{[^}]*amount/);
  assert.match(init, /PLATFORM_DARAJA_CONSUMER_KEY/);
  assert.match(init, /PLATFORM_DARAJA_PASSKEY/);
  assert.match(init, /subscription_payment_attempts/);
});

test("downgrades are scheduled without lower-plan STK charge", () => {
  assert.match(init, /pending_plan/);
  assert.match(init, /downgrade_effective_at/);
  assert.match(init, /scheduled_downgrade/);
});

test("webhook applies exactly once through transactional server-authoritative RPC", () => {
  assert.match(webhook, /apply_subscription_payment_callback/);
  assert.match(sql, /create or replace function public\.apply_subscription_payment_callback/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /if v_attempt\.status = 'success'/i);
  assert.match(sql, /expected_amount/i);
  assert.match(sql, /billing_history/i);
});

test("subscription webhook requires a server-only callback secret", () => {
  assert.match(init, /PLATFORM_DARAJA_WEBHOOK_SECRET/);
  assert.match(init, /callback.*token/i);
  assert.match(webhook, /PLATFORM_DARAJA_WEBHOOK_SECRET/);
  assert.match(webhook, /searchParams\.get\(["']token["']\)/);
  assert.match(webhook, /unauthorized/i);
});
