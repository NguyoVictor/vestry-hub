/**
 * Offline guard (PRODUCTION_READINESS A3): app and Edge Function source must
 * never hard-code a Supabase project URL. The browser reads
 * import.meta.env.VITE_SUPABASE_URL; functions read Deno.env SUPABASE_URL.
 * A hard-coded ref silently ties a build to one project (20 Nov 2026: three
 * call sites still pointed at churchapp while Previews used staging).
 * Tests under src/test/ may use refs as fixtures and are excluded.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_URL = /https:\/\/[a-z0-9]{20}\.supabase\.(co|in)\b/i;
const SCANNED = ['src', 'supabase/functions'];
const EXCLUDED = [/^src\/test\//, /\.test\.[cm]?[jt]sx?$/, /\.spec\.[cm]?[jt]sx?$/];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) yield path;
  }
}

export function findHardcodedProjects(root = process.cwd()) {
  const hits = [];
  for (const base of SCANNED) {
    for (const path of files(resolve(root, base))) {
      const rel = path.slice(resolve(root).length + 1).replace(/\\/g, '/');
      if (EXCLUDED.some((re) => re.test(rel))) continue;
      readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
        if (PROJECT_URL.test(line)) hits.push(`${rel}:${i + 1}`);
      });
    }
  }
  return hits;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const hits = findHardcodedProjects();
  if (hits.length) {
    hits.forEach((h) => console.error('FAIL: hard-coded Supabase project URL at', h));
    process.exitCode = 1;
  } else {
    console.log('PASS: no hard-coded Supabase project URLs in src/ or supabase/functions/.');
  }
}
