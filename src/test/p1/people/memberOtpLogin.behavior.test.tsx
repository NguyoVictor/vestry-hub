import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MemberLoginPage from '@/pages/member/MemberLogin';

const mocks = vi.hoisted(() => ({
  send: vi.fn(), verify: vi.fn(), getUser: vi.fn(), invoke: vi.fn(),
  select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOtp: mocks.send,
      verifyOtp: mocks.verify,
      getUser: mocks.getUser,
    },
    functions: { invoke: mocks.invoke },
    from: () => ({ select: mocks.select }),
  },
}));
vi.mock('@/components/Threads', () => ({ default: () => <div data-testid="mock-threads" /> }));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, name: string) => (props: Record<string, any>) => {
      const { children, initial, animate, transition, exit, whileHover, whileTap, ...rest } = props;
      const Tag = name as keyof JSX.IntrinsicElements;
      return <Tag {...rest}>{children}</Tag>;
    },
  }),
}));
vi.mock('@/lib/tenantHost', () => ({
  currentTenantBaseDomain: () => 'vestryhub.com',
  tenantSlugMatchesHostname: () => true,
}));

function mount(path = '/member/login') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/member/login" element={<MemberLoginPage />} />
          <Route path="/member" element={<div data-testid="member-route">Signed in</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const future = new Date(Date.now() + 3600000).toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockResolvedValue({ data: { name: 'QA Church', logo: null }, error: null });
  mocks.send.mockResolvedValue({ error: null });
  mocks.verify.mockResolvedValue({ data: { session: { access_token: 'jwt-from-email-otp' } }, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: {
    email: 'member@example.test', email_confirmed_at: '2026-11-01T00:00:00Z',
  } }, error: null });
  mocks.invoke.mockResolvedValue({ data: {
    member: { id: 'member-a', first_name: 'QA', last_name: 'Member' },
    tenant: { id: 'tenant-a', slug: 'tenant-a', enabled_modules: {} },
    sessionToken: 'opaque-member-session', expiresAt: future,
  }, error: null });
});
afterEach(() => { cleanup(); localStorage.clear(); });

describe('Member login confirmed-email OTP flow', () => {
  it('prefilled and manually typed eight-character church codes trigger tenant branding lookup', async () => {
    const view = mount('/member/login?code=ABCD1234');
    await waitFor(() => expect(mocks.eq).toHaveBeenCalledWith('church_code', 'ABCD1234'));
    view.unmount();
    mocks.eq.mockClear();
    mount();
    fireEvent.change(screen.getByPlaceholderText('e.g. HOPE-2847'), { target: { value: 'TEST1234' } });
    await waitFor(() => expect(mocks.eq).toHaveBeenCalledWith('church_code', 'TEST1234'));
  });

  it('sends email OTP with account creation disabled before calling member-login', async () => {
    mount();
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'member@example.test' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. HOPE-2847'), { target: { value: 'ABCD1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith({
      email: 'member@example.test', options: { shouldCreateUser: false },
    }));
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Verify code & sign in' })).toBeInTheDocument();
  });

  it('verifies OTP and server identity before creating an opaque member session', async () => {
    mount();
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'member@example.test' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. HOPE-2847'), { target: { value: 'ABCD1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    const input = await screen.findByLabelText('Six-digit email verification code');
    fireEvent.change(input, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify code & sign in' }));
    expect(await screen.findByTestId('member-route')).toBeInTheDocument();
    expect(mocks.verify).toHaveBeenCalledWith({email: 'member@example.test',token:'123456',type:'email'});
    expect(mocks.getUser).toHaveBeenCalledWith('jwt-from-email-otp');
    expect(mocks.invoke).toHaveBeenCalledWith('member-login', {
      body: {churchCode:'ABCD1234'},
      headers: {Authorization:'Bearer jwt-from-email-otp'},
    });
    const session = JSON.parse(localStorage.getItem('member_session') || '{}');
    expect(session.tenantId).toBe('tenant-a');
    expect(session.sessionToken).toBe('opaque-member-session');
  });

  it('rejects missing verification and does not create a member session', async () => {
    mocks.verify.mockResolvedValue({data:{session:null},error:{message:'Invalid OTP'}});
    mount();
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'member@example.test' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. HOPE-2847'), { target: { value: 'ABCD1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    const input = await screen.findByLabelText('Six-digit email verification code');
    fireEvent.change(input, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify code & sign in' }));
    await waitFor(() => expect(mocks.verify).toHaveBeenCalled());
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(localStorage.getItem('member_session')).toBeNull();
  });
});
