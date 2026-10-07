# Phase 1 Stage 11A — Shell, Onboarding & Communications

## Scope

Stage 11A closes the shell and communications gaps identified during final Phase 1 acceptance: onboarding service selection, Admin navbar search/notifications, email/SMS queue readiness, and Firebase push registration/sending/click handling.

## Changes

- Onboarding now renders the canonical Admin module catalog instead of a partial priority-needs proxy list. `Members & Groups` remains the core always-on module. Selected canonical module keys are persisted through the existing `enabled_modules` configuration and continue to drive both Admin and Member Portal gating.
- `moduleConfigFromOnboarding` accepts both canonical module keys and legacy onboarding priority IDs, preserving backward compatibility.
- Admin global search is no longer cosmetic. It searches tenant-scoped Members, Events, Services, and Giving records and filters results through the current tenant module configuration.
- Admin notification mutations now include notification id + tenant id + user id constraints.
- Email and SMS continue to enter through tenant-authorized queue functions and are processed asynchronously by the existing queue workers.
- Push sending now requires an authorized tenant actor before service-role reads/sends.
- Device-token registration moved behind a server-side Edge Function that validates either a Supabase-authenticated Admin user or a Member Portal opaque session.
- `device_tokens` is now server-only: browser roles have no direct table privileges or RLS policies.
- Admin Broadcast push recipients now use Member IDs, matching how Member Portal FCM tokens are registered.
- FCM payloads include a Member Portal destination and the service worker opens/focuses that destination on click.

## Live verification

Verified on project `crjdsxxkspvdwknrmijs`:

- `send-communication` ACTIVE, JWT verified
- `africastalking-sms` ACTIVE, JWT verified
- `process-email-queue` ACTIVE
- `process-sms-queue` ACTIVE
- `send-push-notification` ACTIVE, version 19, JWT verified
- `register-device-token` ACTIVE, version 1; it self-validates opaque Member Portal sessions
- PGMQ queues `outbound_email` and `outbound_sms` exist
- cron jobs `process-email-queue` and `process-sms-queue` are active every minute
- migration `20261005165445_p1_stage11a_device_token_hardening` is live
- `device_tokens` privileges are limited to postgres/service_role

No unsolicited provider message was sent during this stage. A real provider delivery smoke test should use an explicitly designated test email address, phone number and FCM-enabled disposable member account.

## Contract

Run:

```bash
npm run test:p1:stage11a:contract
```

The contract verifies onboarding canonical selection, tenant-scoped search, notification mutation scoping, queue architecture, push authorization, token registration, click routing, and server-only device-token storage.

## Protected browser acceptance

With the disposable platform fixture environment configured, run:

```bash
npm run test:e2e:stage11a
```

The Stage 11A Playwright suite verifies the Admin global search against a disposable tenant-scoped member and checks the notification bell/breadcrumb shell controls. Credential-dependent skips do not count as a completed browser pass.
