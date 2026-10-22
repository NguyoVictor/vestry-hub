# Vestry Hub P1 readiness (read-only baseline)

1. Extract ZIP **into the Vestry Hub repository root**.
2. From the project root, run `node scripts/p1-readiness.mjs`.
3. To have `npm run test:p1:readiness`, merge the package.json script below into your existing `scripts`:

```json
"test:p1:readiness": "node scripts/p1-readiness.mjs"
```

Outputs: `reports/p1-readiness/report.md` and `report.json`.

The scanner checks a curated October 22 staging snapshot against literal Supabase `.from(table)` query/select/filter/inline payload fields. It then runs installed TypeScript and npm build checks. It does **not** test RLS or cross-tenant access; those still need authenticated, disposable-account integration testing. It does not make network calls or modify data. The ZIP snapshot is **not current after October 22** unless updated. The collector ZIP did not include package.json or the admin event form, so those files will be scanned only when installed into the full repository. Errors can be false positives when queries use complex syntax; review report before modifying schema.

**Never replace package.json with a generated one.** Add one script line only; keep existing scripts, dependencies and configuration intact.
