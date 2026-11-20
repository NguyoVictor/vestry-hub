# Phase 11 — Full staging acceptance (20 Nov 2026)

**Branch:** `recovery/system-stabilization-2026-11` · **Preview under test:** `vestry-fhbey7is9` = `54a3732` (+ test-only/baseline commit) · **Staging:** `xwbajophstetbnnemsyq` only.

## 1. Results summary

| Track | Result |
|---|---|
| Unit / contract tests (P1 Vitest) | **161/161** (1 timeout under heavy machine load in the first run; clean on rerun) |
| Offline DB harnesses on real migration SQL (PGlite) | **37/37** — staff binding 12, member provisioning 11, request types 6, quiz scoring 4, budget 4 |
| Policy unit tests (update-user-role, member provisioning, SSRF guard) | **8/8** |
| Member-auth + staff-invite contracts | **PASS** (12 + 11 node tests) |
| Hard-coded project / client source guards | **PASS** |
| Full app typecheck ratchet | **PASS — 864 errors vs 876 baseline (−12)**; baseline lowered to lock the gains |
| Production build | **PASS** (each phase) |
| Migration parity (repo ↔ staging) | **up to date** (dry run: nothing to push) |
| Cross-church isolation matrix (member A, staff A, admin A, member B × **183** tenant tables) | **0 leaking tables** for all four; positive controls see own-church data |
| RLS audit | 0 tables with RLS off; 18 locked tables = intended server-only list; 0 tautological policies; 7 `true` policies = reviewed public reads / lead-form insert |
| Supabase security advisor | 0 ERROR. WARN: 25 search_path (low, queued T11); 1 anon definer = `report_failed_sign_in` (intended, pre-login); 7 authenticated definer = guarded analytics wrappers + sign-in recorders (intended); leaked-password protection (needs Pro → Production) |
| **Browser regression (all staging canaries, Phases 3–10)** | **41/41 PASS** — 31 in the full run; 6 failed only under machine load (2-min timeouts while a full typecheck ran) and passed on an idle rerun — one needed a rerun-safe assertion fix (tax rate check scoped to its own run); 4 dependent tests skipped by those failures then passed |
| Tenants / data invariants | 12 tenants throughout; all test records tagged `QA-CANARY-…` in QA Church A (Church B used only for denial checks) |

## 2. Findings coverage (manual testing report, 27 findings)

| Status | Findings |
|---|---|
| **Accepted by user** (20) | 1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 17, 18, 19, 20 (non-AI), 21, 22, 23, 24, 25, 26 |
| **Staging pass, awaiting sign-off** (1) | 27 (+ Phase 10 product items: budget utilisation, payroll actions, Branding removal) |
| **Deferred — out of launch scope** (6) | 10, 11 (AI), 12, 13, 15 (media), 16 (livestream) — see `DEFERRED_BACKLOG.md` |
| Product decisions | Church Studio removed (accepted); Branding removed (pending sign-off with Phase 10) |

## 3. Not covered by automation → manual UAT checklist for the user (≈20 min)

Use the Preview link and real QA accounts. Tick each:

1. **Member portal (OTP):** sign in as a Church A member with the emailed code → Home loads; open Training → the published `QA-CANARY … Course` is listed; open it → Enroll → open a lesson → Mark complete → progress shows 50%.
2. **Member portal isolation:** sign in as a Church B member → no Church A course/requests visible.
3. **Staff invite (end to end):** Church A admin invites a new staff email → email arrives → set password → staff lands in Church A only.
4. **Security Centre:** type a wrong password 3× for a staff account → Security Centre shows "Failed sign-in" and "Multiple failed sign-in attempts".
5. **Spot-check each fixed area once** (create → reload → still there): Family, Visitor, Fellowship member, Member request (Start/Resolve), Board meeting, Facility with thumbnail, Incident with attachment, General Settings logo, Giving category, Store category, Asset release approve, Discipleship resource, Outreach activity, Course publish, Payout, Chart of accounts + journal entry, Invoice paid, Expense approve, Budget expenditure + reverse, Payroll deactivate, Tax rate.
6. **Deferred areas hidden:** AI Tools, Church Media, Sermons, Livestreaming, Church Studio, Branding are not in the menus.

## 4. Open before launch (from `PRODUCTION_READINESS.md` / `DEFERRED_BACKLOG.md`)

- **Payments (IntaSend)** — blocked on sandbox keys (R2).
- **Gate A (merge to `main`)** — needs: user UAT sign-off; R-1 Vercel env split (Production must NOT point at staging); Production project confirmed.
- **Gate B (Production)** — Supabase Pro + backup + restore test (R1/B1), migration rehearsal on a Production copy (B2) incl. the zero-policy inventory (B8) and isolation matrix (B9), member portal link backfill (B3), Production SMTP + DNS (R3/R4), redirect allowlists (R7), function deploy list = `DEPLOYED_REVIEWED` (D4), leaked-password protection (D5), monitoring keys (R6).
