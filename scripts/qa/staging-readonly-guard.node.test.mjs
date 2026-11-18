import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyReadOnlyRequest, requireStagingReadOnlyEnv, STAGING_SUPABASE_ORIGIN } from './staging-readonly-guard.mjs';
const cfg = { baseURL: 'https://vestry-hub-git-recovery-example.vercel.app', appHost: 'vestry-hub-git-recovery-example.vercel.app', backend: STAGING_SUPABASE_ORIGIN };
const env = { PW_STAGING_READONLY:'1', PW_STAGING_BASE_URL: cfg.baseURL, PW_STAGING_ALLOWED_HOST: cfg.appHost, PW_STAGING_SUPABASE_URL: cfg.backend };

test('allows an exact preview host with explicit staging backend', () => {
  assert.deepEqual(requireStagingReadOnlyEnv(env), cfg);
});
test('requires explicit opt-in', () => {
  assert.throws(() => requireStagingReadOnlyEnv({ ...env, PW_STAGING_READONLY:'' }), /must be 1/);
});
test('rejects invalid backend, wrong host, and production domain', () => {
  assert.throws(() => requireStagingReadOnlyEnv({ ...env, PW_STAGING_SUPABASE_URL:'https://crjdsxxkspvdwknrmijs.supabase.co' }), /exactly match/);
  assert.throws(() => requireStagingReadOnlyEnv({ ...env, PW_STAGING_ALLOWED_HOST:'other.vercel.app' }), /exactly equal/);
  assert.throws(() => requireStagingReadOnlyEnv({ ...env, PW_STAGING_BASE_URL:'https://app.vestryhub.com', PW_STAGING_ALLOWED_HOST:'app.vestryhub.com' }), /exact HTTPS Vercel preview origin/);
  assert.throws(() => requireStagingReadOnlyEnv({ ...env, PW_STAGING_BASE_URL:'https://vestry-hub.vercel.app', PW_STAGING_ALLOWED_HOST:'vestry-hub.vercel.app' }), /Production aliases/);
  assert.throws(() => requireStagingReadOnlyEnv({ ...env, PW_STAGING_BASE_URL:'https://vestry-hub-git-recovery-example.vercel.app/evil', PW_STAGING_ALLOWED_HOST:cfg.appHost }), /exact HTTPS Vercel preview origin/);
});
test('allows GET and HEAD and CORS preflights', () => {
  for(const method of ['GET','HEAD','OPTIONS']) assert.equal(classifyReadOnlyRequest(cfg.backend+'/rest/v1/tenants', method, cfg).allow, true);
});
test('blocks all write verbs to Supabase and third-party services', () => {
  for(const method of ['POST','PUT','PATCH','DELETE']) {
    assert.equal(classifyReadOnlyRequest(cfg.backend+'/rest/v1/tenants',method,cfg).allow,false);
    assert.equal(classifyReadOnlyRequest('https://analytics.example.com/api',method,cfg).allow,false);
  }
});
test('blocks requests to other Supabase projects and production domains', () => {
  assert.equal(classifyReadOnlyRequest('https://crjdsxxkspvdwknrmijs.supabase.co/rest/v1/tenants','GET',cfg).allow,false);
  assert.equal(classifyReadOnlyRequest('https://app.vestryhub.com/','GET',cfg).allow,false);
});
