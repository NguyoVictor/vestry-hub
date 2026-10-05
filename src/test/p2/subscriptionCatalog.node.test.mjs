import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationFile = fs.readdirSync("supabase/migrations").find((f) => f.includes("p2_subscription_mpesa_foundation"));
const sql = migrationFile ? fs.readFileSync(path.join("supabase/migrations", migrationFile), "utf8") : "";
const plans = fs.readFileSync("src/config/plans.ts", "utf8");
const hook = fs.readFileSync("src/hooks/useSubscription.ts", "utf8");
const billing = fs.readFileSync("src/pages/settings/Billing.tsx", "utf8");

test("subscription catalog is server authoritative and contains plans/addons", () => {
  assert.match(sql, /create table if not exists public\.subscription_catalog/i);
  for (const code of ["plan_free", "plan_basic", "plan_growth", "plan_pro", "addon_members_100", "addon_sms_100", "addon_email_500", "addon_ai_20", "addon_storage_5gb"]) {
    assert.ok(sql.includes(code), code);
  }
  assert.match(sql, /amount_kes/i);
  assert.match(sql, /entitlements jsonb/i);
});

test("payment attempts record canonical expected amounts and pending downgrade state", () => {
  assert.match(sql, /subscription_payment_attempts/i);
  assert.match(sql, /expected_amount/i);
  assert.match(sql, /pending_plan/i);
  assert.match(sql, /downgrade_effective_at/i);
});

test("frontend no longer treats hardcoded prices as payment authority", () => {
  assert.match(plans, /presentation/i);
  assert.doesNotMatch(billing, /Pay Bill/);
  assert.match(billing, /initiate-subscription-stk/);
  assert.match(hook, /subscription_catalog/);
});


test("addon catalog seed rows satisfy the catalog shape constraint", () => {
  assert.match(sql, /insert into public\.subscription_catalog\(product_code, product_type, plan_key, addon_key, name, amount_kes, billing_period, entitlements, sort_order\)/i);
  assert.match(sql, /\('addon_members_100','addon',null,'member_addons','Extra Members'/i);
  assert.match(sql, /\('addon_sms_100','addon',null,'sms_addons','Extra SMS'/i);
});

test('subscription tables do not leave destructive privileges on browser roles', () => {
  assert.match(sql, /revoke all on public\.subscription_catalog from anon, authenticated/i);
  assert.match(sql, /grant select on public\.subscription_catalog to anon, authenticated/i);
  assert.match(sql, /revoke all on public\.subscription_payment_attempts from anon, authenticated/i);
  assert.match(sql, /grant select on public\.subscription_payment_attempts to authenticated/i);
});

test('subscription payment product foreign key has a covering index', () => {
  assert.match(sql, /subscription_payment_attempts_product_code_idx/i);
  assert.match(sql, /on public\.subscription_payment_attempts\s*\(product_code\)/i);
});
