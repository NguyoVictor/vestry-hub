import test from 'node:test';
import assert from 'node:assert/strict';
import { requireDisposablePlatformTestEnv } from '../../e2e/platform/fixtures/safety.ts';

const keys=['PW_PLATFORM_TEST_ENV','PW_SUPABASE_URL','PW_QA_PROJECT_REF','PW_FRONTEND_SUPABASE_URL','PW_TENANT_A_ID','PW_TENANT_B_ID','PW_BASE_URL','PW_QA_APP_HOST'];
const defaults={
  PW_PLATFORM_TEST_ENV:'disposable',
  PW_SUPABASE_URL:'https://disposable-test-ref.supabase.co',
  PW_QA_PROJECT_REF:'disposable-test-ref',
  PW_FRONTEND_SUPABASE_URL:'https://disposable-test-ref.supabase.co',
  PW_TENANT_A_ID:'qa-a',PW_TENANT_B_ID:'qa-b',PW_BASE_URL:'http://127.0.0.1:4173',
};
function withEnv(overrides,fn){const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));try{for(const k of keys){delete process.env[k]}Object.assign(process.env,defaults,overrides);fn()}finally{for(const k of keys){if(prior[k]===undefined)delete process.env[k];else process.env[k]=prior[k]}}}
test('rejects both protected projects',()=>{for(const ref of ['xwbajophstetbnnemsyq','crjdsxxkspvdwknrmijs']) withEnv({PW_SUPABASE_URL:`https://${ref}.supabase.co`,PW_QA_PROJECT_REF:ref},()=>assert.throws(requireDisposablePlatformTestEnv,/protected\/shared/))});
test('rejects mismatched explicit QA ref',()=>withEnv({PW_QA_PROJECT_REF:'different'},()=>assert.throws(requireDisposablePlatformTestEnv,/PW_QA_PROJECT_REF/)));
test('rejects frontend/backend drift',()=>withEnv({PW_FRONTEND_SUPABASE_URL:'https://xwbajophstetbnnemsyq.supabase.co'},()=>assert.throws(requireDisposablePlatformTestEnv,/do not match/)));
test('rejects arbitrary Vercel hosts and all production domains',()=>{withEnv({PW_BASE_URL:'https://x-preview.vercel.app'},()=>assert.throws(requireDisposablePlatformTestEnv,/PW_QA_APP_HOST/));withEnv({PW_BASE_URL:'https://app.vestryhub.com',PW_QA_APP_HOST:'app.vestryhub.com'},()=>assert.throws(requireDisposablePlatformTestEnv,/production/))});
test('supports isolated hosted QA with exact app host',()=>withEnv({PW_BASE_URL:'https://qa-example.vercel.app',PW_QA_APP_HOST:'qa-example.vercel.app'},()=>assert.equal(requireDisposablePlatformTestEnv().disposable,true)));
test('supports localhost Supabase with explicit local ref',()=>withEnv({PW_SUPABASE_URL:'http://127.0.0.1:54321',PW_FRONTEND_SUPABASE_URL:'http://127.0.0.1:54321',PW_QA_PROJECT_REF:'local'},()=>assert.equal(requireDisposablePlatformTestEnv().disposable,true)));
