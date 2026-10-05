import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const required = [
  'e2e/platform/fixtures/safety.ts',
  'e2e/platform/fixtures/auth.ts',
  'e2e/platform/fixtures/tenants.ts',
  'e2e/platform/fixtures/supabase.ts',
  'e2e/platform/action-manifest.ts',
  'e2e/platform/routes.spec.ts',
  'e2e/platform/actions/buttons-links.spec.ts',
  'e2e/platform/actions/forms.spec.ts',
  'e2e/platform/actions/qr.spec.ts',
  'e2e/platform/import-export.spec.ts',
  'e2e/platform/permissions.spec.ts',
  'e2e/platform/tenant-boundary.spec.ts',
  'e2e/platform/infrastructure/communications.spec.ts',
  'e2e/platform/infrastructure/subscription-payments.spec.ts',
];

test('platform QA inventory exists', () => {
  for (const path of required) assert.equal(existsSync(new URL(path, root)), true, `${path} missing`);
});

test('platform destructive suites require explicit disposable test environment', () => {
  const safety = read('e2e/platform/fixtures/safety.ts');
  assert.match(safety, /PW_PLATFORM_TEST_ENV/);
  assert.match(safety, /PW_TENANT_A_ID/);
  assert.match(safety, /PW_TENANT_B_ID/);
  assert.match(safety, /disposable/i);
});

test('package scripts expose platform and tenant-boundary suites', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['test:e2e:platform'] || '', /e2e\/platform/);
  assert.match(pkg.scripts['test:e2e:tenant-boundary'] || '', /tenant-boundary/);
  assert.ok(pkg.scripts['test:e2e:p1-p2']);
});

test('action manifest includes admin/member routes and authorization outcomes', () => {
  const manifest = read('e2e/platform/action-manifest.ts');
  assert.match(manifest, /PLATFORM_ROUTES/);
  assert.match(manifest, /PLATFORM_ACTIONS/);
  assert.match(manifest, /permission/);
  assert.match(manifest, /destructive/);
  assert.match(manifest, /\/dashboard/);
  assert.match(manifest, /\/member/);
});

test('tenant boundary suite includes direct cross-tenant CRUD and hostname mismatch checks', () => {
  const suite = read('e2e/platform/tenant-boundary.spec.ts');
  for (const verb of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) assert.match(suite, new RegExp(verb, 'i'));
  assert.match(suite, /hostname/i);
  assert.match(suite, /Tenant A/i);
  assert.match(suite, /Tenant B/i);
});

test('platform action suites exercise real UI controls when protected actor state is supplied', () => {
  const buttons = read('e2e/platform/actions/buttons-links.spec.ts');
  const forms = read('e2e/platform/actions/forms.spec.ts');
  const imports = read('e2e/platform/import-export.spec.ts');
  expectSource(buttons, [/page\.goto\(/, /Add Member/, /Post Announcement/, /Create Survey/]);
  expectSource(forms, [/page\.goto\(/, /Submit Request/, /Add New Member/]);
  expectSource(imports, [/waitForEvent\(['\"]download['\"]\)/, /Import Members/]);
});

test('platform authorization suites use actor-scoped clients rather than service-role for denial probes', () => {
  const supabaseFixture = read('e2e/platform/fixtures/supabase.ts');
  const boundary = read('e2e/platform/tenant-boundary.spec.ts');
  const permissions = read('e2e/platform/permissions.spec.ts');
  expectSource(supabaseFixture, [/platformActorClient/, /PW_SUPABASE_ANON_KEY/, /Authorization/]);
  expectSource(boundary, [/platformActorClient/, /SELECT/i, /INSERT/i, /UPDATE/i, /DELETE/i]);
  expectSource(permissions, [/actorStorageState/, /read-only-admin/, /no-permission-admin/]);
});

function expectSource(source, patterns) {
  for (const pattern of patterns) assert.match(source, pattern);
}

test('infrastructure E2E performs non-destructive authorization and tamper probes', () => {
  const communications = read('e2e/platform/infrastructure/communications.spec.ts');
  const payments = read('e2e/platform/infrastructure/subscription-payments.spec.ts');
  expectSource(communications, [/platformActorClient/, /reserve_communication_credits/, /communication_jobs/]);
  expectSource(payments, [/platformActorClient/, /subscription_catalog/, /subscription_payment_attempts/, /apply_subscription_payment_callback/]);
});

test('route smoke suite covers protected admin/member routes with actor storage state', () => {
  const routes = read('e2e/platform/routes.spec.ts');
  expectSource(routes, [/actorStorageState/, /full-admin/, /member-a/, /PLATFORM_ROUTES\.filter/]);
});
