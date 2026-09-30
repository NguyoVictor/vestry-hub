# P2 Platform QA Coverage

The platform QA layer is intentionally split into source contracts that can run anywhere and Playwright/direct-database suites that require explicit disposable test tenants.

| Area | Automated coverage |
| --- | --- |
| Route inventory | `e2e/platform/action-manifest.ts`, `routes.spec.ts` |
| Buttons/links/forms | `e2e/platform/actions/` |
| Tenant-aware QR links | `e2e/platform/actions/qr.spec.ts`, B1 tenant-host contracts |
| Imports/exports | `e2e/platform/import-export.spec.ts` with valid/invalid/duplicate CSV fixtures |
| Permission combinations | `e2e/platform/permissions.spec.ts` and P2 source contracts |
| Tenant boundaries | `e2e/platform/tenant-boundary.spec.ts` |
| Email/SMS queues | `e2e/platform/infrastructure/communications.spec.ts` plus source contracts |
| Subscription payments | `e2e/platform/infrastructure/subscription-payments.spec.ts` plus catalog/payment contracts |

Destructive tests refuse to run unless `PW_PLATFORM_TEST_ENV=disposable` and two distinct disposable tenant IDs are provided. Production `vestryhub.com` hosts are blocked unless an explicit destructive-test override is set.

The full Playwright suite remains a release gate when dependencies and protected CI/test credentials are available. Source-level Node contracts are not a substitute for browser or live authorization tests; they provide a deterministic preflight when those dependencies are unavailable.

Protected Playwright coverage now includes real Admin/Member route smoke checks, visible/disabled critical controls, empty-form validation, member request actions, member CSV download checks, actor-scoped cross-tenant CRUD denial probes, queue API denial probes, and subscription catalog/payment authorization probes. These cases intentionally skip when protected actor tokens/storage states are absent rather than silently falling back to service-role authorization.
