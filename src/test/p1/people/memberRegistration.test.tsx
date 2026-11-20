import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('P1 member registration and session contract', () => {
  it('routes the legacy registration page through member-register instead of direct member inserts', () => {
    const registration = source('src/pages/MemberRegistration.tsx');
    expect(registration).toContain('member-register');
    expect(registration).not.toMatch(/from\([^)]*MEMBERS[^)]*\)\.insert/);
    expect(registration).not.toContain('status: "Active"');
  });

  it('sends the opaque member session token on Supabase requests', () => {
    const client = source('src/integrations/supabase/client.ts');
    expect(client).toContain('x-member-session');
    expect(client).toContain('sessionToken');
    expect(client).toContain('/rest/v1/');
  });

  it('revalidates opaque sessions server-side against their member, tenant, and expiry', () => {
    const context = source('src/contexts/MemberPortalContext.tsx');
    const server = source('supabase/functions/member-session-context/index.ts');
    expect(context).toContain('supabase.functions.invoke("member-session-context"');
    expect(context).toContain('sessionToken: session.sessionToken');
    expect(context).toContain('member.tenant_id !== session.tenantId');
    expect(context).toContain('localStorage.removeItem("member_session")');
    expect(server).toContain('.from("member_sessions")');
    expect(server).toContain('hashSessionToken(sessionToken)');
    expect(server).toContain('.eq("session_token", sessionTokenHash)');
    expect(server).toContain('.eq("tenant_id", tenantId)');
    expect(server).toContain('.gt("expires_at", new Date().toISOString())');
    // Manual report Finding 1: status / membership_status must NOT block an
    // otherwise valid member; the provisioned identity link is required instead.
    expect(server).not.toContain('String(member.membership_status || "").trim().toLowerCase() !== "active"');
    expect(server).not.toContain('String(member.status || "").trim().toLowerCase() !== "active"');
    expect(server).toContain('.from("member_auth_memberships")');
  });

  it('requires verified identity for member login and captures canonical modules', () => {
    const loginFn = source('supabase/functions/member-login/index.ts');
    const loginPage = source('src/pages/member/MemberLogin.tsx');
    const otp = source('src/lib/memberOtpLogin.ts');
    expect(loginFn).toContain('authClient.auth.getUser(jwt)');
    expect(loginFn).toContain('sessionTokenHash');
    expect(loginFn).toContain('enabled_modules');
    expect(loginPage).toContain('enabledModules');
    // OTP is requested via the server-side member + church code pre-check,
    // which calls signInWithOtp with account creation disabled.
    expect(otp).toContain("functions.invoke('member-otp-request'");
    expect(readFileSync(resolve(process.cwd(), 'supabase/functions/member-otp-request/index.ts'), 'utf8')).toContain('shouldCreateUser: false');
    expect(otp).toContain("type: 'email'");
  });

  it('records public form registrations as form rather than admin registrations', () => {
    const registerFn = source('supabase/functions/member-register/index.ts');
    // members_registration_source_check allows 'web_form' (not 'form').
    expect(registerFn).toMatch(/registration_source:\s*registrationSource === \"qr_scan\" \? \"qr_scan\" : \"web_form\"/);
  });
});
