import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migrationsDir = 'supabase/migrations';

function findQueueCronMigration() {
  return fs.readdirSync(migrationsDir)
    .filter((name) => name.endsWith('_p2_queue_worker_token_auth.sql'))
    .map((name) => path.join(migrationsDir, name))[0];
}

test('queue worker cron invokes both protected workers using the Vault service token', () => {
  const migration = findQueueCronMigration();
  assert.ok(migration, 'P2 queue worker cron migration must exist');
  const sql = fs.readFileSync(migration, 'utf8');
  assert.match(sql, /process-email-queue/);
  assert.match(sql, /process-sms-queue/);
  assert.match(sql, /vestry_queue_worker_token/);
  assert.match(sql, /vault\.decrypted_secrets/);
  assert.match(sql, /x-vestry-worker-token/);
  assert.doesNotMatch(sql, /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
});
