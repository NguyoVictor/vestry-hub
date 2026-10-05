# Phase 1 Stage 1 - Repository Secret Cleanup

## Scope

This checkpoint removes known committed credential material and browser-side server-secret usage without changing product behavior beyond routing the Bible statistics AI request through the existing Supabase Edge Function.

## Repository changes

- Added a sanitized `.env.example` containing placeholders only.
- Clarified that server and CI credentials must never use a `VITE_` prefix.
- Removed the browser-side `VITE_GROQ_API_KEY` dependency from Bible statistics and routed the request through `generate-ai-content`.
- Sanitized local tooling configuration that contained a literal third-party API credential.
- Removed a generated TestSprite runtime configuration file that contained a literal API credential and added ignore protection for it.
- Sanitized a legacy migration that embedded a service-role JWT.
- Removed API-key prefix/length logging from diagnostic Edge Functions.
- Corrected legacy documentation that recommended a browser-prefixed OpenAI key.

## Live-state verification

At the start of Stage 1, Supabase project `crjdsxxkspvdwknrmijs` was reported as ACTIVE_HEALTHY. The live migration list includes the seven P2/B migrations ending in `20260930113552_p2_subscription_product_index`.

No database schema migration is introduced by this checkpoint.

## Required credential rotation outside Git

Removing credentials from the current repository tree does not invalidate credentials already exposed in Git history. The following credential classes must be revoked/rotated if still valid:

1. Supabase management/access token previously committed in `.env.example`.
2. Supabase database password previously committed in `.env.example`.
3. Legacy Supabase service-role JWT embedded in an old cron migration.
4. Third-party/TestSprite API credential found in tooling/test configuration.

Rotation must be performed in the owning provider consoles. Do not paste replacement secrets into Git, chat, issue trackers, or build logs.

## Browser-safe values

The frontend may contain Supabase publishable/legacy anon credentials and Firebase web configuration. These identify projects and are intended for public clients; authorization must continue to rely on RLS and server-side authorization, not secrecy of these values.

## Verification

Static credential-pattern scan after cleanup:

- Supabase management-token pattern: clean
- Supabase secret-key pattern: clean
- generic `sk-` credential pattern: clean
- Groq `gsk_` pattern: clean
- Sentry auth-token pattern: clean
- JWT review: remaining frontend JWTs identify as `anon`; the committed `service_role` JWT was removed from the current tree
- Browser source contains no live `VITE_GROQ_API_KEY` dependency

Build verification could not be completed in the packaging environment because dependency installation timed out twice. Run the standard TypeScript/build gate locally before committing.

## Manual pre-commit gate

```bash
git diff --check
npx tsc --noEmit
npm run build
npm run test:security:secrets
npm run test:p2:contracts
npm run test:p2:vitest
```

Also review `git diff` to confirm no replacement secrets were introduced.
