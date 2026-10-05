import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrations = fs.readdirSync("supabase/migrations").filter((f) => f.includes("p2_communication_queue_foundation"));
const sql = migrations.length ? fs.readFileSync(path.join("supabase/migrations", migrations[0]), "utf8") : "";

test("communication queue foundation creates durable server-only jobs and queues", () => {
  assert.match(sql, /create extension if not exists pgmq/i);
  assert.match(sql, /pgmq\.create\('outbound_email'\)/i);
  assert.match(sql, /pgmq\.create\('outbound_sms'\)/i);
  assert.match(sql, /create table if not exists public\.communication_jobs/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.communication_jobs from (?:public, )?anon, authenticated/i);
});

test("credit reservation is atomic and includes in-flight reservations", () => {
  assert.match(sql, /email_reserved/i);
  assert.match(sql, /sms_reserved/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /reserve_communication_credits/i);
  assert.match(sql, /email_used[^;]+email_reserved/is);
  assert.match(sql, /sms_used[^;]+sms_reserved/is);
  assert.match(sql, /pgmq\.send/i);
});

test("finalization is idempotent and queue access is wrapped for service role", () => {
  assert.match(sql, /finalize_communication_job/i);
  assert.match(sql, /status in \('completed', 'partial', 'failed', 'cancelled'\)/i);
  assert.match(sql, /claim_communication_jobs/i);
  assert.match(sql, /ack_communication_job/i);
  assert.match(sql, /revoke all on function public\.reserve_communication_credits/i);
  assert.match(sql, /grant execute on function public\.reserve_communication_credits[^;]+to service_role/i);
});
