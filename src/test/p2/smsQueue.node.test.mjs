import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const enqueue = fs.readFileSync("supabase/functions/africastalking-sms/index.ts", "utf8");
const workerPath = "supabase/functions/process-sms-queue/index.ts";
const worker = fs.existsSync(workerPath) ? fs.readFileSync(workerPath, "utf8") : "";

test("public SMS function authorizes and enqueues without provider calls", () => {
  assert.match(enqueue, /authorizeTenantActor/);
  assert.match(enqueue, /reserve_communication_credits/);
  assert.match(enqueue, /communication_job_recipients/);
  assert.doesNotMatch(enqueue, /sozuri\.net\/api\/v1\/messaging/);
});

test("SMS worker handles provider delivery, retries and credit finalization", () => {
  assert.match(worker, /claim_communication_jobs/);
  assert.match(worker, /sozuri\.net\/api\/v1\/messaging/);
  assert.match(worker, /communication_job_recipients/);
  assert.match(worker, /retry_limit_reached/);
  assert.match(worker, /finalize_communication_job/);
  assert.match(worker, /ack_communication_job/);
});

test("SMS worker sends recipient-by-recipient for idempotent retry accounting", () => {
  assert.match(worker, /for \(const recipientRow of recipientRows/);
  assert.match(worker, /\.neq\("status", "sent"\)/);
  assert.match(worker, /status:\s*"sent"/);
});

test('SMS worker authenticates scheduled calls with a dedicated Vault worker token instead of JWT gateway auth', () => {
  const config = fs.readFileSync('supabase/config.toml', 'utf8');
  assert.match(worker, /x-vestry-worker-token/);
  assert.match(worker, /internal_worker_auth/);
  assert.match(config, /\[functions\.process-sms-queue\][\s\S]*?verify_jwt\s*=\s*false/);
});
