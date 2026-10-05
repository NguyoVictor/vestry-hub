# Phase 1 Stage 6 - Platform Action Inventory

## Scope

This milestone turns the broad UI surface into a release-oriented action catalogue. Raw source census: **1,496 button components/elements, 75 React links, 66 anchors, 45 forms, and 32 file inputs**. Repeated/cosmetic controls are intentionally collapsed into meaningful user outcomes.

## Inventory summary

- Total meaningful actions: **66**
- Admin: **50**; Member: **12**; Public: **4**
- Critical: **15**; High: **38**; Medium: **11**; Low: **2**
- Already automated: **6**
- Mapped to protected E2E for Stage 7: **57**
- Documented manual exceptions: **3**

## Coverage policy

Every catalogued action has a verification disposition. `automated` means coverage already exists in the current suite; `protected-e2e` means it is an explicit automated target for disposable-tenant Stage 7 execution; `manual-exception` is reserved for provider/payment workflows that should not run against shared/live credentials.

## Action matrix

| ID | Actor | Module | Risk | Action | Verification | Reference |
|---|---|---|---|---|---|---|
| `members-create` | admin | People | high | create member | automated | e2e/platform/permissions.spec.ts + tenant-boundary.spec.ts |
| `members-update` | admin | People | high | update member | protected-e2e | stage7: member CRUD workflow |
| `members-delete` | admin | People | critical | delete member | protected-e2e | stage7: member CRUD workflow |
| `members-import` | admin | People | high | import members CSV | automated | e2e/platform/import-export.spec.ts |
| `members-export` | admin | People | medium | export members CSV | automated | e2e/platform/import-export.spec.ts |
| `visitor-create` | admin | People | high | create visitor | protected-e2e | stage7: people workflows |
| `visitor-convert` | admin | People | high | convert visitor to new convert | protected-e2e | stage7: people workflows |
| `family-create` | admin | People | medium | create family | protected-e2e | stage7: people workflows |
| `family-link-member` | admin | People | high | link member to family | protected-e2e | stage7: people workflows |
| `followup-create` | admin | People | medium | create follow-up task | protected-e2e | stage7: people workflows |
| `event-create` | admin | Operations | high | create event | protected-e2e | stage7: operations workflows |
| `event-update` | admin | Operations | high | edit event | protected-e2e | stage7: operations workflows |
| `event-rsvp-admin` | admin | Operations | high | record event attendance/RSVP | protected-e2e | stage7: operations workflows |
| `service-create` | admin | Operations | high | schedule service | protected-e2e | stage7: operations workflows |
| `service-attendance` | admin | Operations | high | record service attendance | protected-e2e | stage7: operations workflows |
| `volunteer-role-create` | admin | Operations | medium | create volunteer role/opportunity | protected-e2e | stage7: operations workflows |
| `volunteer-assign` | admin | Operations | high | assign volunteer | protected-e2e | stage7: operations workflows |
| `volunteer-export` | admin | Operations | medium | export volunteer data | automated | P1 operations contract + stage7 UI |
| `board-meeting-create` | admin | Operations | high | create board meeting | protected-e2e | stage7: operations workflows |
| `board-minutes-save` | admin | Operations | high | save meeting minutes/decisions | protected-e2e | stage7: operations workflows |
| `facility-share-link` | admin | Operations | low | copy public booking link | protected-e2e | stage7: share-link checks |
| `facility-booking-review` | admin | Operations | high | approve or decline booking | protected-e2e | stage7: operations workflows |
| `announcement-create` | admin | Engagement | high | publish announcement | protected-e2e | stage7: engagement workflows |
| `announcement-edit` | admin | Engagement | medium | edit announcement | protected-e2e | stage7: engagement workflows |
| `announcement-delete` | admin | Engagement | high | delete announcement | protected-e2e | stage7: engagement workflows |
| `survey-create` | admin | Engagement | high | create survey | protected-e2e | stage7: engagement workflows |
| `survey-share` | admin | Engagement | low | copy survey share link | protected-e2e | stage7: share-link checks |
| `survey-delete` | admin | Engagement | high | delete survey | protected-e2e | stage7: engagement workflows |
| `appointment-review` | admin | Engagement | high | confirm/decline/reschedule appointment | protected-e2e | stage7: engagement workflows |
| `testimony-moderate` | admin | Engagement | high | approve/reject testimony | protected-e2e | stage7: engagement workflows |
| `message-send-admin` | admin | Messaging | critical | send participant message | protected-e2e | stage7: messaging workflows |
| `message-delete-admin` | admin | Messaging | high | delete message | protected-e2e | stage7: messaging workflows |
| `message-attachment-admin` | admin | Messaging | critical | upload message attachment | protected-e2e | stage7: messaging attachment workflow |
| `giving-record-create` | admin | Finance | critical | record giving transaction | protected-e2e | stage7: finance workflows |
| `giving-export` | admin | Finance | high | export giving records | protected-e2e | stage7: finance export |
| `expense-create` | admin | Finance | critical | record expense | protected-e2e | stage7: finance workflows |
| `expense-approve` | admin | Finance | critical | approve expense | protected-e2e | stage7: finance permission matrix |
| `budget-create` | admin | Finance | high | create budget | protected-e2e | stage7: finance workflows |
| `accounts-payable-create` | admin | Finance | high | create payable | protected-e2e | stage7: finance workflows |
| `pledge-campaign-create` | admin | Finance | high | create pledge campaign | protected-e2e | stage7: finance workflows |
| `payroll-run` | admin | Finance | critical | create/process payroll run | manual-exception | manual: external payroll/payment side effects are not safe for shared automated QA |
| `communications-email-send` | admin | Communications | critical | queue email broadcast | protected-e2e | stage7: queue-backed communications |
| `communications-sms-send` | admin | Communications | critical | queue SMS broadcast | protected-e2e | stage7: queue-backed communications |
| `communications-template-save` | admin | Communications | medium | save communication template | protected-e2e | stage7: communications workflows |
| `settings-modules-save` | admin | Settings | high | save enabled modules | automated | src/test/p1/modules + e2e/platform/modules/module-enforcement.spec.ts |
| `settings-member-app-save` | admin | Settings | high | save member portal features | automated | src/test/p1/modules + Stage 3 module QA |
| `settings-user-invite` | admin | Settings | critical | invite staff user | protected-e2e | stage7: permissions workflows |
| `settings-permissions-save` | admin | Settings | critical | change role/user permissions | protected-e2e | stage7: permission matrix + direct DB denial |
| `qr-copy` | admin | Settings | medium | copy QR URL | protected-e2e | stage7: QR/share-link checks |
| `subscription-upgrade` | admin | Billing | critical | start subscription STK | manual-exception | manual: requires disposable payment credentials/provider sandbox and callback validation |
| `member-rsvp` | member | Member Portal | high | RSVP to event | protected-e2e | stage7: member workflows |
| `member-message-send` | member | Member Portal | critical | send message | protected-e2e | stage7: messaging workflows |
| `member-message-attachment` | member | Member Portal | critical | upload message attachment | protected-e2e | stage7: messaging attachment workflow |
| `member-request` | member | Member Portal | high | submit request | protected-e2e | stage7: member workflows |
| `member-appointment` | member | Member Portal | high | book appointment | protected-e2e | stage7: member workflows |
| `member-testimony` | member | Member Portal | high | submit testimony | protected-e2e | stage7: member workflows |
| `member-volunteer-signup` | member | Member Portal | high | sign up to volunteer | protected-e2e | stage7: member workflows |
| `member-facility-book` | member | Member Portal | high | request facility booking | protected-e2e | stage7: member workflows |
| `member-give-stk` | member | Member Portal | critical | initiate church giving STK | manual-exception | manual: requires church-specific disposable M-Pesa sandbox credentials and callback verification |
| `member-profile-update` | member | Member Portal | high | update own profile | protected-e2e | stage7: member workflows |
| `member-settings-update` | member | Member Portal | medium | update notification/preferences | protected-e2e | stage7: member workflows |
| `member-survey-submit` | member | Member Portal | medium | submit survey response | protected-e2e | stage7: member workflows |
| `public-survey-submit` | public | Public | medium | submit public survey | protected-e2e | stage7: public workflows |
| `public-facility-book` | public | Public | high | submit public facility booking | protected-e2e | stage7: public workflows |
| `public-visitor-register` | public | Public | high | register visitor | protected-e2e | stage7: public workflows |
| `public-member-register` | public | Public | high | register member | protected-e2e | stage7: public workflows |

## Manual exceptions

- **payroll-run** - requires isolated finance sandbox and provider stubs (manual: external payroll/payment side effects are not safe for shared automated QA)
- **subscription-upgrade** - run against isolated M-Pesa sandbox only (manual: requires disposable payment credentials/provider sandbox and callback validation)
- **member-give-stk** - keep separate from subscription billing QA (manual: requires church-specific disposable M-Pesa sandbox credentials and callback verification)

## Stage 6 exit criteria

- Important Phase 1 user outcomes are represented in `PLATFORM_ACTIONS`.
- Critical/high-risk actions cannot be left without a verification disposition.
- Manual exceptions must state why automation is unsafe or inappropriate.
- Stage 7 can consume this inventory as its protected Playwright execution plan.
- This inventory does not claim the 57 protected E2E targets have already passed; Stage 7 provides that evidence.
