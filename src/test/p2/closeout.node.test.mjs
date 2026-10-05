import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
const root = new URL('../../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

test('P2 closeout documentation and CI quality gate exist', () => {
  for (const p of ['docs/p2/infrastructure-changes.md','docs/p2/platform-qa-coverage.md','.github/workflows/p1-p2-quality.yml']) {
    assert.equal(existsSync(new URL(p, root)), true, `${p} missing`);
  }
});

test('CI includes install, build, P2 contracts, P1 focused tests, and secret scan', () => {
  const ci = read('.github/workflows/p1-p2-quality.yml');
  assert.match(ci, /npm ci/);
  assert.match(ci, /npm run build/);
  assert.match(ci, /test:p2:contracts/);
  assert.match(ci, /test:p1:/);
  assert.match(ci, /secret/i);
});

test('P2 docs record deployment gates and provider separation', () => {
  const infra = read('docs/p2/infrastructure-changes.md');
  assert.match(infra, /B1/); assert.match(infra, /B8/);
  assert.match(infra, /RLS/); assert.match(infra, /queue/i);
  assert.match(infra, /PLATFORM_DARAJA/);
  assert.match(infra, /church-giving/i);
});

test('closeout docs capture queue operations, webhook secrets, and single-commit handoff', () => {
  const payments = read('docs/payments.md');
  const messaging = read('docs/messaging.md');
  const checkpoint = read('docs/SESSION_CHECKPOINT.md');
  assert.match(payments, /PLATFORM_DARAJA_WEBHOOK_SECRET/);
  assert.match(payments, /CHURCH_DARAJA_WEBHOOK_SECRET/);
  assert.match(messaging, /communication_jobs/);
  assert.match(messaging, /process-email-queue/);
  assert.match(messaging, /process-sms-queue/);
  assert.match(checkpoint, /B1.*B8/s);
  assert.match(checkpoint, /single final B-batch commit/i);
});
