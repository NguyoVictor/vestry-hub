import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MemberPortalProvider, useMemberPortal } from '@/contexts/MemberPortalContext';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
vi.mock('@/lib/tenantHost', () => ({
  currentTenantBaseDomain: () => 'vestryhub.com',
  tenantSlugMatchesHostname: () => true,
}));

const session = {
  memberId: 'member-a', tenantId: 'tenant-a', sessionToken: 'opaque-token-example',
  expiresAt: '2099-01-01T00:00:00Z',
};
const member = {
  id: 'member-a', tenant_id: 'tenant-a', first_name: 'QA', last_name: 'Member',
  email: 'qa@example.test', status: 'Active', membership_status: 'Active',
  created_at: '2026-01-01T00:00:00Z',
};
const tenant = {
  id: 'tenant-a', slug: 'qa-church-a', name: 'QA Church A',
  church_code: 'QA-CODE', enabled_modules: {}, logo: null,
};

function Probe() {
  const data = useMemberPortal();
  return <div data-testid="member-session">{data.memberId}:{data.tenantId}</div>;
}
function mount() {
  return render(
    <MemoryRouter initialEntries={['/member']}>
      <Routes>
        <Route path="/member/login" element={<div data-testid="login-page">Login required</div>} />
        <Route path="/member" element={<MemberPortalProvider><Probe /></MemberPortalProvider>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('member_session', JSON.stringify(session));
});
afterEach(() => { cleanup(); localStorage.clear(); });

describe('member portal session behavior', () => {
  it('sends the opaque token to the server before showing member data', async () => {
    invoke.mockResolvedValue({ data: { member, tenant, expiresAt: session.expiresAt }, error: null });
    mount();
    expect(await screen.findByTestId('member-session')).toHaveTextContent('member-a:tenant-a');
    expect(invoke).toHaveBeenCalledWith('member-session-context', {
      body: { memberId: 'member-a', tenantId: 'tenant-a', sessionToken: session.sessionToken },
    });
  });

  it('clears rejected sessions rather than rendering member data', async () => {
    invoke.mockResolvedValue({ data: { error: 'invalid_session' }, error: null });
    mount();
    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
    expect(localStorage.getItem('member_session')).toBeNull();
    expect(screen.queryByTestId('member-session')).toBeNull();
  });

  it('rejects a server response containing a member from a different tenant', async () => {
    invoke.mockResolvedValue({ data: { member: { ...member, tenant_id: 'tenant-b' }, tenant, expiresAt: session.expiresAt }, error: null });
    mount();
    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
    expect(localStorage.getItem('member_session')).toBeNull();
  });

  it('does not contact the backend for expired locally cached sessions', async () => {
    localStorage.setItem('member_session', JSON.stringify({ ...session, expiresAt: '2020-01-01T00:00:00Z' }));
    mount();
    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
    await waitFor(() => expect(invoke).not.toHaveBeenCalled());
  });
});
