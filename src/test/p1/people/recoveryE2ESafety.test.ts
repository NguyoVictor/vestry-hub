import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireDisposablePlatformTestEnv } from '../../../../e2e/platform/fixtures/safety';

const configure = () => {
  vi.stubEnv('PW_PLATFORM_TEST_ENV', 'disposable');
  vi.stubEnv('PW_TENANT_A_ID', 'qa-tenant-a');
  vi.stubEnv('PW_TENANT_B_ID', 'qa-tenant-b');
  vi.stubEnv('PW_BASE_URL', 'http://127.0.0.1:4173');
  vi.stubEnv('PW_QA_PROJECT_REF', 'disposable-test-ref');
  vi.stubEnv('PW_FRONTEND_SUPABASE_URL', 'https://disposable-test-ref.supabase.co');
};
afterEach(() => vi.unstubAllEnvs());

describe('Phase 0 platform E2E safety', () => {
  it('rejects shared staging even when labeled disposable', () => {
    configure();
    vi.stubEnv('PW_SUPABASE_URL', 'https://xwbajophstetbnnemsyq.supabase.co');
    vi.stubEnv('PW_QA_PROJECT_REF', 'xwbajophstetbnnemsyq');
    expect(() => requireDisposablePlatformTestEnv()).toThrow(/protected\/shared/i);
  });
  it('rejects the existing churchapp project', () => {
    configure();
    vi.stubEnv('PW_SUPABASE_URL', 'https://crjdsxxkspvdwknrmijs.supabase.co');
    vi.stubEnv('PW_QA_PROJECT_REF', 'crjdsxxkspvdwknrmijs');
    expect(() => requireDisposablePlatformTestEnv()).toThrow(/protected\/shared/i);
  });
  it('rejects an unspecified or malformed backend', () => {
    configure();
    vi.stubEnv('PW_SUPABASE_URL', '');
    expect(() => requireDisposablePlatformTestEnv()).toThrow(/PW_SUPABASE_URL/);
    vi.stubEnv('PW_SUPABASE_URL', 'http://disposable-test-ref.supabase.co');
    expect(() => requireDisposablePlatformTestEnv()).toThrow(/invalid PW_SUPABASE_URL/);
  });
  it('rejects a missing or mismatched explicit project ref', () => {
    configure();
    vi.stubEnv('PW_SUPABASE_URL', 'https://disposable-test-ref.supabase.co');
    vi.stubEnv('PW_QA_PROJECT_REF', 'wrong-ref');
    expect(() => requireDisposablePlatformTestEnv()).toThrow(/PW_QA_PROJECT_REF/);
  });
  it('rejects frontend backend mismatch', () => {
    configure();
    vi.stubEnv('PW_SUPABASE_URL', 'https://disposable-test-ref.supabase.co');
    vi.stubEnv('PW_FRONTEND_SUPABASE_URL', 'https://xwbajophstetbnnemsyq.supabase.co');
    expect(() => requireDisposablePlatformTestEnv()).toThrow(/do not match/);
  });
  it('rejects an arbitrary public app host without exact allowlisting', () => {
    configure();
    vi.stubEnv('PW_SUPABASE_URL', 'https://disposable-test-ref.supabase.co');
    vi.stubEnv('PW_BASE_URL', 'https://unknown-preview.vercel.app');
    expect(() => requireDisposablePlatformTestEnv()).toThrow(/PW_QA_APP_HOST/);
  });
  it('rejects production domains even if explicitly allowed', () => {
    configure();
    vi.stubEnv('PW_SUPABASE_URL', 'https://disposable-test-ref.supabase.co');
    vi.stubEnv('PW_BASE_URL', 'https://app.vestryhub.com');
    vi.stubEnv('PW_QA_APP_HOST', 'app.vestryhub.com');
    expect(() => requireDisposablePlatformTestEnv()).toThrow(/production vestryhub.com/);
  });
  it('accepts a confirmed disposable remote project with two tenants', () => {
    configure();
    vi.stubEnv('PW_SUPABASE_URL', 'https://disposable-test-ref.supabase.co');
    expect(requireDisposablePlatformTestEnv()).toMatchObject({ disposable: true, tenantAId: 'qa-tenant-a', tenantBId: 'qa-tenant-b' });
  });
  it('supports loopback-only local Supabase QA', () => {
    configure();
    vi.stubEnv('PW_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('PW_FRONTEND_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('PW_QA_PROJECT_REF', 'local');
    expect(requireDisposablePlatformTestEnv().disposable).toBe(true);
  });
});
