# Phase 1 member-feed patch — STAGING ONLY

Scope: fixes member notification reads/mark-read and homepage published-media preview, using a session-validated Edge Function; does not change RLS or other portal data flows.

## Apply

From the Vestry Hub repo root, unzip this bundle into the repository after committing/backing up current work. Inspect the diff. Verify `supabase/config.toml` is linked to staging project `xwbajophstetbnnemsyq` and that `member-portal-feed` has `verify_jwt = false` (the function validates the opaque token itself). Deploy the single new function:

```bash
npx supabase functions deploy member-portal-feed --project-ref xwbajophstetbnnemsyq --use-api --no-verify-jwt
npx tsc --noEmit
npm run build
```

Do not deploy to production. The `--no-verify-jwt` option is specific to this function; only requests with a valid hashed member-session token are authorized inside its handler.

## Manual negative tests

- Member can view notification bell and published-media preview without `notifications` or `studio_media` REST 401s on the member home.
- Mark-one and mark-all-read affect only the member's notifications.
- After member signout, `member-portal-feed` rejects the revoked token with 401; altered member or tenant IDs also reject.
- An authenticated member of another tenant cannot access the first tenant's media or notifications.

## Unresolved

Other member-portal direct database requests, profile/settings writes, FCM token authorization and realtime subscription still need a follow-up RLS/authorization audit. This patch does not claim to make the entire portal secure. The realtime listener currently lacks a matching member JWT and may not receive updates; notifications load on query refresh.
