import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'dist-ssr', 'playwright-report', 'test-results']);
const textExtensions = new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.md','.sql','.toml','.yml','.yaml','.sh','.bat','.txt','.html','.css']);
const explicitFiles = new Set(['.env.example', '.gitignore']);

const patterns = [
  ['Supabase management token', /\bsbp_[A-Za-z0-9]{20,}\b/g],
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{20,}\b/g],
  ['Groq API key', /\bgsk_[A-Za-z0-9_-]{20,}\b/g],
  ['Sentry auth token', /\bsntrys_[A-Za-z0-9_-]{20,}\b/g],
  ['generic sk credential', /\bsk-(?:user-)?[A-Za-z0-9_-]{20,}\b/g],
];

const forbiddenBrowserSecrets = /\bVITE_(?:GROQ_API_KEY|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_PASSWORD|SUPABASE_ACCESS_TOKEN|SENTRY_AUTH_TOKEN)\b/g;
const jwtPattern = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g;
const findings = [];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function decodeJwtRole(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')).role;
  } catch {
    return undefined;
  }
}

for (const file of walk(root)) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  const ext = path.extname(file).toLowerCase();
  if (!textExtensions.has(ext) && !explicitFiles.has(path.basename(file))) continue;
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }

  for (const [label, regex] of patterns) {
    regex.lastIndex = 0;
    if (regex.test(text)) findings.push(`${rel}: ${label}`);
  }

  // Browser-prefix checks apply to active source/config, not historical security documentation.
  if (rel.startsWith('src/') || rel === '.env.example' || rel.startsWith('vite.')) {
    forbiddenBrowserSecrets.lastIndex = 0;
    if (forbiddenBrowserSecrets.test(text)) findings.push(`${rel}: server secret uses VITE_ browser prefix`);
  }

  jwtPattern.lastIndex = 0;
  for (const token of text.match(jwtPattern) ?? []) {
    if (decodeJwtRole(token) === 'service_role') {
      findings.push(`${rel}: embedded Supabase service_role JWT`);
    }
  }
}

if (findings.length) {
  console.error('Repository secret guard failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('Repository secret guard passed.');
