# Vestry Hub recovery: Phase 1B.1 - verified member authentication

**Target Git branch:** `recovery/system-stabilization-2026-11` only.
**Database:** Vestry Hub staging `xwbajophstetbnnemsyq`.
**Scope:** code reconciliation and offline tests. **No cloud mutations, account creation, or email sends occur during installation or the offline checks.**

## Why the change is needed

The active staging `member-login` Edge Function (version 5, inspected 2026-11-18)
requires a JWT from a verified Supabase Auth email identity; it does not accept an
email plus church code as authentication. The committed frontend previously sent
only email + church code, and committed Edge Function source was an unsafe older
implementation. The deployed `member-session-context` uses hashed member session
tokens while the committed code tested raw tokens. The active `member-logout`
function also needs to be represented in the repository.

## Changes in this batch

- `src/lib/memberOtpLogin.ts`: existing-user-only OTP request, OTP verification,
  `auth.getUser(accessToken)` identity check, explicit verified JWT to
  `member-login`, and verified payload validation.
- `src/pages/member/MemberLogin.tsx`: two-step email OTP flow; no session before
  backend approval; 4-32 character church-code support; debounced branding lookups
  including 8-character staging church codes; guarded tenant host check.
- `supabase/functions/member-login/index.ts`: copies the **deployed security
  behavior** into source control; JWT and confirmed-identity validation, tenant
  membership check and SHA-256 opaque-token storage. It is not automatically deployed.
- `supabase/functions/member-session-context/index.ts`: hashed-token validation,
  tenant and active-membership checks; mirrors active staging behavior.
- `supabase/functions/member-logout/index.ts`: source-controlled, token-authenticated
  logout revocation; mirrors active staging behavior.
- `supabase/config.toml`: explicit `member-login` JWT enforcement. Its older
  local `project_id` label must **not** be used as proof of the linked remote;
  verify remote project ref before any future Edge Function deployment.
- `src/test/p1/people/memberRegistration.test.tsx`: corrects stale assertions
  that expected raw bearer-token storage.
- `src/test/p1/people/memberOtpLogin.behavior.test.tsx`: React component tests
  for OTP submission, verified login, and refused login (run with local Vitest).
- `scripts/recovery/check-member-auth-contract.mjs` plus
  `scripts/recovery/member-auth-contract.node.test.mjs`: zero-network safety
  checker and 11 behavior tests.
- `.github/workflows/p1b1-member-auth.yml`: the above offline checks on the
  recovery branch; does not access staging credentials or run Playwright writes.

## Supabase Auth email template prerequisite - check before manual testing

According to Supabase Passwordless Email Sign-in documentation,
`supabase.auth.signInWithOtp()` sends a **magic link by default**. To actually
send a six-digit *code* that the new UI asks for, the project's
**Authentication > Email Templates > Magic Link** template must contain
`{{ .Token }}` rather than a link-only template. Example (illustrative only):

```
Your Vestry Hub sign-in code: {{ .Token }}
```

Changing this template affects **all email OTP/magic-link users on this
Supabase project**. Do not change it without a reviewed communication impact
assessment and explicit authorization. It was not changed by this ZIP.

The identity must already exist in `auth.users` with a confirmed email;
`shouldCreateUser: false` deliberately prevents silently creating accounts.
Both Vestry Staging Church A and B currently have super-admin records also
present in the members table, but no independent member-only identities.
That is a separate readiness dependency for Phase 1B.2. Never use actual
production users for QA.

## Install in existing Linux repo, Python 3.8 compatible

```
cd "$HOME/Desktop/Mine/Vestry Code/Repair batch/vestry-hub"
mkdir -p "$HOME/Downloads/vestry-phase1b1"
unzip -q "$HOME/Downloads/vestry-hub-phase1b1-member-auth.zip" -d "$HOME/Downloads/vestry-phase1b1"
python3 "$HOME/Downloads/vestry-phase1b1/install.py" --check .
# Only continue when conflicts=0; otherwise stop and inspect local edits.
python3 "$HOME/Downloads/vestry-phase1b1/install.py" --apply .
```

The installer checks **every** file first and never overwrites unexpected
uncommitted changes. It backs up replaced files in Git-ignored `.recovery/`.
It does not make Git commits, push, send email, or contact Supabase.

## Required local checks BEFORE committing

```
node scripts/recovery/check-member-auth-contract.mjs
node --experimental-strip-types --test scripts/recovery/member-auth-contract.node.test.mjs
npx vitest run src/test/p1/people/memberOtpLogin.behavior.test.tsx src/test/p1/people/memberRegistration.test.tsx
npm run test:p1:people
npx tsc --noEmit
npm run build
git diff --check
```

React/Vitest and Vite require complete local node_modules. Unlike these local
checks, **do not** run `vc env run` for OTP tests on shared staging, because
requesting and verifying OTPs sends email/creates Auth sessions and records.
The existing staging read-only smoke suite must remain read-only.

## Stage exactly these files; inspect any existing changes first

```
git add \
  .github/workflows/p1b1-member-auth.yml \
  docs/recovery/PHASE1B1_MEMBER_AUTH_RECONCILIATION.md \
  src/lib/memberOtpLogin.ts \
  src/pages/member/MemberLogin.tsx \
  src/test/p1/people/memberRegistration.test.tsx \
  src/test/p1/people/memberOtpLogin.behavior.test.tsx \
  supabase/functions/member-login/index.ts \
  supabase/functions/member-session-context/index.ts \
  supabase/functions/member-logout/index.ts \
  supabase/config.toml \
  scripts/recovery/check-member-auth-contract.mjs \
  scripts/recovery/member-auth-contract.node.test.mjs

git diff --cached --check
git diff --cached --name-status
git diff --cached -- supabase/config.toml
# Confirm no unrelated auth InviteCallback files, SQL migrations, temp files,
# report files or old ZIPs were staged.
git commit -m "fix(recovery): reconcile verified member OTP login and hashed sessions"
git push origin recovery/system-stabilization-2026-11
```

No changes to `main` or Production. A new Vercel **Preview** should be built
on push. The existing read-only Playwright tests may be repeated on its exact
Ready URL with their original mandatory safeguards. They do not exercise OTP.

## Manual/connected follow-up and the next batch

1. Verify the email OTP template contains a six-digit `.Token` code (approval
   before changing). Verify SMTP delivery/rate limits and allowed sender.
2. Set up **approved, dedicated** member-only accounts for Church A and B;
   separately validate staff and administrator roles in Phase 1B.2. No accounts
   are created by this ZIP.
3. After those gates and explicit staging write authorization, manually test:
   request code -> receive email -> verify OTP -> verified JWT -> tenant
   membership -> opaque session -> refresh -> logout -> rejected cross-tenant.
   Never publish OTPs, JWTs, emails, or session tokens in test artifacts.
4. Stage QA writes behind a new, explicit allowlist policy; never turn off
   the shared-staging Playwright write guard to make a test pass.
5. Restore rehearsal, Storage object backups and Production protection remain
   release gates.

**Verification evidence as of packaging:** 11/11 dependency-free tests passed,
source-contract checker passed, and `tsc --noEmit` passed against the recovered
repository tree. The extracted backup lacks complete Vitest/Vite runtime
files, so the React suite and Vite build have **not** been verified here.

Reference: https://supabase.com/docs/guides/auth/auth-email-passwordless
