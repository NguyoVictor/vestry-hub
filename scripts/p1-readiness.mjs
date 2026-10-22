#!/usr/bin/env node
// Vestry Hub P1 readiness: static, read-only scan; does not call Supabase or write to DB.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
const snapshotPath=path.join(root,'.p1-readiness','schema.json');
const outDir=path.join(root,'reports','p1-readiness');
fs.mkdirSync(outDir,{recursive:true});
if(!fs.existsSync(path.join(root,'package.json'))){console.error('Run from the vestry-hub project root (package.json required).');process.exitCode=2;} else {
const schema=JSON.parse(fs.readFileSync(snapshotPath,'utf8'));
const tables=schema.tables || {};
const issues=[], inspected=[];
function walk(dir){if(!fs.existsSync(dir))return;for(const d of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','dist','build','coverage','reports','.next'].includes(d.name))continue;const f=path.join(dir,d.name);if(d.isDirectory())walk(f);else if(/\.(tsx?|jsx?)$/.test(d.name))inspect(f);}}
function report(sev,kind,file,table,column,detail){issues.push({severity:sev,kind,file:path.relative(root,file),table,column,detail});}
function loc(s,index){return s.slice(0,index).split('\n').length;}
function inspect(file){let s=fs.readFileSync(file,'utf8');inspected.push(path.relative(root,file));
  // Only compare fields in direct, literal Supabase .from(table) chains; dynamic arguments are not asserted.
  const from=/\.from\(\s*['"`]([a-zA-Z_][\w]*)['"`]\s*\)/g;let m;
  while((m=from.exec(s))){const table=m[1];if(!tables[table])continue;
    let tail=s.slice(from.lastIndex,Math.min(from.lastIndex+2200,s.length));
    // Restrict to a plausible fluent chain; expressions with ambiguous syntax are warnings, not failures.
    const stop=tail.search(/;|\n\s*(?:const|let|return|if|await|\})\b/);if(stop>=0)tail=tail.slice(0,stop);
    // Stop before another Supabase table call; otherwise the previous table gets false positives.
    const nextFrom=tail.search(/\.from\(\s*['"`]/);if(nextFrom>=0)tail=tail.slice(0,nextFrom);
    // When Promise.all queries share a line, terminate after the first fluent .limit()/.single().
    const terminal=tail.match(/\.(?:limit|single|maybeSingle)\([^)]*\)/);if(terminal)tail=tail.slice(0,terminal.index+terminal[0].length);
    const sel=tail.match(/\.select\(\s*(['"`])([\s\S]*?)\1\s*[,)]/);
    if(sel){for(const token of sel[2].split(',')){let c=token.trim();if(!c||c==='*'||c.includes('(')||c.includes(')')||c.includes(':')||c.includes('!')||c.includes('*'))continue;c=c.replace(/\s+.*$/,'').replace(/^\"|\"$/g,'');if(!/^[a-zA-Z_]\w*$/.test(c))continue;if(!tables[table].includes(c))report('FAIL','unknown-select-column',file,table,c,`line ${loc(s,m.index)}; literal select references a field missing from schema snapshot`);}}
    for(const match of tail.matchAll(/\.(eq|neq|gt|gte|lt|lte|like|ilike|in|order)\(\s*['"`]([a-zA-Z_]\w*)['"`]/g)){
      const c=match[2];if(!tables[table].includes(c))report('FAIL','unknown-filter-column',file,table,c,`line ${loc(s,m.index)}; ${match[1]} filter references missing column`);
    }
    // Heuristic for inline literal insert/update object; do not flag ambiguous spread/computed payloads.
    const mutation=tail.match(/\.(insert|update|upsert)\(\s*(\{[^}]*\}|\[\s*\{[^}]*\})/);
    if(mutation){const block=mutation[2];if(!block.includes('...'))for(const field of block.matchAll(/(?:^|[,\{])\s*(?:['"`]([a-zA-Z_]\w*)['"`]|([a-zA-Z_]\w*))\s*:/g)){
      const c=field[1]||field[2];if(!tables[table].includes(c))report('FAIL','unknown-payload-column',file,table,c,`line ${loc(s,m.index)}; inline ${mutation[1]} field missing from snapshot`);
    }}
  }
}
walk(path.join(root,'src'));walk(path.join(root,'supabase','functions'));
function run(label,bin,args){const p=spawnSync(bin,args,{cwd:root,encoding:'utf8',timeout:180000,maxBuffer:1024*1024*12});const ok=p.status===0;return {label,result:ok?'PASS':p.error?'ERROR':'FAIL',status:p.status,output:(p.stdout||'')+(p.stderr||'')};}
const checks=[];
const tsc=path.join(root,'node_modules','.bin','tsc');
if(fs.existsSync(tsc))checks.push(run('TypeScript',tsc,['--noEmit']));else checks.push({label:'TypeScript',result:'SKIP',output:'node_modules/.bin/tsc not installed'});
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(pkg.scripts?.build)checks.push(run('Production build','npm',['run','build']));else checks.push({label:'Production build',result:'SKIP',output:'No build script'});
const safeTests=['test:p1:stage11a:contract','test:p1:closeout'];
for(const name of safeTests)checks.push({label:name,result:'NOT RUN',output:'Run independently after verifying fixtures and that tests do not write to live data'});
const summary={generated_at:new Date().toISOString(),schema_snapshot:schema.captured_at,schema_project:schema.project_ref,files_scanned:inspected.length,issues,checks:checks.map(({output,...c})=>c),note:'Static scan of literal Supabase queries only; not a full semantic analyzer or runtime/RLS penetration test. Schema snapshot can become stale.'};
fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(summary,null,2)+'\n');
let md=`# Phase 1 readiness\n\nGenerated: ${summary.generated_at}\nSchema snapshot: ${summary.schema_snapshot} (staging ${summary.schema_project})\nSource files scanned: ${inspected.length}\n\n## Checks\n`;
for(const c of checks)md+=`\n### ${c.label}: ${c.result}\n\n\`\`\`text\n${c.output.slice(-8000).replace(/\`\`\`/g,'[fence]')}\n\`\`\`\n`;
md+=`\n## Static schema mismatches (${issues.length})\n`;
for(const i of issues)md+=`- **${i.severity}** ${i.kind}: \`${i.table}.${i.column}\` in \`${i.file}\` (${i.detail})\n`;
md+=`\n## Limitations\n- Uses a dated snapshot; refresh before final signoff.\n- Only literal .from(table) query chains can be scanned. Variable-defined payloads, dynamic tables and joins require manual or AST-assisted review.\n- Does not mutate staging, execute API calls, test RLS with users, or validate cross-tenant isolation.\n- Run dedicated disposable-account integration tests separately.\n`;
fs.writeFileSync(path.join(outDir,'report.md'),md);
console.log(`P1 readiness: ${issues.length} possible schema mismatches in ${inspected.length} files`);
for(const c of checks)console.log(`${c.label}: ${c.result}`);
console.log(`Reports: ${path.relative(root,outDir)}/report.md and report.json`);
if(issues.length||checks.some(c=>c.result==='FAIL'||c.result==='ERROR'))process.exitCode=1;
}
