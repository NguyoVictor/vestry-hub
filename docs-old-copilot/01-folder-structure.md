# VestryHub - Folder Structure

This document provides a comprehensive walkthrough of the entire codebase structure, explaining what lives in each folder and why.

## Top-Level Structure

```
vestry-hub/
├── .github/              # GitHub Actions CI/CD workflows
├── .kiro/                # Kiro AI assistant configuration
├── .vscode/              # VS Code workspace settings
├── docs/                 # This documentation
├── public/               # Static assets (served as-is)
├── scripts/              # Build and deployment scripts
├── src/                  # Frontend application source code
├── supabase/             # Backend (database + edge functions)
├── e2e/                  # End-to-end tests (Playwright)
├── testsprite_tests/     # TestSprite automated tests
└── dist/                 # Build output (generated)
```

## `/src` - Frontend Application

### Root Files

- **`main.tsx`** - Application entry point, renders React app into DOM, sets up QueryClient and Router
- **`App.tsx`** - Root component with route definitions
- **`index.css`** - Global styles, Tailwind directives, CSS variables for design system
- **`App.css`** - Additional global styles
- **`vite-env.d.ts`** - TypeScript declarations for Vite

### `/src/assets`

Static assets bundled with the application:
- **`logo.png`** - VestryHub logo used in navigation and auth pages

### `/src/components` - UI Components

Organized by feature domain, not technical layer.

#### `/src/components/ui` - Base Design System Components
Shadcn/ui components (Radix UI primitives with Tailwind styling):
- **`button.tsx`**, **`card.tsx`**, **`dialog.tsx`**, **`input.tsx`**, **`select.tsx`**, etc.
- **DO NOT MODIFY** these files - they define the global design system
- All other components build on top of these primitives

#### `/src/components/shared` - Cross-Feature Shared Components
- **`DataTable.tsx`** - Reusable data table with sorting, filtering, pagination
- **`EmptyState.tsx`** - Empty state UI with icon, message, and CTA
- **`PageHeader.tsx`** - Standard page header with title, subtitle, and action buttons
- **`StatusBadge.tsx`** - Status indicator badges (active, inactive, pending, etc.)
- **`MemberAvatar.tsx`** - Avatar component with gradient initials fallback
- **`ConfirmDialog.tsx`** - Confirmation dialog for destructive actions
- **`LoadingSkeleton.tsx`** - Loading skeleton states (card, table, list variants)

#### `/src/components/layout` - Layout Components
- **`AppLayout.tsx`** - Main authenticated app shell (sidebar + topbar + content)
- **`AuthGuard.tsx`** - Route guard that enforces authentication and loads church context
- **`TopNavbar.tsx`** - Top navigation bar with search, notifications, user menu
- **`Sidebar.tsx`** - Left sidebar with module navigation
- **`PageTransition.tsx`** - Animated page transitions

#### Feature-Specific Component Folders

##### `/src/components/admin`
Admin-only components:
- **`StaffManagementTable.tsx`** - Staff directory and role management
- **`TenantSettings.tsx`** - Church-wide configuration
- **`UserInviteDialog.tsx`** - Invite new admin users

##### `/src/components/members`
Member management UI:
- **`MemberCard.tsx`** - Member profile card
- **`MemberTable.tsx`** - Searchable, filterable member list
- **`MemberForm.tsx`** - Add/edit member form
- **`MemberImportDialog.tsx`** - CSV import UI
- **`MemberProfile.tsx`** - Full member profile view

##### `/src/components/finance`
Financial module components:
- **`GivingChart.tsx`** - Donation trends visualization
- **`ExpenseForm.tsx`** - Expense entry form
- **`BudgetTracker.tsx`** - Budget vs actual tracking
- **`DonationReceipt.tsx`** - PDF receipt generation

##### `/src/components/events`
Event management:
- **`EventCard.tsx`** - Event listing card
- **`EventForm.tsx`** - Create/edit event form
- **`RSVPList.tsx`** - Event registrations list
- **`AttendanceScanner.tsx`** - QR code attendance scanner

##### `/src/components/communications`
Messaging and announcements:
- **`AnnouncementCard.tsx`** - Announcement display card
- **`EmailComposer.tsx`** - Rich text email editor
- **`SMSComposer.tsx`** - SMS message composer
- **`TemplateManager.tsx`** - Email/SMS template CRUD

##### `/src/components/sermons`
Sermon management:
- **`SermonCard.tsx`** - Sermon listing card with media player
- **`SermonUpload.tsx`** - Audio/video upload interface
- **`SermonSeriesManager.tsx`** - Series organization
- **`SermonReactions.tsx`** - Like/comment/share UI

##### `/src/components/growth`
Discipleship and training:
- **`CourseCard.tsx`** - Training course card
- **`LessonPlayer.tsx`** - Video lesson player
- **`ProgressTracker.tsx`** - Course completion tracking
- **`ResourceLibrary.tsx`** - Resource browsing and search

##### `/src/components/security`
Security center:
- **`IncidentReportForm.tsx`** - Security incident reporting
- **`LoginHistoryTable.tsx`** - Audit log of logins
- **`AlertManager.tsx`** - Security alert configuration

##### `/src/components/analytics`
Reports and dashboards:
- **`DashboardStats.tsx`** - Key metrics cards
- **`GrowthChart.tsx`** - Membership growth visualization
- **`FinanceReport.tsx`** - Financial summary reports
- **`ExportButton.tsx`** - CSV/PDF export functionality

##### `/src/components/settings`
Settings pages:
- **`GeneralSettings.tsx`** - Church profile settings
- **`IntegrationSettings.tsx`** - Third-party integrations config
- **`NotificationSettings.tsx`** - Notification preferences
- **`BillingSettings.tsx`** - Subscription and billing

##### `/src/components/media`
Media library:
- **`MediaGrid.tsx`** - Photo/video grid display
- **`MediaUpload.tsx`** - Drag-and-drop upload
- **`AlbumManager.tsx`** - Album organization
- **`StorageIndicator.tsx`** - Storage usage meter

##### `/src/components/magicui`
Advanced animations and effects:
- **`BlurFade.tsx`** - Blur-fade entrance animation
- **`GradientText.tsx`** - Animated gradient text
- **`ParticleEffect.tsx`** - Particle animations

### `/src/pages` - Route Components

Each file represents a routable page. Organized by module.

#### Root Pages
- **`Index.tsx`** - Landing/marketing page (unauthenticated)
- **`Dashboard.tsx`** - Main admin dashboard (authenticated)
- **`NotFound.tsx`** - 404 error page
- **`Onboarding.tsx`** - Multi-step church setup wizard

#### `/src/pages/auth` - Authentication Pages
- **`Login.tsx`** - Email/password login
- **`Signup.tsx`** - New church registration
- **`MagicLink.tsx`** - Magic link login handler
- **`AuthCallback.tsx`** - OAuth callback handler
- **`InviteCallback.tsx`** - User invite acceptance
- **`ForgotPassword.tsx`** - Password reset request
- **`ResetPassword.tsx`** - Password reset form

#### `/src/pages/people` - People Management Module
- **`Members.tsx`** - Member directory and search
- **`MemberProfile.tsx`** - Individual member detail page
- **`Groups.tsx`** - Small groups management
- **`Families.tsx`** - Family relationships
- **`Visitors.tsx`** - Visitor tracking and follow-up
- **`NewConverts.tsx`** - New convert discipleship pipeline
- **`Volunteers.tsx`** - Volunteer roster and scheduling

#### `/src/pages/finance` - Finance Module
- **`Giving.tsx`** - Donation records and entry
- **`Expenses.tsx`** - Expense tracking
- **`Budgets.tsx`** - Budget planning and monitoring
- **`Pledges.tsx`** - Pledge campaigns
- **`Funds.tsx`** - Designated fund management
- **`Payroll.tsx`** - Staff payroll processing
- **`Reports.tsx`** - Financial reports

#### `/src/pages/communications` - Communications Module
- **`Announcements.tsx`** - Church-wide announcements
- **`EmailCompose.tsx`** - Send bulk emails
- **`SmsTab.tsx`** - Send SMS messages
- **`EmailBranding.tsx`** - Email template customization
- **`MemberMessaging.tsx`** - Admin direct messaging with members
- **`WhatsAppDirectory.tsx`** - WhatsApp contact management

#### `/src/pages/engagement` - Event & Service Management
- **`Events.tsx`** - Event calendar and management
- **`Services.tsx`** - Service scheduling
- **`Attendance.tsx`** - Attendance tracking
- **`MemberRequests.tsx`** - Member service requests
- **`Facilities.tsx`** - Facility booking management

#### `/src/pages/media` - Media & Content
- **`Sermons.tsx`** - Sermon library
- **`ChurchMedia.tsx`** - Photo/video gallery
- **`SongLibrary.tsx`** - Worship song management
- **`SetLists.tsx`** - Service setlist builder
- **`Livestreaming.tsx`** - Livestream management

#### `/src/pages/growth` - Discipleship & Outreach
- **`Training.tsx`** - Training course catalog
- **`Discipleship.tsx`** - Discipleship pathway tracking
- **`Outreach.tsx`** - Outreach activity logging
- **`Store.tsx`** - Church resource store (books, materials)

#### `/src/pages/security` - Security Center
- **`Incidents.tsx`** - Security incident tracking
- **`LoginEvents.tsx`** - Audit log of all logins
- **`Alerts.tsx`** - Security alert configuration

#### `/src/pages/analytics` - Reports & Analytics
- **`Dashboard.tsx`** - Analytics dashboard
- **`MembershipReport.tsx`** - Membership statistics
- **`FinanceReport.tsx`** - Financial analytics
- **`GivingReport.tsx`** - Donation trends
- **`AttendanceReport.tsx`** - Attendance analytics

#### `/src/pages/settings` - Settings Pages
- **`General.tsx`** - Church profile and branding
- **`Users.tsx`** - User management
- **`Staff.tsx`** - Staff directory
- **`Integrations.tsx`** - Third-party integrations
- **`Notifications.tsx`** - Notification preferences
- **`Billing.tsx`** - Subscription and billing
- **`SEO.tsx`** - SEO settings for public pages
- **`ChildrensMinistry.tsx`** - Children's ministry settings

#### `/src/pages/member` - Member Portal (Separate App)
Public-facing portal for church members:
- **`MemberWelcome.tsx`** - Member dashboard
- **`MemberProfile.tsx`** - Member self-service profile
- **`MemberGive.tsx`** - Member online giving
- **`MemberMessages.tsx`** - Member direct messaging with staff
- **`MemberAnnouncements.tsx`** - View announcements
- **`MemberEvents.tsx`** - Event registration
- **`MemberSermons.tsx`** - Sermon library
- **`MemberBible.tsx`** - Bible study tools
- **`MemberHome.tsx`** - Member home page with quick links

#### `/src/pages/public` - Public Pages
- **`ChurchPublicPage.tsx`** - Public church profile
- **`VisitorRegistration.tsx`** - Visitor self-registration form
- **`MemberRegistration.tsx`** - Member self-registration

#### `/src/pages/legal` - Legal Pages
- **`PrivacyPolicy.tsx`** - Privacy policy
- **`TermsAndConditions.tsx`** - Terms of service
- **`DataCompliance.tsx`** - GDPR/data compliance info

### `/src/contexts` - Global State Management

React Context providers for app-wide state:

- **`ChurchContext.tsx`** - Current church/tenant data, user info, permissions
  - Used by authenticated admin users
  - Provides: `{ tenantId, userId, userName, churchName, userRole, permissions }`
  
- **`MemberPortalContext.tsx`** - Member portal session state
  - Used by member-facing portal
  - Provides: `{ memberId, tenantId, firstName, lastName, email, churchName }`
  
- **`AgeAwareContext.tsx`** - Parental controls for children's profiles
  - Age-appropriate content filtering

### `/src/hooks` - Custom React Hooks

Reusable logic extracted into hooks:

#### Data Fetching Hooks
- **`useOptimizedDashboard.ts`** - Batched dashboard stat queries
- **`useOptimizedMembers.ts`** - Paginated member data
- **`useFinanceRealtime.ts`** - Real-time finance updates
- **`useActivityLog.ts`** - Activity tracking

#### Feature Hooks
- **`usePermissions.ts`** - Permission checks (`isReadOnly`, `canAccess`)
- **`useSubscription.ts`** - Subscription tier and limits
- **`useCurrency.ts`** - Multi-currency formatting
- **`usePageTitle.ts`** - Dynamic page titles

#### Notification Hooks
- **`useNotificationBell.ts`** - Notification badge count
- **`useFcmToken.ts`** - Firebase push notification token
- **`useAnnouncementNotifications.ts`** - Announcement alerts
- **`useMediaNotifications.ts`** - Media upload alerts
- **`useTestimonyNotifications.ts`** - Testimony submission alerts

#### Bible Explorer Hooks
- **`useBibleNotes.ts`** / **`useBibleNotesLocal.ts`** - Bible study notes
- **`useBibleHighlights.ts`** / **`useBibleHighlightsLocal.ts`** - Verse highlighting
- **`useBibleBookmarks.ts`** / **`useBibleBookmarksLocal.ts`** - Bookmarked verses
- **`useBibleProgress.ts`** / **`useBibleProgressLocal.ts`** - Reading progress
- **`useBibleReactions.ts`** / **`useBibleReactionsLocal.ts`** - Verse reactions
- **`useReadReceipt.ts`** - Read receipt tracking

#### Member Preferences
- **`useMemberPreferences.ts`** / **`useMemberPreferencesLocal.ts`** - Member portal settings

#### Utility Hooks
- **`use-mobile.tsx`** - Mobile viewport detection
- **`use-toast.ts`** - Toast notification system
- **`useLenis.ts`** - Smooth scrolling
- **`useStaleQuery.ts`** - Stale-while-revalidate pattern

### `/src/lib` - Utilities & Services

Shared utility functions and service layers:

- **`schema.ts`** - **CRITICAL** - Table and column name constants (source of truth)
- **`utils.ts`** - General utilities (`cn()` for className merging)
- **`format.ts`** - Date, currency, phone number formatters
- **`database.types.ts`** - Auto-generated TypeScript types from Supabase schema
- **`dataValidation.ts`** - Input validation helpers
- **`bibleService.ts`** - Bible API integration
- **`messaging.ts`** - Firebase messaging utilities
- **`firebase.ts`** - Firebase SDK initialization
- **`activityLogger.ts`** - User activity tracking
- **`monitoring.ts`** - Error tracking and performance monitoring
- **`cacheManager.ts`** - Client-side cache management
- **`queryOptimization.ts`** - TanStack Query optimization helpers
- **`imageUtils.ts`** - Image processing (compression, resizing)
- **`design-system.ts`** - Design token utilities
- **`country-currency.ts`** - Country/currency mapping
- **`gamePin.ts`** - Quiz game PIN generation
- **`quiz-game.ts`** - Quiz game logic
- **`song-library-theme.ts`** - Song library theming utilities
- **`lazy-recharts.ts`** - Lazy-loaded chart components

### `/src/integrations` - Third-Party SDK Wrappers

#### `/src/integrations/supabase`
- **`client.ts`** - Configured Supabase client instance
- **`types.ts`** - Supabase-specific TypeScript types

### `/src/types` - TypeScript Type Definitions

Domain-specific type definitions:
- **`announcements.ts`** - Announcement types
- **`appointments.ts`** - Appointment types
- **`media.ts`** - Media item types
- **`testimonies.ts`** - Testimony types
- **`song-library.ts`** - Song and setlist types
- **`song-library-theme.d.ts`** - Song theme declarations

### `/src/config` - Application Configuration

- **`navigation.ts`** - Sidebar navigation menu structure
- **`plans.ts`** - Subscription plan definitions and feature limits

### `/src/test` - Unit Tests

- **`setup.ts`** - Vitest test environment setup
- **`example.test.ts`** - Example unit tests

### `/src/utils` - Additional Utilities

- **`streamPlatform.ts`** / **`streamPlatform.test.ts`** - Livestream platform detection

---

## `/supabase` - Backend

### `/supabase/migrations` - Database Schema

Numbered SQL migration files defining the database schema:
- **Format**: `YYYYMMDDHHMMSS_description.sql`
- **Examples**:
  - `20240101000000_create_tenants.sql` - Core tenant table
  - `20240102000000_create_users.sql` - Users table
  - `20240103000000_create_members.sql` - Members table
  - `20260601120000_create_subscription_system.sql` - Subscription tables
  - `20260610000000_create_active_sessions_rpc.sql` - RPC functions

### `/supabase/functions` - Edge Functions

Serverless Deno functions for server-side operations:

#### Authentication & User Management
- **`update-user-role`** - Change user roles (requires elevated permissions)
- **`create-staff-thread`** - Auto-create staff directory threads

#### Communications
- **`africastalking-sms`** - Send SMS via Africa's Talking API
- **`process-email-automations`** - Scheduled email automation processing
- **`send-email`** - Send transactional emails via Resend

#### Payments
- **`payhero-callback`** - Handle PayHero payment webhooks
- **`payhero-till-setup`** - Initialize PayHero M-Pesa till

#### Member Portal
- **`sync-member-profile`** - Sync member profile updates to users table

#### AI Tools
- **`ai-tools-proxy`** - Proxy for AI API calls (protects API keys)

Each edge function has its own folder with:
- **`index.ts`** - Function entry point
- **`deno.json`** - Deno dependencies

### `/supabase/config.toml`

Supabase project configuration:
- Database settings
- Auth providers
- Storage buckets
- Edge function routes

---

## Configuration Files (Root)

### Build & Development
- **`vite.config.ts`** - Vite build configuration
- **`vitest.config.ts`** - Vitest test configuration
- **`tsconfig.json`** - Root TypeScript config
- **`tsconfig.app.json`** - App-specific TS config
- **`tsconfig.node.json`** - Node-specific TS config
- **`tailwind.config.ts`** - Tailwind CSS configuration
- **`postcss.config.js`** - PostCSS configuration
- **`components.json`** - Shadcn/ui component config

### Code Quality
- **`eslint.config.js`** - ESLint linting rules
- **`.gitignore`** - Git ignore patterns

### Testing
- **`playwright.config.ts`** - Playwright E2E test config
- **`playwright-fixture.ts`** - Playwright test fixtures

### Package Management
- **`package.json`** - Dependencies and scripts
- **`package-lock.json`** / **`bun.lock`** - Dependency lock files

### Deployment
- **`vercel.json`** - Vercel deployment config

---

## Naming Conventions Summary

### Files
- **Components**: PascalCase (e.g., `MemberProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useChurch.ts`)
- **Utilities**: camelCase (e.g., `formatCurrency.ts`)
- **Pages**: PascalCase matching route (e.g., `MembersPage.tsx`)

### Database
- **Tables**: snake_case (e.g., `church_members`)
- **Columns**: snake_case (e.g., `tenant_id`)
- **Use constants**: `TABLES.MEMBERS`, `COLS.TENANT_ID` from `schema.ts`

### React Query Keys
- **Format**: Array with entity and optional ID
- **Examples**: `['members', churchId]`, `['member', memberId]`

---

## Key Takeaways

1. **Feature-Based Organization**: Components and pages are grouped by feature domain, not technical layer
2. **Schema Constants**: ALWAYS use `TABLES` and `COLS` from `schema.ts` - never hardcode strings
3. **Shared Components**: Build on `src/components/shared` and `src/components/ui` - don't reinvent
4. **Hooks Over Utilities**: Extract reusable logic into hooks, not utility functions
5. **Edge Functions**: Server-side operations that need secrets or elevated permissions
6. **Member Portal**: Separate page structure for member-facing features under `src/pages/member`

---

**Next**: Read `02-identity-and-data-model.md` to understand the database schema and relationships.
