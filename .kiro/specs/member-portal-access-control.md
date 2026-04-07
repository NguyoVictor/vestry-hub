## IMPORTANT — READ BEFORE DOING ANYTHING:

The member portal pages already exist at src/pages/member/:
JoinChurch.tsx, MemberLogin.tsx, ProfileSetup.tsx, MemberHome.tsx,
MemberGive.tsx, MemberGivingHistory.tsx, MemberEvents.tsx,
MemberSermons.tsx, MemberBible.tsx, MemberAnnouncements.tsx,
MemberMessages.tsx, MemberGroups.tsx, MemberProfile.tsx,
MemberRequests.tsx, MemberTestimonies.tsx, MemberSettings.tsx

READ every single one of these files FIRST before writing any code.
Understand what is already there. Then implement the spec below by
MODIFYING what exists — do not rewrite files from scratch unless a
file is completely wrong. Preserve all existing functionality and
only add what the spec describes as missing.

Also read these files before touching anything:
- src/hooks/useChurch.ts
- src/lib/schema.ts
- src/lib/supabase.ts
- Any existing MemberAuthGuard or member context files
- Any existing QR code modal component in the admin dashboard

Do the implementation in this exact order — do not skip steps:
Step 1 — Database migrations only
Step 2 — Generate church codes for existing tenants
Step 3 — Build the three Edge Functions
Step 4 — Update MemberLogin.tsx
Step 5 — Update JoinChurch.tsx
Step 6 — Update MemberHome.tsx
Step 7 — Add module visibility toggles in Settings
Step 8 — Update the QR code modal
Step 9 — Update the Add Member form in admin dashboard
Step 10 — End-to-end verify: no console errors on all member routes

---

# Member Portal — Access Control, QR Registration & Module Visibility

## CONTEXT
The member portal pages already exist and are built.
The QR code modal already exists in the admin dashboard.
The member registration form already exists at the public URL.

This spec adds the missing layer — how members actually GET ACCESS
to the portal, the church code login requirement, the visitor/member
distinction, and the admin module visibility toggles.

Do not rebuild what already exists. Only add what is missing.
Always use TABLES and COLS constants from src/lib/schema.ts.
Always use tenant_id not church_id. Always use tenants not churches.

---

## THE COMPLETE ACCESS FLOW — How Members Get In

There are exactly THREE ways a member gets access to the portal.
All three must be supported simultaneously.

---

### WAY 1 — QR Code Scan (Self-Registration)

The church admin shares their unique church QR code.
A person scans it with their phone camera.
They land on the public registration form.

**What needs to change on the registration form (JoinChurch.tsx):**

Add a required field at the TOP of the form — before all other fields:
```
I am a: ( ) Member  ( ) Visitor
```

Radio button — required. Default: Member.

This single field determines which category they fall into:
- Member selected → on submit: INSERT into members table with
  status = 'active' and member_type = 'member'
  + INSERT into activity_log type 'new_member'
- Visitor selected → on submit: INSERT into members table with
  status = 'visitor' and member_type = 'visitor'
  + INSERT into activity_log type 'new_visitor'

Both appear in the correct admin section:
- Members (status = 'active') → visible in /members page
- Visitors (status = 'visitor') → visible in /visitors page

After submitting the form successfully — show a success screen:
- Church logo at top
- "Welcome to {Church Name}! 🎉" heading
- "Your registration is complete." subtext
- The church access code displayed large and prominent:
  ┌─────────────────────┐
  │     HOPE-2847       │  [Copy Code]
  └─────────────────────┘
- Text below: "Save this code — you will need it every time
  you sign in to the {Church Name} member portal"
- "Sign In Now" button → redirects to /member/login
- Option to download a welcome card PDF with their name +
  church name + access code (use @react-pdf/renderer)

---

### WAY 2 — Church Access Code Login (Returning Members)

Update MemberLogin.tsx to require TWO fields:

Field 1 — Email address
The email the member used when they registered.

Field 2 — Church Access Code
The unique code for their church (church_code column on tenants table).
Input styling: uppercase, monospace font, tracking-widest, maxLength=9
Placeholder: "e.g. HOPE-2847"

Login flow:
1. Member enters email + church access code
2. Call Supabase Edge Function 'member-login'
3. Edge Function looks up tenant by church_code
4. Edge Function looks up member by email + tenant_id
5. If found: generate session token, store in member_sessions table,
   return member record + tenant record
6. Frontend stores session in localStorage as 'member_session':
   { memberId, tenantId, memberName, memberType, expiresAt }
7. Redirect to /member-services

Error states:
- Email not found for this church: "No member found with this email
  for this church. Did you register yet?" + "Register Now" button
  linking to the church's registration form
- Wrong church code: "Invalid church code. Please check the code
  with your church admin."
- Both wrong: "Invalid credentials. Please check your details."

Below the church code input show:
"Forgot your church code? Contact your church admin — they can find
it in Settings → Quick Links & QR Codes."

If URL contains ?code=XXXX-XXXX parameter:
- Auto-fill the church code field
- Look up the tenant by that code
- Show the church logo + name at the top of the login page
  (makes it feel branded to that church)

MemberAuthGuard:
- Check localStorage for 'member_session'
- If not present or expired: redirect to /member/login
- If present: validate it is not expired (check expiresAt)
- Pass member data down via a MemberContext

---

### WAY 3 — Admin Manual Registration (Skip the Form)

When an admin saves a new member via the Add Member form
in the admin dashboard (/members page), after successful save
show an additional step in the success state:

"Send {member name} their portal access details?"

Show two buttons:
- "Send via Email" → calls Edge Function 'send-member-welcome'
  with channel: 'email'
  Sends a Resend email containing:
  - Church logo + name header
  - "You have been registered as a member of {Church Name}"
  - Member's name
  - Their email address
  - The church access code displayed large
  - Instructions: "Visit vestry.app/member/login and enter your
    email and this code to access the member portal"
  - The church QR code image embedded in the email

- "Send via SMS" → calls Edge Function 'send-member-welcome'
  with channel: 'sms'
  Sends via Africa's Talking:
  "Welcome to {Church Name}! You've been registered as a member.
  Your church access code is: {CODE}.
  Sign in at vestry.app/member/login"

- "Copy Details" button → copies to clipboard:
  "Church: {name} | Email: {email} | Code: {CODE}"

- "Skip for now" link

The manually added member does NOT fill the registration form.
Admin already captured their details. They just need the code.

---

## PART 2 — Church Code Auto-Generation

Run this SQL in Supabase:
```sql
CREATE OR REPLACE FUNCTION generate_church_code(church_name TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  suffix TEXT;
  full_code TEXT;
  exists_count INT;
BEGIN
  prefix := UPPER(REGEXP_REPLACE(church_name, '[^a-zA-Z0-9]', '', 'g'));
  prefix := LEFT(prefix, 4);
  prefix := RPAD(prefix, 4, 'X');

  LOOP
    suffix := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    full_code := prefix || '-' || suffix;
    SELECT COUNT(*) INTO exists_count
    FROM tenants WHERE church_code = full_code;
    EXIT WHEN exists_count = 0;
  END LOOP;

  RETURN full_code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_church_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.church_code IS NULL OR NEW.church_code = '' THEN
    NEW.church_code := generate_church_code(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_church_code
  BEFORE INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION set_church_code();

-- Generate codes for existing tenants that don't have one
UPDATE tenants
SET church_code = generate_church_code(name)
WHERE church_code IS NULL OR church_code = '';

-- Add columns to members table
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS member_type TEXT DEFAULT 'member'
    CHECK (member_type IN ('member', 'visitor')),
  ADD COLUMN IF NOT EXISTS registration_source TEXT DEFAULT 'admin'
    CHECK (registration_source IN (
      'qr_scan', 'admin', 'invite_email', 'invite_sms'
    )),
  ADD COLUMN IF NOT EXISTS portal_last_seen TIMESTAMPTZ;

-- Member sessions table
CREATE TABLE IF NOT EXISTS member_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id VARCHAR NOT NULL,
  tenant_id VARCHAR NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE member_sessions ENABLE ROW LEVEL SECURITY;
```

---

## PART 3 — Edge Functions

### Edge Function: member-login
File: supabase/functions/member-login/index.ts

Accepts POST: { email: string, churchCode: string }

Logic:
1. Look up tenant WHERE church_code = churchCode
2. If no tenant: return { error: 'invalid_code' }
3. Look up member WHERE email = email AND tenant_id = tenant.id
   AND status != 'inactive'
4. If no member: return { error: 'member_not_found' }
5. Generate session_token = crypto.randomUUID() + Date.now()
6. INSERT into member_sessions:
   { member_id, tenant_id, session_token,
     expires_at: now() + 30 days }
7. Return: { member, tenant, sessionToken }

### Edge Function: member-register
File: supabase/functions/member-register/index.ts

Accepts POST: { churchCode, firstName, lastName, email, phone,
               gender, dateOfBirth, address, city, occupation,
               maritalStatus, memberType }

Logic:
1. Look up tenant WHERE church_code = churchCode
2. If no tenant: return { error: 'invalid_code' }
3. Check if member exists with this email + tenant_id
4. If exists: return { error: 'already_registered' }
5. INSERT into members with all fields + member_type +
   registration_source = 'qr_scan'
6. If memberType = 'visitor': also note in metadata
7. INSERT into activity_log
8. Return: { member, churchCode: tenant.church_code,
             churchName: tenant.name, churchLogo: tenant.logo }

### Edge Function: send-member-welcome
File: supabase/functions/send-member-welcome/index.ts

Accepts POST: { memberId, tenantId, channel: 'email' | 'sms' }

Logic:
1. Look up member by memberId
2. Look up tenant by tenantId
3. If channel = 'email':
   Use Resend (RESEND_API_KEY secret) to send welcome email
4. If channel = 'sms':
   Use Africa's Talking (AT_API_KEY, AT_USERNAME secrets)
   to send welcome SMS
5. Return: { success: true }

---

## PART 4 — QR Code Modal Enhancement

Find the existing QR code modal in the admin dashboard.
Read it first to understand its current structure.
Then add:

1. Display the church access code prominently in the modal:
```
Your Church Access Code
┌─────────────────────────┐
│       HOPE-2847         │  [Copy]
└─────────────────────────┘
Members need this code + their email to sign in to the portal
```

2. Add a "Member Login QR" tab/option that generates a QR code
   pointing to: /member/login?code={churchCode}
   So scanning it pre-fills the church code on the login page

3. Add a "Giving QR" tab pointing to: /give/{churchSlug}

4. Each QR type shows: QR image + URL (copyable) +
   Download QR button + Share Link button

---

## PART 5 — Admin Module Visibility Toggles

Location: Settings → Member App (already exists as a menu item)

Build a page at /settings/member-app with a grid of toggles.
One toggle per module that appears in the member portal.
Each row: module icon + module name + description + On/Off Switch

When a toggle changes:
- PATCH tenants table: update enabled_modules JSONB column
- Use a separate namespace to avoid collision with admin modules:
  enabled_modules.member_portal = { give_online: true,
  announcements: true, messages: true, ... }
- Show toast.success("Portal updated") on each change

Modules to include with their default states:
- Give Online → true
- Pledge Campaigns → true
- My Giving History → true
- Announcements → true
- Messages → true
- Chat on WhatsApp → false
- Testimonies → true
- Share Your Testimony → true
- Service Request → true
- Opinion Box → true
- Counselling → true
- My Appointments → true
- Upcoming Events & Services → true
- Watch Live → true
- Sermons & Messages → true
- Church Media → true
- Outreach Impact → false
- Volunteer → true
- Join Volunteer Groups → true
- House Fellowships → true
- Surveys → true
- Bible Explorer → true
- Daily Devotionals → true
- Training & Courses → true
- My Discipleship Journey → true
- My Sermon Notes → true
- Facility Booking → false
- Resource Store → true

In MemberHome.tsx:
Before rendering each service card, check:
tenant.enabled_modules?.member_portal?.[moduleKey] !== false
If the value is false → do not render that card at all.
Hidden completely — not greyed out, not disabled. Just gone.

---

## PART 6 — Member Login Page Layout

Update MemberLogin.tsx to match this layout exactly:
```tsx
<div className="min-h-screen bg-slate-50 flex items-center
                justify-center p-4">
  <div className="w-full max-w-md space-y-6">

    {/* Church branding (shown if ?code= in URL and tenant found) */}
    <div className="text-center">
      {church?.logo
        ? <img src={church.logo} className="w-16 h-16 rounded-full
                   mx-auto mb-3 object-cover" />
        : <div className="w-16 h-16 rounded-full bg-indigo-100
                          flex items-center justify-center mx-auto mb-3">
            <Church className="text-indigo-600" size={28} />
          </div>
      }
      <h1 className="text-xl font-bold text-slate-900">
        {church?.name ?? 'Member Portal'}
      </h1>
      <p className="text-sm text-slate-500">
        Sign in to access your church services
      </p>
    </div>

    <div className="bg-white rounded-2xl shadow-sm border
                    border-slate-200 p-6 space-y-4">

      {/* Email field */}
      {/* Church Access Code field — uppercase, monospace */}
      {/* Sign In button */}
      {/* "Not registered yet? Scan your church QR code" link */}
      {/* "Forgot your church code?" link */}

    </div>

  </div>
</div>
```

---

## PERFORMANCE & SECURITY NOTES FOR KIRO

- Member sessions expire after 30 days
- session_token must be cryptographically random
- Never expose the Supabase service role key to the frontend
- All Edge Functions use the service role key server-side only
- The member_sessions table does NOT need RLS because it is only
  accessed via Edge Functions using the service role key
- When checking member_session in localStorage, always verify
  expiresAt > new Date() before treating it as valid
- On sign out: DELETE from member_sessions WHERE
  session_token = currentToken + clear localStorage
- The church_code is NOT a secret — it is shared publicly on
  QR codes and welcome emails. Security comes from requiring
  the member's email to match a registered member for that church.
- Always call the Edge Functions — never query member_sessions
  directly from the frontend