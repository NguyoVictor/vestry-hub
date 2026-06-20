# VestryHub - Feature Modules

Comprehensive breakdown of each feature module.

## 1. People Management

**Purpose**: Manage church members, groups, families, and visitors

### Key Pages
- `src/pages/people/Members.tsx` - Member directory
- `src/pages/people/MemberProfile.tsx` - Individual profiles
- `src/pages/people/Groups.tsx` - Small groups
- `src/pages/people/Families.tsx` - Family relationships
- `src/pages/people/Visitors.tsx` - Visitor tracking
- `src/pages/people/NewConverts.tsx` - Discipleship pipeline
- `src/pages/people/Volunteers.tsx` - Volunteer management

### Database Tables
- `members` - Member records
- `groups` / `group_members` / `group_types`
- `families` / `family_members`
- `visitors` / `visitor_followup_notes` / `follow_up_tasks`
- `new_converts` / `convert_checkins`
- `volunteers` / `volunteer_roles` / `volunteer_assignments`

### Features
- **Search & Filter**: By status, group, join date
- **Bulk Operations**: CSV import/export
- **Custom Fields**: Extensible member data
- **Profile Photos**: Upload and manage avatars
- **Relationships**: Family connections, group membership

---

## 2. Finance Module

**Purpose**: Track donations, expenses, budgets, and generate reports

### Key Pages
- `src/pages/finance/Giving.tsx` - Donation entry and history
- `src/pages/finance/Expenses.tsx` - Expense tracking
- `src/pages/finance/Budgets.tsx` - Budget planning
- `src/pages/finance/Pledges.tsx` - Pledge campaigns
- `src/pages/finance/Funds.tsx` - Designated funds
- `src/pages/finance/Payroll.tsx` - Staff payroll
- `src/pages/finance/Reports.tsx` - Financial reports

### Database Tables
- `giving_records` - Donations
- `expenses` - Church expenses
- `budgets` / `budget_categories`
- `funds` / `fund_transactions`
- `pledge_campaigns` / `pledges`
- `payroll_staff` / `payroll_runs` / `payroll_payments`

### Features
- **Multi-Currency**: Support for different currencies
- **Payment Methods**: Cash, check, online, M-Pesa
- **Tax Receipts**: Auto-generate PDF receipts
- **Budget Tracking**: Compare budget vs actual
- **Designated Funds**: Track restricted donations
- **Payroll**: Process staff salaries

### Integration Points
- **PayHero**: M-Pesa and bank payments
- **Edge Function**: `payhero-callback` for webhooks

---

## 3. Communications Module

**Purpose**: Announcements, messaging, email, SMS

### Key Pages
- `src/pages/communications/Announcements.tsx` - Church-wide announcements
- `src/pages/communications/MemberMessaging.tsx` - Direct messaging
- `src/pages/communications/EmailCompose.tsx` - Bulk email
- `src/pages/communications/SmsTab.tsx` - SMS messaging
- `src/pages/communications/EmailBranding.tsx` - Email templates
- `src/pages/communications/WhatsAppDirectory.tsx` - WhatsApp contacts

### Database Tables
- `announcements` / `announcement_reactions` / `announcement_comments`
- `conversations` / `conversation_participants` / `messages`
- `email_templates` / `email_automations`
- `sms_templates` / `sms_history`
- `admin_broadcasts`
- `whatsapp_contacts` / `whatsapp_messages`

### Features
- **Announcements**: Pinned, scheduled, categorized
- **Direct Messaging**: Admin-to-member, member-to-staff
- **Group Chats**: Multi-person conversations
- **Email Campaigns**: Template-based bulk emails
- **SMS Broadcasting**: Mass text messages
- **Email Automations**: Scheduled recurring emails

### Integration Points
- **Resend**: Email delivery
- **Africa's Talking**: SMS gateway
- **Edge Functions**: `send-email`, `africastalking-sms`, `process-email-automations`

---

## 4. Events & Operations

**Purpose**: Events, services, attendance, facilities

### Key Pages
- `src/pages/engagement/Events.tsx` - Event management
- `src/pages/engagement/Services.tsx` - Service scheduling
- `src/pages/engagement/Attendance.tsx` - Attendance tracking
- `src/pages/engagement/MemberRequests.tsx` - Service requests
- `src/pages/engagement/Facilities.tsx` - Facility booking

### Database Tables
- `events` / `event_rsvps` / `event_registrations`
- `services` / `service_attendance`
- `attendance_sessions` / `attendance_records`
- `member_requests` / `member_request_notes`
- `facilities` / `facility_bookings`

### Features
- **Event Calendar**: Visual calendar with filters
- **RSVP Tracking**: Registration limits, waitlists
- **QR Code Check-in**: Mobile attendance scanning
- **Service Scheduling**: Recurring services
- **Facility Booking**: Room reservations with approval workflow

---

## 5. Media & Content

**Purpose**: Sermons, songs, media library, livestreaming

### Key Pages
- `src/pages/media/Sermons.tsx` - Sermon library
- `src/pages/media/SongLibrary.tsx` - Worship songs
- `src/pages/media/SetLists.tsx` - Service playlists
- `src/pages/media/ChurchMedia.tsx` - Photo/video gallery
- `src/pages/Livestreaming.tsx` - Livestream management

### Database Tables
- `sermons` / `sermon_series`
- `songs` / `set_lists` / `set_list_songs`
- `church_media_items` / `media_albums`
- `livestreams` / `livestream_configs` / `livestream_schedules`

### Features
- **Sermon Library**: Audio/video sermons with notes
- **Song Library**: Lyrics, chords, chord transposition
- **Setlist Builder**: Drag-and-drop service planning
- **Media Gallery**: Albums, categories, search
- **Livestreaming**: YouTube, Facebook, custom RTMP
- **Storage Management**: Track usage, enforce quotas

### Integration Points
- **Supabase Storage**: File uploads
- **Jitsi**: Video conferencing
- **YouTube/Facebook**: Livestream embedding

---

## 6. Growth & Discipleship

**Purpose**: Training, discipleship, outreach, store

### Key Pages
- `src/pages/growth/Training.tsx` - Training courses
- `src/pages/growth/Discipleship.tsx` - Discipleship tracking
- `src/pages/growth/Outreach.tsx` - Outreach activities
- `src/pages/store/Store.tsx` - Resource store

### Database Tables
- `training_courses` / `training_enrollments` / `lesson_completions`
- `discipleship_pathways` / `resource_assignments`
- `outreach_activities`
- `store_products` / `store_orders`

### Features
- **Training Courses**: Video lessons, quizzes
- **Progress Tracking**: Completion certificates
- **Discipleship Pathways**: Stage-based growth
- **Outreach Logging**: Track evangelism activities
- **Resource Store**: Sell books, materials

---

## 7. Security Center

**Purpose**: Security incidents, audit logs, alerts

### Key Pages
- `src/pages/security/Incidents.tsx` - Incident tracking
- `src/pages/security/LoginEvents.tsx` - Audit log
- `src/pages/security/Alerts.tsx` - Security alerts

### Database Tables
- `incidents` / `incident_status_logs` / `incident_updates`
- `security_alerts`
- `login_events`

### Features
- **Incident Reporting**: Security event logging
- **Status Tracking**: Open, investigating, resolved
- **Audit Log**: All login events
- **Alerts**: Automated security notifications

---

## 8. Analytics & Reports

**Purpose**: Data insights, trends, exports

### Key Pages
- `src/pages/analytics/Dashboard.tsx` - Analytics dashboard
- `src/pages/analytics/MembershipReport.tsx` - Member statistics
- `src/pages/analytics/FinanceReport.tsx` - Financial analytics
- `src/pages/analytics/GivingReport.tsx` - Donation trends
- `src/pages/analytics/AttendanceReport.tsx` - Attendance analytics

### Database Tables
- `saved_reports`
- `activity_log`

### Features
- **Dashboard Widgets**: Key metrics at a glance
- **Trend Charts**: Membership, giving, attendance
- **Custom Reports**: Build and save reports
- **Export**: CSV, PDF, Excel
- **Date Filtering**: Compare periods

### Libraries
- **Recharts**: Data visualization
- **papaparse**: CSV generation
- **jsPDF**: PDF reports

---

## 9. Settings

**Purpose**: Church configuration, users, integrations

### Key Pages
- `src/pages/settings/General.tsx` - Church profile
- `src/pages/settings/Users.tsx` - User management
- `src/pages/settings/Staff.tsx` - Staff directory
- `src/pages/settings/Integrations.tsx` - Third-party connections
- `src/pages/settings/Billing.tsx` - Subscription management
- `src/pages/settings/SEO.tsx` - Public page SEO
- `src/pages/settings/ChildrensMinistry.tsx` - Children's check-in

### Database Tables
- `tenants` / `tenant_seo_settings`
- `users` / `custom_roles` / `role_permissions`
- `integration_settings`
- `tenant_subscriptions` / `billing_history`
- `children_ministry_settings`

### Features
- **Church Profile**: Name, logo, contact
- **User Management**: Invite, roles, permissions
- **Integration Config**: API keys, webhooks
- **Billing**: Plan upgrades, usage limits
- **SEO Settings**: Meta tags for public pages
- **Children's Ministry**: QR check-in system

---

## 10. Member Portal

**Purpose**: Member-facing features

### Key Pages
- `src/pages/member/MemberWelcome.tsx` - Member home
- `src/pages/member/MemberProfile.tsx` - Self-service profile
- `src/pages/member/MemberGive.tsx` - Online giving
- `src/pages/member/MemberMessages.tsx` - Message staff
- `src/pages/member/MemberAnnouncements.tsx` - View announcements
- `src/pages/member/MemberEvents.tsx` - RSVP to events
- `src/pages/member/MemberSermons.tsx` - Listen to sermons
- `src/pages/member/MemberBible.tsx` - Bible study tools

### Features
- **Profile Management**: Update own info
- **Online Giving**: M-Pesa, bank transfer
- **Event Registration**: RSVP with +guests
- **Staff Messaging**: Private 1-on-1 with staff
- **Bible Explorer**: Notes, highlights, reading progress
- **Sermon Access**: Stream or download
- **Announcement Feed**: Latest updates

### Context
- `MemberPortalContext` - Separate from ChurchContext
- Auth via `auth.users` + `members` table match

---

**Next**: Read `08-architectural-decisions.md` for why we built it this way.
