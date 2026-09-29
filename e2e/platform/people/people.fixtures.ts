import { expect, test as base } from '@playwright/test';

export interface TenantFixture {
  id: string;
  slug: string;
}

export interface MemberFixture {
  id: string;
  tenantId: string;
  email: string;
}

interface PeopleFixtures {
  tenantA: TenantFixture;
  tenantB: TenantFixture;
  memberA: MemberFixture;
  memberB: MemberFixture;
}

export const test = base.extend<PeopleFixtures>({
  tenantA: async ({}, use) => {
    await use({ id: 'tenant-a', slug: 'tenant-a' });
  },
  tenantB: async ({}, use) => {
    await use({ id: 'tenant-b', slug: 'tenant-b' });
  },
  memberA: async ({}, use) => {
    await use({ id: 'member-a', tenantId: 'tenant-a', email: 'member-a@example.test' });
  },
  memberB: async ({}, use) => {
    await use({ id: 'member-b', tenantId: 'tenant-b', email: 'member-b@example.test' });
  },
});

export { expect };
