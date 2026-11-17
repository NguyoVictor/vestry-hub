import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireDisposablePlatformTestEnv } from '../../../../e2e/platform/fixtures/safety';

const configure = () => {
  vi.stubEnv('PW_PLATFORM_TEST_ENV', 'disposable');
  vi.stubEnv('PW_TENANT_A_ID', 'qa-tenant-a');
  vi.stubEnv('PW_TENANT_B_ID', 'qa-tenant-b');
  vi.stubEnv('PW_BASE_URL', 'http://127.0.0.1:4173');
};

afterEach(() => vi.unstubAllEnvs());

describe('recovery E2E environment safety', () => {
  it('rejects the shared staging backend even if mislabeled disposable', () => {
    configure();
    vi.stubEnv('PW_SUPABASE_URL', 'https://xwbajophstetbnnemsyq.supabase.co');
    expect(() => requireDisposablePlatformTestEnv()).toThrow(/shared Vestry Hub staging/i);
  });

  it('rejects an unspecified backend', () => {
    configure();
    vi.stubEnv('PW_SUPABASE_URL', '');
    expect(() => requireDisposablePlatformTestEnv()).toThrow(/PW_SUPABASE_URL/);
  });

  it('rejects malformed or non-HTTPS backend URLs', () => {
    configure();
    vi.stubEnv('PW_SUPABASE_URL', 'http://otherproject.supabase.co');
    expect(() => requireDisposablePlatformTestEnv()).toThrow(/invalid PW_SUPABASE_URL/);
  });

  it('accepts a distinct disposable project with separate test tenant IDs', () => {
    configure();
    vi.stubEnv('PW_SUPABASE_URL', 'https://otherproject.supabase.co');
    expect(requireDisposablePlatformTestEnv()).toMatchObject({
      disposable: true,
      tenantAId: 'qa-tenant-a',
      tenantBId: 'qa-tenant-b',
    });
  });
});
