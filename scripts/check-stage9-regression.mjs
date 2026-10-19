import { readFileSync, existsSync, readdirSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts || {};
const requiredScripts = [
  'test:security:secrets',
  'test:p1:people',
  'test:p1:operations',
  'test:p1:engagement',
  'test:p1:analytics',
  'test:p1:modules',
  'test:p1:modules:contract',
  'test:p1:modules:qa-contract',
  'test:p1:performance:contract',
  'test:p1:domains:contract',
  'test:p1:actions:contract',
  'test:p1:stage7:contract',
  'test:p1:stage8:contract',
  'test:p2:contracts',
  'test:p2:vitest',
  'test:e2e:modules',
  'test:e2e:stage7',
  'test:e2e:platform',
];

const failures = [];
for (const name of requiredScripts) if (!scripts[name]) failures.push(`missing package script: ${name}`);

const requiredDirs = [
  'src/test/p1/people',
  'src/test/p1/operations',
  'src/test/p1/engagement',
  'src/test/p1/analytics',
  'src/test/p1/modules',
  'e2e/platform/people',
  'e2e/platform/operations',
  'e2e/platform/actions',
  'e2e/platform/modules',
  'e2e/platform/stage7',
];
for (const path of requiredDirs) if (!existsSync(path)) failures.push(`missing regression area: ${path}`);

const p1Files = ['people','operations','engagement','analytics','modules']
  .flatMap(dir => readdirSync(`src/test/p1/${dir}`).filter(name => /\.test\.(ts|tsx)$/.test(name)).map(name => `${dir}/${name}`));
if (p1Files.length < 19) failures.push(`expected at least 19 focused P1 test files, found ${p1Files.length}`);

const actionManifest = readFileSync('e2e/platform/action-manifest.ts', 'utf8');
if (!actionManifest.includes('manual-exception')) failures.push('action manifest must retain explicit manual provider exceptions');
if (!actionManifest.includes('protected-e2e')) failures.push('action manifest must retain protected E2E dispositions');

const stage7 = readFileSync('scripts/check-stage7-e2e.mjs', 'utf8');
if (!stage7.includes('STAGE7_PROTECTED_ACTION_IDS') || !stage7.includes('manual exceptions')) failures.push('Stage 7 coverage contract no longer validates protected/manual action mappings');

if (failures.length) {
  console.error('Stage 9 regression contract: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Stage 9 regression contract: PASS (${p1Files.length} focused P1 test files + protected platform suites)`);
