import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
const root = process.cwd(); const failures = []; let checks = 0;
const pass = (condition, message) => { checks++; if (!condition) failures.push(message); };
function walk(dir) { const out=[]; for (const name of readdirSync(dir)) { const p=join(dir,name); const st=statSync(p); if (st.isDirectory()) out.push(...walk(p)); else if (/\.(ts|tsx)$/.test(name)) out.push(p); } return out; }
const helper=readFileSync(resolve(root,'src/lib/userFacingError.ts'),'utf8');
pass(helper.includes('export function toUserFacingError'),'missing centralized user-facing error sanitizer');
pass(helper.includes('row-level security') && helper.includes('postgrest'),'sanitizer must recognize database implementation details');
pass(helper.includes('You do not have permission to perform this action.'),'sanitizer must provide a friendly authorization message');
const findings=[];
for (const file of walk(resolve(root,'src'))) {
  const lines=readFileSync(file,'utf8').split(/\r?\n/);
  lines.forEach((line,index)=>{
    const rawToast=/toast\.error\([^\n]*(?:error|err|e)\.message\b/.test(line) && !line.includes('toUserFacingError(');
    const rawDescription=/description:\s*(?:error|err|e)\.message\b/.test(line);
    const rawJsx=line.includes('<') && line.includes('>') && /\{\s*(?:error|err|e)\.message\s*\}/.test(line) && !file.includes('ImportDialog.tsx');
    const rawResult=/set\w+\(\{[^\n]*error:\s*(?:error|err|e)\.message\b/.test(line);
    if (rawToast||rawDescription||rawJsx||rawResult) findings.push(`${relative(root,file)}:${index+1}`);
  });
}
pass(findings.length===0,`raw backend error text still reaches UI: ${findings.join(', ')}`);
const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
pass(Boolean(pkg.scripts?.['test:p1:stage10:contract']),'package.json missing Stage 10 contract command');
pass(Boolean(pkg.scripts?.['test:p1:closeout']),'package.json missing final Phase 1 closeout command');
const stage8=readFileSync(resolve(root,'docs/p1/stage8-supabase-security-closeout.md'),'utf8');
pass(stage8.includes('pg_net'),'Stage 8 documentation must record pg_net disposition');
const stage10=readFileSync(resolve(root,'docs/p1/stage10-phase1-closeout.md'),'utf8');
pass(stage10.includes('app.vestryhub.com'),'Stage 10 documentation must record application domain');
pass(stage10.includes('*.vestryhub.com'),'Stage 10 documentation must record wildcard tenant domain');
pass(stage10.includes('www.vestryhub.com'),'Stage 10 documentation must record www redirect');
pass(stage10.includes('credential-backed'),'Stage 10 documentation must explicitly record credential-backed browser QA status');
if (failures.length) { console.error(`Stage 10 closeout contract: FAIL (${checks-failures.length}/${checks})`); failures.forEach(x=>console.error(`- ${x}`)); process.exit(1); }
console.log(`Stage 10 closeout contract: PASS (${checks}/${checks})`);
