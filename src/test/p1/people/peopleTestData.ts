export interface PeopleTenantFixture {
  id: string;
  slug: string;
  name: string;
}

export interface PeopleMemberFixture {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  status: string;
  membership_status: string;
}

export function makeTenant(id = 'tenant-a'): PeopleTenantFixture {
  return {
    id,
    slug: id,
    name: `Church ${id}`,
  };
}

export function makeMember(
  overrides: Partial<PeopleMemberFixture> = {},
): PeopleMemberFixture {
  return {
    id: 'member-a',
    tenant_id: 'tenant-a',
    first_name: 'Test',
    last_name: 'Member',
    status: 'active',
    membership_status: 'Member',
    ...overrides,
  };
}

export function expectTenantScopedQuery(
  activeTenantId: string,
  row: { tenant_id: string },
): void {
  if (row.tenant_id !== activeTenantId) {
    throw new Error(`tenant mismatch: expected ${activeTenantId}, received ${row.tenant_id}`);
  }
}
