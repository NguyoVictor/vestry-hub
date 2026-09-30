import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const enqueue = fs.readFileSync("supabase/functions/send-communication/index.ts", "utf8");
const workerPath = "supabase/functions/process-email-queue/index.ts";
const worker = fs.existsSync(workerPath) ? fs.readFileSync(workerPath, "utf8") : "";
const automations = fs.readFileSync("supabase/functions/process-email-automations/index.ts", "utf8");

test("send-communication only authorizes, reserves and enqueues", () => {
  assert.match(enqueue, /authorizeTenantActor/);
  assert.match(enqueue, /reserve_communication_credits/);
  assert.ok(enqueue.includes("}, 202);"));
  assert.doesNotMatch(enqueue, /api\.resend\.com/);
});

test("email worker owns provider delivery and idempotent queue lifecycle", () => {
  assert.match(worker, /claim_communication_jobs/);
  assert.match(worker, /api\.resend\.com/);
  assert.match(worker, /communication_job_recipients/);
  assert.match(worker, /finalize_communication_job/);
  assert.match(worker, /ack_communication_job/);
  assert.match(worker, /read_ct|attempt_count/);
});

test("scheduled automations enter the same queue path", () => {
  assert.match(automations, /functions\/v1\/send-communication/);
  assert.doesNotMatch(automations, /api\.resend\.com/);
});

test('email worker authenticates scheduled calls with a dedicated Vault worker token instead of JWT gateway auth', () => {
  const config = fs.readFileSync('supabase/config.toml', 'utf8');
  assert.match(worker, /x-vestry-worker-token/);
  assert.match(worker, /internal_worker_auth/);
  assert.match(config, /\[functions\.process-email-queue\][\s\S]*?verify_jwt\s*=\s*false/);
});
