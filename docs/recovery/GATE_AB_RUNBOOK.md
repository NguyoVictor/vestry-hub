# Gate A / Gate B — release runbook (draft for approval)

**Status:** DRAFT, prepared read-only on 2026-11-21. **Nothing in this document has been executed.** Every step marked 🔒 needs explicit user approval at the time it is run.
**Branch to release:** `recovery/system-stabilization-2026-11` (HEAD at time of writing `1cdfa0f`, CI green).
**Today's live site:** `vestryhub.com`, `app.vestryhub.com` (+ `www.`, `*.vestryhub.com`, `vestry-hub.vercel.app`) serve a Production build of `main` @ `99a6318`.

---

## 1. Read-only findings (2026-11-21)

| # | Finding | Evidence | Consequence |
|---|---|---|---|
| F-A1 | `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are ONE value scoped to **Production + Preview**, and it is **staging** (`xwbajophstetbnnemsyq`) | `vercel env ls` (names/scopes only) | Merging the recovery branch unchanged would point the live domains at the staging database. **Must split before Gate A.** |
| F-A2 | `main` hard-codes churchapp (`crjdsxxkspvdwknrmijs`) in `src/integrations/supabase/client.ts`, but `src/pages/settings/PaymentsPage.tsx:35` builds the payment **webhook / callback URL from `VITE_SUPABASE_URL`** → on the live site that URL points at **staging** | live bundle `index-BefjXnLt.js` contains BOTH project URLs; `git grep` on `main` | **Live issue today:** any church that copied the "Callback URL" from Settings → Payments into Daraja/PayHero is sending live payment callbacks to staging, where `payment-webhook` is NOT deployed → those callbacks are lost. **User to check** which churches configured payments on the live site. Fixed by the recovery branch (all URLs env-scoped) + the split. |
| F-A3 | `vercel.json` has no build-skip rule → **merging to `main` triggers an immediate Production deployment** | `vercel.json` | Gate A must be a controlled release (§3), not a plain merge. |
| F-A4 | The new frontend and the new database rules are **not backward-compatible with each other's old versions** (e.g. old `main` signs in with `tenants select("*")`, which the Phase 5 column grants deliberately block; new frontend needs the new tables/columns) | Phases 4–10 | DB migrations and frontend must go live **in the same window** (§3). |
| F-A5 | Production backend is **churchapp** (`crjdsxxkspvdwknrmijs`) — **confirmed by the user 23 Nov 2026** | user | Still no change to Production without approval per step. A7 check: `docs/recovery/gate-b/a7_live_payment_callbacks_readonly.sql` (read-only). |
| F-A6 | Legacy env vars `VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_PROJECT_ID` exist (Production+Preview) but are not read by the recovery code | `grep` | Leave as is; remove after launch (cleanup). |

## 2. Vercel environment split (🔒 approval at Gate A)

Target state:

| Variable | Production | Preview |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<PROD_REF>.supabase.co` | `https://xwbajophstetbnnemsyq.supabase.co` (staging) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production project's publishable key | staging publishable key |
| `VITE_TENANT_BASE_DOMAIN` | unset (defaults to `vestryhub.com`) or `vestryhub.com` | unset |
| `VITE_FEATURE_*` | **unset** (deferred areas stay hidden) | unset |
| `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` | Production monitoring keys (R6) | optional |

Steps (Vercel dashboard → Project → Settings → Environment Variables, or CLI):
1. Edit the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` entries → untick **Production** (keep Preview = staging).
2. Add new `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` entries scoped to **Production only** with the Production project values.
3. Do NOT redeploy Production yet (env changes only apply to new builds).
4. Verify: `vercel env ls` shows separate Production and Preview rows; a new Preview build still references only staging.

## 3. Coordinated release (Gate A merge + Gate B database in ONE window)

Pre-requisites (all ✅ before the window): user UAT sign-off · Production confirmed (F-A5) · Supabase **Pro** on Production + **backup taken and restore-tested** (R1/B1) · rehearsal on a Production **copy** passed (§4) · Production SMTP + DNS (R3/R4) · redirect allowlists (R7) · IntaSend live keys if payments ship at launch.

Window plan (≈1–2 h, low-traffic time):
1. 🔒 Announce maintenance; take a fresh Production backup (PITR point noted).
2. 🔒 Vercel: add a temporary "Ignored Build Step" (or disable Git auto-deploy for `main`) so the merge does not deploy on its own.
3. 🔒 Merge `recovery/system-stabilization-2026-11` → `main` (single PR, CI green, tag `release-2026-11-24`).
4. 🔒 Build a Production deployment **without** assigning domains: `vercel deploy --prod --skip-domain` → note URL + SHA.
5. 🔒 Run the database pre-flight (§4, read-only) against Production; stop if any check fails.
6. 🔒 Apply the recovery migrations to Production in order (`supabase db push` against the Production link, dry run first; must list exactly the expected files).
7. 🔒 Deploy exactly the reviewed functions (`DEPLOYED_REVIEWED` in `src/test/p1/launchScope.test.ts`) with Production secrets set first (`STAFF_INVITATION_REDIRECT_ORIGIN`, `MEMBER_AUTH_REDIRECT_ORIGINS`, IntaSend live keys if applicable).
8. Run the post-flight (§4) + member portal link backfill (B3) dry run → 🔒 execute.
9. 🔒 Promote the step-4 deployment to the live domains (`vercel promote <url>`).
10. Smoke test on the live domains (admin login, member OTP, one write per core area, isolation spot check); watch Sentry/PostHog/logs for 60 min.
11. Re-enable normal auto-deploy settings; close the window.

Rollback: (a) frontend — `vercel promote` the previous Production deployment (`main` @ `99a6318` build); (b) database — trigger-only rollback SQL in `docs/recovery/rollback/` for function bodies; for schema/policy problems restore from the step-1 backup / PITR (data written during the window would need reconciliation — keep the window short).

## 4. Database pre-flight / post-flight (read-only)

Script: `docs/recovery/gate-b/preflight_production_readonly.sql` — run with a read-only connection against the target project. It reports: migration history vs the recovery list, presence of the guarded trigger bodies the patches expect, tables with RLS enabled and zero policies (B8), always-true / tautological policies, SECURITY DEFINER functions executable by anon, enum values, existence of tables the recovery creates, row counts for tables touched (to size backfills), and member portal link coverage (B3).
