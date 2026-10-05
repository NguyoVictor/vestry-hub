import { readFileSync } from 'node:fs';
import { PLATFORM_ACTIONS } from '../e2e/platform/action-manifest.ts';
import { STAGE7_PROTECTED_ACTION_IDS, STAGE7_MANUAL_ACTION_IDS } from '../e2e/platform/stage7/action-coverage.ts';

const errors = [];
const protectedIds = PLATFORM_ACTIONS.filter(a => a.verification === 'protected-e2e').map(a => a.id).sort();
const stage7 = [...STAGE7_PROTECTED_ACTION_IDS].sort();
const manual = PLATFORM_ACTIONS.filter(a => a.verification === 'manual-exception').map(a => a.id).sort();
const stage7Manual = [...STAGE7_MANUAL_ACTION_IDS].sort();
if (JSON.stringify(protectedIds) !== JSON.stringify(stage7)) errors.push(`protected action mapping mismatch: manifest=${protectedIds.length}, stage7=${stage7.length}`);
if (JSON.stringify(manual) !== JSON.stringify(stage7Manual)) errors.push(`manual exception mapping mismatch: manifest=${manual.length}, stage7=${stage7Manual.length}`);

const requiredFiles = [
  'e2e/platform/stage7/admin-permissions.spec.ts',
  'e2e/platform/stage7/tenant-api-denial.spec.ts',
  'e2e/platform/stage7/member-boundary.spec.ts',
  'e2e/platform/stage7/high-risk-smoke.spec.ts',
  'e2e/platform/tenant-boundary.spec.ts',
];
for (const file of requiredFiles) {
  const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  if (!src.includes('PW_PLATFORM_TEST_ENV') && !file.endsWith('tenant-boundary.spec.ts')) errors.push(`${file} is not disposable-environment gated`);
}
const tenantDomain = readFileSync(new URL('../e2e/platform/infrastructure/tenant-domain.spec.ts', import.meta.url), 'utf8');
if (/test\.fixme\(/.test(tenantDomain)) errors.push('tenant-domain.spec.ts still contains test.fixme');
const safety = readFileSync(new URL('../e2e/platform/fixtures/safety.ts', import.meta.url), 'utf8');
if (!safety.includes('I_UNDERSTAND_DESTRUCTIVE_TESTS')) errors.push('production destructive-test interlock missing');
if (errors.length) { for (const e of errors) console.error(`FAIL: ${e}`); process.exit(1); }
console.log(`Stage 7 E2E contract: PASS (${protectedIds.length} protected actions + ${manual.length} manual exceptions)`);
