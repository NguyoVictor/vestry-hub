VESTRY HUB: SINGLE-COMMAND SAFE REGRESSION + RLS

1. From the project root, copy both scripts into its scripts/ directory.
2. Existing prerequisites: .env.local or .env.development.local with staging
   URL and publishable key; Playwright auth state files:
   playwright/.auth/staging-admin.json
   playwright/.auth/qa-member.json
   playwright/.auth/qa-admin.json
3. Start the existing build preview on port 4173:
   npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
4. In another terminal:
   chmod +x scripts/run-release-safe-tests.sh
   ./scripts/run-release-safe-tests.sh
5. Review reports/e2e-automation/release-safe-summary.txt and tenant-rls.json.

Note: RLS positive control checks Tenant A member, negative control tests known
Tenant B member. Other tables report UNVERIFIED until records are independently
confirmed seeded in Tenant B. Do NOT claim they passed.

Do not commit playwright/.auth, .env.local, or generated reports. JWTs can appear
in browser traces or storage-state files. Do not upload them to public CI.
This bundle does not execute mutation tests. Safe testing does not prove
application-wide authorization, financial integrity, or readiness to deploy.
