/**
 * Offline, dependency-free source audit. Prevent the Vite SPA from shipping a
 * compiled-in churchapp Supabase origin on a Vestry Hub recovery Preview.
 * No network access, env-secret reads or project setting mutations.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function reviewClientSource(source) {
  const errors = [];
  if (/crjdsxxkspvdwknrmijs\.supabase\.co/i.test(source)) {
    errors.push('Supabase client still contains the unrelated churchapp backend.');
  }
  if (!/\bconst\s+SUPABASE_URL\s*=\s*import\.meta\.env\.VITE_SUPABASE_URL\s*;/.test(source)) {
    errors.push('SUPABASE_URL must be sourced from import.meta.env.VITE_SUPABASE_URL.');
  }
  if (!/\bconst\s+SUPABASE_PUBLISHABLE_KEY\s*=\s*import\.meta\.env\.VITE_SUPABASE_PUBLISHABLE_KEY\s*;/.test(source)) {
    errors.push('SUPABASE_PUBLISHABLE_KEY must be sourced from import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.');
  }
  return errors;
}

const invoked = Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const path = 'src/integrations/supabase/client.ts';
  try {
    const failures = reviewClientSource(readFileSync(path, 'utf8'));
    if (failures.length) {
      failures.forEach(msg => console.error('FAIL:', msg));
      console.error('Do not edit test guards. Publish the reviewed env-based client and rebuild a new Preview.');
      process.exitCode = 1;
    } else {
      console.log('PASS: Supabase client reads environment-scoped URL and publishable key (source-level check only).');
    }
  } catch (e) {
    console.error(`FAIL: cannot inspect ${path} (${e.code || 'unknown'}).`);
    process.exitCode = 1;
  }
}
