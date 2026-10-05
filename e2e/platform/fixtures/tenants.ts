import { requireDisposablePlatformTestEnv } from './safety';
export const getPlatformTenants = () => {
  const cfg = requireDisposablePlatformTestEnv();
  return {
    tenantA: { id: cfg.tenantAId, slug: process.env.PW_TENANT_A_SLUG || 'tenant-a-e2e' },
    tenantB: { id: cfg.tenantBId, slug: process.env.PW_TENANT_B_SLUG || 'tenant-b-e2e' },
  };
};
