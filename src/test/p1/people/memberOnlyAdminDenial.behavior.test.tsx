// Finding 1, section 7 / acceptance: "A member cannot access the Admin Portal
// simply because their Auth identity exists." Regression for the 20 Nov staging
// canary, where a Member Portal identity opening /dashboard was offered church
// creation (onboarding). The DB already refuses the writes; the UI must not
// offer them either.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { isMemberOnlyIdentity } from '@/lib/memberOnlyIdentity';

const mocks = vi.hoisted(() => ({
  profile: null as null | { tenant_id: string },
  memberships: [] as unknown[],
  membershipError: null as unknown,
}));

vi.mock('@/integrations/supabase/client', () => {
  const chain = (table: string) => {
    const q: Record<string, unknown> = {};
    const self = () => q;
    q.select = self; q.eq = self; q.update = self; q.then = undefined;
    q.limit = () => Promise.resolve({ data: table === 'member_auth_memberships' ? mocks.memberships : [], error: table === 'member_auth_memberships' ? mocks.membershipError : null });
    q.maybeSingle = () => Promise.resolve({ data: table === 'users' ? mocks.profile : null, error: null });
    return q;
  };
  return {
    supabase: {
      auth: {
        getSession: () => Promise.resolve({ data: { session: { user: { id: 'auth-member-1', email: 'member@example.test' } } } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      },
      from: (table: string) => chain(table),
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
      removeChannel: () => undefined,
    },
  };
});

async function mountGuard() {
  const { AuthGuard } = await import('@/components/layout/AuthGuard');
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<AuthGuard />}>
          <Route path="/dashboard" element={<div data-testid="admin-dashboard" />} />
        </Route>
        <Route path="/member" element={<div data-testid="member-portal" />} />
        <Route path="/onboarding" element={<div data-testid="church-onboarding" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Finding 1: member identities never reach Admin Portal onboarding', () => {
  beforeEach(() => { mocks.profile = null; mocks.memberships = []; mocks.membershipError = null; });
  afterEach(() => cleanup());

  it('a Member Portal identity without a staff profile is sent to the Member Portal, not onboarding', async () => {
    mocks.memberships = [{ id: 'link-1' }];
    await mountGuard();
    expect(await screen.findByTestId('member-portal')).toBeInTheDocument();
    expect(screen.queryByTestId('church-onboarding')).toBeNull();
    expect(screen.queryByTestId('admin-dashboard')).toBeNull();
  });

  it('a brand-new identity with no profile and no member link still goes to onboarding', async () => {
    await mountGuard();
    expect(await screen.findByTestId('church-onboarding')).toBeInTheDocument();
  });

  it('isMemberOnlyIdentity fails closed when membership cannot be checked', async () => {
    const client = { from: () => ({ select: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: null, error: { code: 'x' } }) }) }) }) };
    expect(await isMemberOnlyIdentity(client as never, 'u1')).toBe(true);
    const none = { from: () => ({ select: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }) };
    expect(await isMemberOnlyIdentity(none as never, 'u1')).toBe(false);
    expect(await isMemberOnlyIdentity(none as never, '')).toBe(false);
  });
});
