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


it('revalidates hashed member sessions through the secure Edge Function', () => {
  const context = source('src/contexts/MemberPortalContext.tsx');
  const fn = source('supabase/functions/member-session-context/index.ts');

  expect(context).toContain('supabase.functions.invoke("member-session-context"');
  expect(context).toContain('sessionToken: session.sessionToken');
  // The raw opaque token must be SHA-256 hashed before comparison with the DB.
  expect(fn).toContain('crypto.subtle.digest("SHA-256", bytes)');
  expect(fn).toContain('const sessionTokenHash = await hashSessionToken(sessionToken)');
  expect(fn).toContain('.eq("member_id", memberId)');
  expect(fn).toContain('.eq("tenant_id", tenantId)');
  expect(fn).toContain('.eq("session_token", sessionTokenHash)');
  expect(fn).toContain('.gt("expires_at", new Date().toISOString())');
  // Member and church must match the validated session.
  expect(fn).toContain('.eq("tenant_id", session.tenant_id)');
  expect(fn).toContain('member.tenant_id !== session.tenant_id');
  expect(fn).toContain('String(member.status || "").trim().toLowerCase() !== "active"');
  expect(fn).toContain('String(member.membership_status || "").trim().toLowerCase() !== "active"');
  expect(context).toContain('member.tenant_id !== session.tenantId');
});


  it('captures member-portal module configuration at canonical login', () => {
    const loginFn = source('supabase/functions/member-login/index.ts');
    const loginPage = source('src/pages/member/MemberLogin.tsx');

    expect(loginFn).toContain('enabled_modules');
    expect(loginPage).toContain('enabledModules');
  });

  it('records public form registrations as form rather than admin registrations', () => {
    const registerFn = source('supabase/functions/member-register/index.ts');

    expect(registerFn).toMatch(/registration_source:\s*registrationSource === \"qr_scan\" \? \"qr_scan\" : \"form\"/);
  });
});
