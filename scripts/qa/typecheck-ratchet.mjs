/**
 * Typecheck ratchet (PRODUCTION_READINESS F1). The app had ~900 latent type
 * errors once src/integrations/supabase/types.ts was regenerated from the live
 * schema (20 Nov 2026). Fixing all of them before launch is not feasible, so
 * CI blocks any NEW error: per file, the error count may only stay the same
 * or go down. When a file improves, lower its baseline in the same commit
 * (`--update` rewrites the baseline from the current output).
 *
 * Usage:
 *   npx tsc -p tsconfig.app.json --noEmit --pretty false > tsc.txt || true
 *   node scripts/qa/typecheck-ratchet.mjs tsc.txt            # check
 *   node scripts/qa/typecheck-ratchet.mjs tsc.txt --update   # rewrite baseline
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASELINE = 'scripts/qa/typecheck-baseline.json';

export function countErrors(output) {
  const counts = {};
  for (const line of output.split('\n')) {
    const m = /^(.+?)\(\d+,\d+\): error TS\d+:/.exec(line.trim());
    if (m) counts[m[1].replace(/\\/g, '/')] = (counts[m[1].replace(/\\/g, '/')] || 0) + 1;
  }
  return counts;
}

export function compare(current, baseline) {
  const regressions = [];
  const improvements = [];
  for (const [file, n] of Object.entries(current)) {
    const allowed = baseline[file] || 0;
    if (n > allowed) regressions.push(`${file}: ${n} errors (baseline ${allowed})`);
  }
  for (const [file, allowed] of Object.entries(baseline)) {
    const n = current[file] || 0;
    if (n < allowed) improvements.push(`${file}: ${n} (baseline ${allowed})`);
  }
  return { regressions, improvements };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , input, flag] = process.argv;
  if (!input || !existsSync(input)) { console.error('usage: typecheck-ratchet.mjs <tsc-output> [--update]'); process.exit(2); }
  const output = readFileSync(input, 'utf8');
  if (!/error TS\d+/.test(output) && /\berror\b/i.test(output)) {
    console.error('FAIL: tsc output contains a non-TS error (crash or config problem); refusing to ratchet.');
    process.exit(1);
  }
  const current = countErrors(output);
  const total = Object.values(current).reduce((a, b) => a + b, 0);
  if (flag === '--update') {
    const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + '\n');
    console.log(`Baseline written: ${total} errors in ${Object.keys(current).length} files.`);
    process.exit(0);
  }
  const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
  const { regressions, improvements } = compare(current, baseline);
  const baseTotal = Object.values(baseline).reduce((a, b) => a + b, 0);
  console.log(`Type errors: ${total} now, ${baseTotal} in baseline.`);
  if (improvements.length) console.log(`Improved (lower the baseline with --update):\n  ${improvements.join('\n  ')}`);
  if (regressions.length) {
    console.error(`FAIL: new type errors:\n  ${regressions.join('\n  ')}`);
    process.exit(1);
  }
  console.log('PASS: no new type errors.');
}
