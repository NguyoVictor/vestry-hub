#!/usr/bin/env node
/** Dependency-free, read-only Phase 0 preflight; never connects to cloud. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'scripts/recovery/phase0-migrations.json'), 'utf8'));
const ci = process.argv.includes('--ci');
const errors = [];
const warnings = [];
const info = [];
const runGit = (...args) => {
  try { return execFileSync('git', args, {cwd:root, encoding:'utf8', stdio:['ignore','pipe','ignore']}).trim(); }
  catch { return null; }
};
const currentBranch = (ci && (process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME)) || runGit('branch','--show-current');
if (currentBranch !== baseline.sourceBranch) errors.push(`Expected branch ${baseline.sourceBranch}; got ${currentBranch || '<none>'}.`);
info.push(`Branch: ${currentBranch}`);
info.push(`HEAD: ${runGit('rev-parse','--short','HEAD') || 'unknown'}`);

const migrationDir = path.join(root,'supabase/migrations');
const filenames = fs.readdirSync(migrationDir).filter(x=>x.endsWith('.sql'));
const malformed = filenames.filter(x=>!/^\d{14}_.+\.sql$/.test(x));
if (malformed.length) errors.push(`Malformed migration filenames: ${malformed.join(', ')}`);
const versions = filenames.filter(x=>/^\d{14}_.+\.sql$/.test(x)).map(x=>x.slice(0,14)).sort();
const unique = new Set(versions);
if (unique.size !== versions.length) errors.push('Migration version collision detected.');
const missing = baseline.versions.filter(x=>!unique.has(x));
const added = versions.filter(x=>!baseline.versions.includes(x));
if (missing.length) errors.push(`Missing ${missing.length} baseline migration versions: ${missing.join(', ')}`);
const hash = crypto.createHash('sha256').update(versions.join('\n')).digest('hex');
const baselineConsistent = crypto.createHash('sha256').update(baseline.versions.join('\n')).digest('hex') === baseline.sortedVersionSha256;
if (!baselineConsistent) errors.push('Shipped migration baseline manifest integrity check FAILED.');
if (!added.length && hash !== baseline.sortedVersionSha256) errors.push('Migration version checksum does not match baseline.');
if (added.length) warnings.push(`${added.length} migration versions added after Phase 0 baseline; compare with remote before deploying.`);
info.push(`Migrations: ${versions.length} files, ${unique.size} unique, baseline ${baseline.versions.length}; new after baseline ${added.length}`);
info.push(`Version list SHA256: ${hash}`);

const linked = path.join(root,'supabase/.temp/project-ref');
if (fs.existsSync(linked)) {
  const id = fs.readFileSync(linked,'utf8').trim();
  if (id !== baseline.projectRef) {
    if (ci) warnings.push(`CI tracked Supabase CLI link is not staging (expected ${baseline.projectRef}); no remote commands will run.`);
    else errors.push(`Supabase linked ref ${id} is not the intended staging project ${baseline.projectRef}.`);
  } else info.push('Local CLI link: expected staging project.');
} else {
  warnings.push('No linked Supabase project metadata found. Check target before CLI migrations or remote dumps.');
}
const config = fs.readFileSync(path.join(root,'supabase/config.toml'),'utf8');
const localConfigId = config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
if (localConfigId && localConfigId !== baseline.projectRef) {
  warnings.push(`config.toml local project ID differs from staging; this field is NOT the linked remote target. Verify with supabase link/migration list.`);
}
const trackedTemp = runGit('ls-files','supabase/.temp');
if (trackedTemp) warnings.push('supabase/.temp is still tracked in Git; remove from index with git rm -r --cached supabase/.temp after reviewing.');

// Check the referenced hardening code rather than assuming a flag alone is sufficient.
const safety = fs.readFileSync(path.join(root,'e2e/platform/fixtures/safety.ts'),'utf8');
for (const fragment of ['PW_QA_PROJECT_REF', 'PW_FRONTEND_SUPABASE_URL', baseline.projectRef, 'crjdsxxkspvdwknrmijs']) {
  if (!safety.includes(fragment)) errors.push(`E2E safety guard missing ${fragment}.`);
}

const envPath=path.join(root,'.env.qa.local');
if (fs.existsSync(envPath)) {
  const env = Object.fromEntries(fs.readFileSync(envPath,'utf8').split(/\r?\n/).filter(x=>/^\s*[A-Z_]+\s*=/.test(x)).map(line=>{const idx=line.indexOf('=');return [line.slice(0,idx).trim(),line.slice(idx+1).trim().replace(/^["']|["']$/g,'')]}));
  const raw=env.VITE_SUPABASE_URL||'';
  if (!raw) errors.push('.env.qa.local must define VITE_SUPABASE_URL.');
  else {
    try {
      const u=new URL(raw);
      if ([baseline.projectRef,'crjdsxxkspvdwknrmijs'].some(ref=>u.hostname===`${ref}.supabase.co`)) errors.push('.env.qa.local targets a protected non-disposable Supabase project.');
    }catch{errors.push('Invalid VITE_SUPABASE_URL in .env.qa.local.')}
  }
  if (env.VITE_SUPABASE_PROJECT_ID && env.VITE_SUPABASE_PROJECT_ID!==env.VITE_SUPABASE_URL?.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/)?.[1] && env.VITE_SUPABASE_PROJECT_ID!=='local') warnings.push('QA env project ID does not match the URL hostname; verify QA connection.');
}

for (const x of info) console.log('INFO  ' + x);
for (const x of warnings) console.warn('WARN  ' + x);
for (const x of errors) console.error('FAIL  ' + x);
console.log(errors.length ? `Phase 0 preflight FAILED (${errors.length} errors)` : 'Phase 0 local preflight PASSED (cloud gates remain separate).');
process.exitCode = errors.length ? 1 : 0;
