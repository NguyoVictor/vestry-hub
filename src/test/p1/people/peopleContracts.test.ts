import { describe, expect, it } from 'vitest';
import { expectTenantScopedQuery, makeMember, makeTenant } from './peopleTestData';

describe('P1 People tenant contract', () => {
  it('rejects records whose tenant_id differs from the active tenant', () => {
    const activeTenant = makeTenant('tenant-a');
    const foreignMember = makeMember({ tenant_id: 'tenant-b' });

    expect(() => expectTenantScopedQuery(activeTenant.id, foreignMember)).toThrow(/tenant/i);
  });

  it('accepts records that belong to the active tenant', () => {
    const activeTenant = makeTenant('tenant-a');
    const member = makeMember({ tenant_id: activeTenant.id });

    expect(() => expectTenantScopedQuery(activeTenant.id, member)).not.toThrow();
  });
});
