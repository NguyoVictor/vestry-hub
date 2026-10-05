# Phase 1 Stage 2 — Canonical Module Configuration

## Goal

Make `tenants.enabled_modules` the single tenant module configuration used by onboarding, Admin navigation, Member Portal navigation, home cards, and direct-route enforcement.

## Canonical shape

New writes use a versioned object:

```text
{
  version: 1,
  admin: { <stable module key>: boolean },
  member_portal: { <stable member feature key>: boolean }
}
```

Existing tenants are read through a compatibility normalizer. It accepts the historical route-array shape, flat boolean objects, nested `member_portal` objects, and missing/null configuration. Missing configuration defaults to all Admin modules enabled so existing churches do not lose access after deployment.

## Onboarding

`tenant_metadata.priority_needs` remains as onboarding metadata. The same selections are also translated into canonical `enabled_modules` at tenant creation/update. `members_groups` remains a core Admin module; optional modules are enabled from the selected onboarding needs.

## Enforcement

- Admin sidebar items are filtered by the canonical `admin` module map.
- Direct Admin URLs are checked in `AppLayout`; disabled module routes redirect to `/dashboard` before the page outlet renders.
- Member login stores the complete tenant module configuration in the trusted member session snapshot.
- Member sidebar, mobile bottom navigation, Member Home cards, and direct Member URLs use the same canonical route checks.
- Member routes require both their parent Admin module and their member-specific feature flag when a feature flag exists.
- `/dashboard`, `/settings/*`, `/member`, `/member/profile`, and `/member/settings` remain core routes.

## Legacy settings cleanup

- `/settings/modules` is declared once and uses the canonical editor.
- `ServicesModules.tsx` remains as a compatibility alias to the canonical editor.
- `MemberAppFeatures.tsx` remains as a compatibility alias to the canonical Member App editor.
- All current `enabled_modules` writes preserve the canonical object instead of replacing it with an incompatible legacy shape.

## Verification

Run before committing:

```bash
npm run test:security:secrets
npm run test:p1:modules:contract
npm run test:p1:modules
npx tsc --noEmit
npm run build
git diff --check
```

Stage 3 should add browser regression coverage for enabled/disabled module combinations, including direct URLs and active Member sessions.
