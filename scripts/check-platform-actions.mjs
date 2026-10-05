import { PLATFORM_ACTIONS, PLATFORM_ACTION_SUMMARY } from '../e2e/platform/action-manifest.ts';
const errors=[];
const ids=new Set();
for (const a of PLATFORM_ACTIONS){
 if(ids.has(a.id)) errors.push(`duplicate id: ${a.id}`); ids.add(a.id);
 if(!a.route || !a.action || !a.outcome || !a.testRef) errors.push(`incomplete: ${a.id}`);
 if(a.verification==='manual-exception' && !a.manualReason) errors.push(`manual exception missing reason: ${a.id}`);
 if((a.risk==='critical'||a.risk==='high') && !['automated','protected-e2e','manual-exception'].includes(a.verification)) errors.push(`high-risk unmapped: ${a.id}`);
}
if(PLATFORM_ACTIONS.length < 60) errors.push(`expected at least 60 actions, got ${PLATFORM_ACTIONS.length}`);
if(PLATFORM_ACTION_SUMMARY.critical < 10) errors.push('critical action inventory unexpectedly small');
if(errors.length){ console.error(errors.join('\n')); process.exit(1); }
console.log(`platform action inventory: PASS (${PLATFORM_ACTIONS.length} actions)`);
console.log(JSON.stringify(PLATFORM_ACTION_SUMMARY));
