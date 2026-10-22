# Vestry Hub — Phase 1 Current Source Audit (staging only)

## Confirmed from submitted current-source ZIP
- The `member-portal-feed`, `member-profile-update`, `member-session-context` functions and new frontend helpers are present.
- `MemberSettings.tsx` directly calls `supabase.auth.updateUser` and separately writes to `members` and `users` for email changes. This is unsafe with the custom member-session design and may leave Auth and member records inconsistent.
- The settings deactivation mutation discards the Supabase update error and can incorrectly navigate away as though deactivation succeeded.
- The five settings notification switches are React-only local state, with no persistence or notification-routing implementation.
- Numerous member pages continue to directly access PostgREST. This is an *access-path audit finding*, not proof of an exploitable bypass. Each needs a read/write authorization contract and test.

## Included minimal safety correction
- Disable the unsafe email-change UI pending verified, two-address confirmation workflow.
- Route member deactivation via the existing `member-profile-update` function's `leave_church` operation and only report success if the request succeeds.
- Explicitly label notification switches as previews, not saved preferences.
- No changes to database policies, tables, token issuance, or production.

## Not yet complete — do not call full Phase 1 signed off
- Verify deactivation with a disposable staging test member, *not* primary staging account.
- Implement/validate server-side notification preferences if wanted.
- Implement a verified email-change process; do not directly edit `auth.users`, `members.email`, or `users.email` from the browser.
- Map all remaining member-page direct REST reads/writes to narrowly authorized server operations or documented RLS and test cross-member/cross-tenant denial.
- Run browser tests and `tsc --noEmit`, `npm run build` against the full local repository.
