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

  it('revalidates the member against both the stored tenant and approval state', () => {
    const context = source('src/contexts/MemberPortalContext.tsx');

    expect(context).toContain('.eq("tenant_id", session.tenantId)');
    expect(context).toMatch(/membership_status[\s\S]*Pending Approval/);
    expect(context).toMatch(/status[\s\S]*inactive/);
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
