# Phase 1 Stage 11C - Media & Growth Closeout

## Completed
- AI generation now requires an authenticated active staff actor in the requested tenant.
- Per-user/per-tenant AI rate limiting and atomic usage reservation/release are live.
- Canva access/refresh tokens are server-only; Graphics Studio uses the authenticated `canva-api` Edge Function for status, design listing, export and disconnect.
- Asset Management no longer advertises unavailable PDF/Word exports.
- Song Library Add Song writes a tenant-scoped record; Smart Organization exports CSV analytics.
- Discipleship Journey renders live `discipleship_pathways` instead of a placeholder.
- Existing Livestreaming, Training, Resource Store and Outreach implementations were retained after source/schema/RLS acceptance audit.

## Verification
- Stage 11C contract: PASS 15/15
- Stage 11A contract: PASS 16/16
- Stage 11B contract: PASS 15/15
- Module enforcement: PASS 12/12
- Repository secret guard: PASS
- TypeScript (`npx tsc --noEmit`): PASS
- Live `generate-ai-content`: ACTIVE v18, verify_jwt=true
- Live `canva-api`: ACTIVE v1, verify_jwt=true
- `canva_tokens`: service_role-only grants

## Environment-only gate
`npm run build` could not execute in this packaged sandbox because the bundled node_modules is incomplete and does not contain the Vite executable. Run `npm ci && npm run build` in the normal development/CI environment before the final Phase 1 push.

## Known global production security items (unchanged)
- Enable Supabase Leaked Password Protection manually.
- Retain/document the existing `pg_net` public-schema exception unless a maintenance-window recreation is scheduled.
