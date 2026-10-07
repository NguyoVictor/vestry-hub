# Phase 1 Stage 8 - Supabase Security Closeout

**Status: COMPLETE (with explicit platform-level exceptions recorded below).**

## Baseline

Repository baseline: `p1-closeout-stages-1-7` at commit `6b7d8bef99dbe8bf40cf13b320f38ba00ad8dcf4`.
Supabase project: `crjdsxxkspvdwknrmijs`.

## Completed live actions

1. Deployed `member-session-context` from the committed Stage 3 source.
   - Live status: ACTIVE, version 1.
   - `verify_jwt = false` is intentional because the Member Portal uses an opaque member session token rather than a Supabase Auth JWT.
   - The function validates member ID, tenant ID, session token, expiry, member status and tenant existence server-side using the service role.
2. Applied migration `20261005110415_p1_supabase_security_closeout`.
   - Explicitly revoked browser/PUBLIC access from five server-only tables.
   - Explicitly preserved service-role CRUD access to those tables.
   - Revoked direct browser/PUBLIC execution of four private SECURITY DEFINER trigger functions.

## Live verification

- Public tables inspected: 172.
- Public tables without RLS: 0.
- Suspicious policies using deprecated `auth.role()` or trivial authenticated `true` conditions: 0.
- Public views discovered: none.
- The five no-policy tables are intentionally server-only and have no anon/authenticated/PUBLIC table privileges:
  - `automation_settings`
  - `member_login_challenges`
  - `staff_invitations`
  - `tenant_payment_credentials`
  - `webhook_events`
- Public SECURITY DEFINER payment/queue functions reviewed in this pass are explicitly service-role restricted.
- `member-session-context` is live.

## Remaining advisor findings and disposition

### RLS enabled with no policy - accepted by design

The five server-only tables above intentionally have RLS enabled and no browser policies. The Data API roles have no table privileges. Adding permissive policies purely to silence the advisor would weaken the intended server-only model.

### `pg_net` extension recorded in `public` - deferred / infrastructure-managed

The live extension is `pg_net 0.19.5`, reports `extrelocatable = false`, and its operational objects live under the `net` schema. The project uses `pg_net` with scheduled Edge Function invocation. Moving it requires drop/recreate rather than `ALTER EXTENSION ... SET SCHEMA`, which can disrupt extension state and scheduled HTTP behavior. No destructive production change was performed in Stage 8.

This finding is accepted for Phase 1 unless a controlled maintenance window is used to recreate `pg_net` according to current Supabase guidance and retest cron-driven queue workers.

### Leaked Password Protection disabled - accepted platform-level manual control

Supabase Security Advisor still reports Auth leaked-password protection disabled. The available connected tools do not expose a safe Auth configuration mutation for this setting.

The connected tools do not expose a safe Auth configuration mutation for this setting. It is therefore recorded as an explicit account-level exception for Stage 8 rather than silently treated as resolved. Before final Phase 1 production acceptance, enable it in Supabase Dashboard under Auth password/security settings and rerun the Security Advisor.

## Repository verification

After overlaying this milestone into the repository, run:

```bash
node scripts/check-stage8-security.mjs
npm run test:security:secrets
npm run test:p2:contracts
npm run test:p2:vitest
npx tsc --noEmit
npm run build
git diff --check
```

Then rerun the live Supabase Security Advisor after enabling leaked-password protection.

## Completion disposition

Stage 8 is closed because the code/database security controls are applied and verified: the migration matches live version `20261005110415`, `member-session-context` is ACTIVE, the Stage 8 repository contract passes, all public tables have RLS, and the server-only privilege model is explicit. Two platform-level advisor warnings remain deliberately visible: non-relocatable `pg_net` is accepted for Phase 1 pending a maintenance-window recreation, and leaked-password protection is a Dashboard-only Auth control to enable before final production acceptance.
