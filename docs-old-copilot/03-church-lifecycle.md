# VestryHub - Church Lifecycle & User Journeys

This document explains step-by-step how churches, admins, members, and visitors move through the system.

## 1. Church Onboarding: Creating a New Church Account

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Supabase Auth
    participant PostgreSQL
    participant Email Service

    User->>Frontend: Visit /signup
    User->>Frontend: Enter church details + email
    Frontend->>Supabase Auth: signUp(email, password)
    Supabase Auth->>PostgreSQL: Create auth.users record
    Supabase Auth-->>Frontend: user_id + session
    
    Frontend->>PostgreSQL: INSERT INTO tenants
    Note over PostgreSQL: Creates church record
    PostgreSQL-->>Frontend: tenant_id
    
    Frontend->>PostgreSQL: INSERT INTO users
    Note over PostgreSQL: Links user to tenant<br/>role = 'super_admin'
    PostgreSQL-->>Frontend: Success
    
    Frontend->>PostgreSQL: INSERT INTO members
    Note over PostgreSQL: Same ID as users record<br/>(unified identity)
    
    Frontend->>Email Service: Send welcome email
    Frontend->>User: Redirect to /onboarding
    
    User->>Frontend: Complete onboarding wizard
    Note over Frontend: Church profile<br/>Branding<br/>Settings
    Frontend->>PostgreSQL: UPDATE tenants<br/>SET onboarding_completed = true
    
    Frontend->>User: Redirect to /dashboard
```

### Key Files
- **Page**: `src/pages/auth/Signup.tsx`
- **Wizard**: `src/pages/Onboarding.tsx`
- **Context**: `src/contexts/ChurchContext.tsx`

### Database Changes
1. Creates `tenants` record
2. Creates `users` record with `role = 'super_admin'`
3. Creates `members` record with same ID (unified identity)
4. Creates default `tenant_subscriptions` record (trial)

## 2. Adding Admin Users (3 Paths)

### Path A: Email Invite (Primary Method)

```mermaid
flowchart TD
    A[Admin opens Users page] --> B[Click 'Invite User']
    B --> C[Enter: email, first_name, last_name, role]
    C --> D[Submit]
    D --> E[Edge Function: send-invite-email]
    E --> F[Generate magic link token]
    F --> G[Send email with link]
    
    H[New user clicks email link] --> I[Redirects to /auth/invite-callback]
    I --> J[Parse token from URL]
    J --> K[Supabase: verifyOtp]
    K --> L{Valid?}
    L -->|No| M[Error: Invalid link]
    L -->|Yes| N[Supabase: signInWithOtp]
    N --> O[Create Supabase auth.users]
    O --> P[Edge Function: update-user-role]
    P --> Q[Upsert users table record]
    Q --> R[Create members record same ID]
    R --> S[Set role, tenant_id, status=active]
    S --> T[Redirect to /dashboard]
```

**Key Files**:
- **Admin UI**: `src/pages/settings/Users.tsx` → `UserInviteDialog`
- **Callback**: `src/pages/auth/InviteCallback.tsx`
- **Edge Function**: `supabase/functions/send-invite-email`

**Database Changes**:
1. Supabase Auth creates `auth.users` record
2. `InviteCallback` calls edge function to upsert `users` table
3. Edge function also creates `members` record with same ID
4. Sets `role`, `tenant_id`, `status = 'active'`

### Path B: Direct Add (Manual Creation)

```mermaid
flowchart TD
    A[Admin creates user directly] --> B[Enter: email, password, role]
    B --> C[Supabase Auth: signUp]
    C --> D[Create auth.users]
    D --> E[Insert users table]
    E --> F[Insert members table same ID]
    F --> G[User receives credentials email]
```

**Used when**: Bulk importing staff or setting up accounts offline

### Path C: Reactivation (Inactive → Active)

```mermaid
flowchart TD
    A[Admin finds inactive user] --> B[Click 'Reactivate']
    B --> C[UPDATE users SET status='active']
    C --> D[Call edge function: create-staff-thread]
    D --> E[Check: is staff directory thread exists?]
    E -->|No| F[CREATE conversations record]
    F --> G[is_staff_directory=true, staff_user_id=user_id]
    G --> H[Success]
    E -->|Yes| H
```

**Key Files**:
- **Admin UI**: `src/pages/settings/Users.tsx`
- **Edge Function**: `supabase/functions/create-staff-thread`
- **Edge Function**: `supabase/functions/update-user-role`

**Database Changes**:
1. `UPDATE users SET status = 'active'`
2. Creates staff directory thread in `conversations` table
3. Allows members to message this staff member

## 3. Adding Members (4 Paths)

### Path A: Admin-Added Member

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend
    participant PostgreSQL

    Admin->>Frontend: Navigate to /people/members
    Admin->>Frontend: Click 'Add Member'
    Admin->>Frontend: Fill form (name, email, phone, etc.)
    Admin->>Frontend: Submit
    
    Frontend->>PostgreSQL: INSERT INTO members
    Note over PostgreSQL: tenant_id from context<br/>status = 'active'<br/>created_by = admin_user_id
    PostgreSQL-->>Frontend: member_id
    
    Frontend->>Frontend: invalidateQueries(['members'])
    Frontend->>Admin: Toast: "Member added"
    Frontend->>Admin: Redirect to member profile
```

**Key Files**:
- **Page**: `src/pages/people/Members.tsx`
- **Component**: `src/components/members/MemberForm.tsx`
- **Profile**: `src/pages/people/MemberProfile.tsx`

**Database Changes**:
- Single `INSERT INTO members`
- No `users` record created (member cannot log in yet)
- Can later be invited to member portal

### Path B: CSV Import

```mermaid
flowchart TD
    A[Admin uploads CSV] --> B[Parse CSV with papaparse]
    B --> C[Validate columns]
    C --> D[Map to member fields]
    D --> E[Batch INSERT members]
    E --> F[Show import summary]
    F --> G[Success: X added, Y skipped]
```

**Key Files**:
- **Component**: `src/components/members/MemberImportDialog.tsx`
- **Library**: `papaparse` for CSV parsing

### Path C: Visitor Conversion

```mermaid
flowchart TD
    A[Visitor record exists] --> B[Admin opens visitor profile]
    B --> C[Click 'Convert to Member']
    C --> D[Pre-fill member form with visitor data]
    D --> E[Admin reviews/edits]
    E --> F[Submit]
    F --> G[INSERT INTO members]
    G --> H[UPDATE visitors SET converted_to_member=true]
    H --> I[Move to members list]
```

**Key Files**:
- **Page**: `src/pages/people/Visitors.tsx`
- **Component**: Visitor detail view with convert button

**Database Changes**:
1. `INSERT INTO members` (copy data from visitor)
2. `UPDATE visitors SET converted_to_member = true, converted_at = now()`

### Path D: Self-Registration (Member Portal)

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Supabase Auth
    participant PostgreSQL

    User->>Frontend: Visit /member/register
    User->>Frontend: Enter: email, name, phone
    Frontend->>Supabase Auth: signUp(email, generated_password)
    Supabase Auth->>PostgreSQL: Create auth.users
    Supabase Auth-->>Frontend: user_id
    
    Frontend->>PostgreSQL: INSERT INTO members
    Note over PostgreSQL: Uses same ID as auth.users<br/>status = 'active'<br/>join_date = today
    PostgreSQL-->>Frontend: Success
    
    Frontend->>PostgreSQL: Send notification to admins
    Frontend->>User: Redirect to /member/welcome
```

**Key Files**:
- **Page**: `src/pages/MemberRegistration.tsx`
- **Context**: `src/contexts/MemberPortalContext.tsx`

**Database Changes**:
1. `auth.users` record created
2. `members` record with same ID
3. `notifications` sent to church admins

## 4. Visitor Pipeline

```mermaid
flowchart TD
    A[Visitor arrives] -->|Public form| B[Self-register online]
    A -->|Admin entry| C[Admin adds visitor]
    
    B --> D[Record in visitors table]
    C --> D
    
    D --> E[follow_up_status = 'pending']
    E --> F[Admin assigns follow-up task]
    F --> G[follow_up_tasks record]
    
    G --> H[Staff contacts visitor]
    H --> I[Update: follow_up_status = 'contacted']
    
    I --> J{Visitor returns?}
    J -->|Yes| K[Second visit logged]
    K --> L[Admin decides: Convert?]
    L -->|Yes| M[Convert to Member]
    M --> N[INSERT INTO members]
    N --> O[UPDATE visitors<br/>converted_to_member = true]
    
    J -->|No| P[follow_up_status = 'completed']
    P --> Q[Archive visitor record]
```

### Visitor Followup Flow

**Key Tables**:
- `visitors` - Basic visitor info
- `visitor_followup_notes` - Communication log
- `follow_up_tasks` - Assigned follow-up actions

**Key Files**:
- **Page**: `src/pages/people/Visitors.tsx`
- **Public Form**: `src/pages/VisitorRegistration.tsx`

### Visitor Status States
- `pending` - New visitor, no contact yet
- `contacted` - Initial contact made
- `scheduled` - Follow-up meeting scheduled
- `completed` - Follow-up done, visitor decision made

## 5. Member Portal Access

Not all members have portal access. Portal access is granted when:

```mermaid
flowchart TD
    A[Member exists in members table] --> B{Has matching auth.users?}
    B -->|No| C[Admin invites via email]
    B -->|Yes| D[Already has access]
    
    C --> E[send-invite-email edge function]
    E --> F[Member clicks magic link]
    F --> G[Create auth.users record]
    G --> H[Member can log into portal]
    
    D --> I[Member logs into /member/login]
    I --> J[Supabase Auth verifies]
    J --> K[MemberPortalContext loads]
    K --> L[Query members table by auth.uid]
    L --> M[Redirect to /member/welcome]
```

**Key Files**:
- **Login**: `src/pages/member/Login.tsx` (member-specific login)
- **Context**: `src/contexts/MemberPortalContext.tsx`
- **Welcome**: `src/pages/member/MemberWelcome.tsx`

### Member Portal Features
Once logged in, members can:
- View announcements
- Give online
- RSVP to events
- Message staff (direct 1-on-1)
- Access sermon library
- Use Bible study tools
- View/update their profile

## 6. Staff Directory & Messaging

When a user is added/reactivated as staff:

```mermaid
flowchart TD
    A[User added with status=active] --> B[Edge function: create-staff-thread]
    B --> C[INSERT INTO conversations]
    C --> D[type='direct'<br/>is_staff_directory=true<br/>staff_user_id=user_id]
    
    E[Member logs into portal] --> F[Query staff directory threads]
    F --> G[Show 'Church Staff' section]
    
    H[Member clicks staff member] --> I[joinStaffThread function]
    I --> J{Private thread exists?}
    J -->|Yes| K[Open existing thread]
    J -->|No| L[Create private conversation]
    L --> M[type='direct'<br/>is_staff_directory=false]
    M --> N[Add both as participants]
    N --> K
    K --> O[Chat interface opens]
```

**Key Concepts**:
- **Staff Directory Threads**: Discovery mechanism (is_staff_directory=true)
- **Private Threads**: Actual 1-on-1 conversations (is_staff_directory=false)
- Each member gets their own private thread with each staff member
- Staff directory threads are hidden from admin inbox (staff-to-staff filter)

**Key Files**:
- **Admin Side**: `src/pages/communications/MemberMessaging.tsx`
- **Member Side**: `src/pages/member/MemberMessages.tsx`
- **Edge Function**: `supabase/functions/create-staff-thread`

## 7. Permission Inheritance

```mermaid
flowchart TD
    A[User has role] --> B{Role?}
    B -->|super_admin| C[Full access to everything]
    B -->|admin| D[All modules except billing]
    B -->|pastor| E[People, Events, Media, Communications]
    B -->|staff| F[Limited based on role_permissions]
    B -->|member| G[Read-only dashboards]
    
    D --> H[usePermissions hook]
    E --> H
    F --> H
    G --> H
    
    H --> I{Feature check}
    I -->|isReadOnly| J[Show UI, disable actions]
    I -->|!canAccess| K[Hide feature entirely]
    I -->|can write| L[Full CRUD access]
```

**Permission Check Example**:
```typescript
const { isReadOnly, canAccess } = usePermissions();

// Hide feature if no access
if (!canAccess('finance')) {
  return null;
}

// Show but disable actions
const readOnly = isReadOnly('finance');

<PermissionButton 
  permission="finance"
  onClick={handleDelete}
  readOnly={readOnly}
>
  Delete
</PermissionButton>
```

**Key Files**:
- **Hook**: `src/hooks/usePermissions.ts`
- **Component**: `src/components/shared/PermissionButton.tsx`
- **Context**: `src/contexts/ChurchContext.tsx` (provides role)

---

## Summary of ID Relationships

| Scenario | auth.users | users table | members table |
|----------|------------|-------------|---------------|
| Super Admin (first user) | ✓ | ✓ same ID | ✓ same ID |
| Invited Admin | ✓ | ✓ same ID | ✓ same ID |
| Admin-added Member | ✗ | ✗ | ✓ |
| Member with Portal Access | ✓ | ✗ | ✓ same ID |
| Visitor | ✗ | ✗ | ✗ (visitors table) |

**Key Principle**: When someone has BOTH admin access AND member status, they share the same ID across `auth.users`, `users`, and `members`.

---

**Next**: Read `04-authentication-and-permissions.md` for the complete security model.
