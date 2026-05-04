# Resend Email Configuration - Vestry Hub

**Date:** May 3, 2026  
**Status:** Active and Configured

---

## 📧 Overview

Vestry Hub uses **Resend** as its transactional email service provider for sending all automated emails to users, members, and administrators.

---

## 🔑 API Key Configuration

### Supabase Secret
The Resend API key is stored as a **Supabase Edge Function secret**, not in the frontend code or .env file.

**Secret Name:** `RESEND_API_KEY`  
**Storage Location:** Supabase Project Secrets (Edge Functions environment variables)  
**Access:** Only accessible by Supabase Edge Functions (server-side)

### How to View/Update
1. Go to Supabase Dashboard → Project Settings → Edge Functions
2. Navigate to "Secrets" or "Environment Variables"
3. Look for `RESEND_API_KEY`

**Note:** The .env file has a comment indicating this:
```bash
# Resend — Email (key stored as Supabase secret, not in frontend)
```

---

## 📨 Email Sending Configuration

### From Addresses
Vestry Hub uses two "from" addresses depending on the email type:

1. **General Platform Emails:**
   - `Vestry Hub <noreply@vestry.app>`
   - Used for: Member welcome emails, system notifications

2. **Church-Branded Emails:**
   - `{Church Name} via Vestry Hub <noreply@vestry.app>`
   - Used for: Staff invitations
   
3. **Church Communications:**
   - `{Church Name} <support@vestryhub.com>`
   - Used for: Bulk communications, broadcasts, test emails

### Email Branding
All emails use the `buildBrandedEmail()` helper function located in:
- `supabase/functions/_shared/branded-email.ts`

This function:
- Fetches church logo from tenants table
- Applies church branding (colors, logo)
- Wraps content in a professional email template
- Adds footer with church information

---

## 📬 Emails Currently Being Sent

### 1. **Staff Invitation Emails**
**Edge Function:** `supabase/functions/send-invitation/index.ts`  
**Trigger:** When an admin invites a new staff member  
**From:** `{Church Name} via Vestry Hub <noreply@vestry.app>`  
**To:** Invited staff member's email  
**Subject:** `You've been invited to join {Church Name} on Vestry Hub`  
**Content:**
- Invitation message from the inviter
- Role information (admin, pastor, etc.)
- "Accept Invitation" CTA button
- Redirect to auth callback for account setup

**Code:**
```typescript
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const emailRes = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({ 
    from: `${church_name} via Vestry Hub <noreply@vestry.app>`, 
    to: [email], 
    subject, 
    html 
  }),
});
```

---

### 2. **Member Welcome Emails**
**Edge Function:** `supabase/functions/send-member-welcome/index.ts`  
**Trigger:** When a new member is added to the church  
**From:** `Vestry Hub <noreply@vestry.app>`  
**To:** Member's email  
**Subject:** `Welcome to {Church Name} — Your Member Portal Access`  
**Content:**
- Welcome message with member's first name
- Church access code (8-character code)
- Member's email for login
- "Sign In to Member Portal" CTA button
- Link to member portal login

**Special Features:**
- Displays church access code in a highlighted box
- Includes member's email for reference
- Branded with church logo and colors

**Code:**
```typescript
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ 
    from: "Vestry Hub <noreply@vestry.app>", 
    to: member.email, 
    subject, 
    html 
  }),
});
```

---

### 3. **Bulk Communications / Broadcasts**
**Edge Function:** `supabase/functions/send-communication/index.ts`  
**Trigger:** When admin sends a broadcast message  
**From:** `{Church Name} <support@vestryhub.com>`  
**To:** Selected recipients (members, groups, etc.)  
**Subject:** Custom (set by admin)  
**Content:** Custom (set by admin)

**Features:**
- **Personalization:** Supports placeholders:
  - `{{first_name}}` → Member's first name
  - `{{last_name}}` → Member's last name
  - `{{full_name}}` → Member's full name
  - `{{member_name}}` → Member's full name
  - `{{church_name}}` → Church name
- **Test Emails:** Can send test emails to admin before bulk send
- **Scheduled Sending:** Can schedule emails for future delivery
- **Bulk Sending:** Sends personalized emails to multiple recipients
- **Tracking:** Logs all communications to database

**Test Email:**
```typescript
// Test email configuration
const testSubject = "✏ Test Email - Vestry Hub";
const bodyHtml = `
  <p>Hello ${firstName},</p>
  <p>This is a test email from <strong>Vestry Hub</strong>...</p>
`;
```

**Bulk Email:**
```typescript
// Personalizes each email per recipient
for (const recipient of recipients) {
  const personalised = body
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{last_name\}\}/g, lastName)
    .replace(/\{\{full_name\}\}/g, fullName)
    .replace(/\{\{member_name\}\}/g, fullName)
    .replace(/\{\{church_name\}\}/g, churchName);
}
```

---

### 4. **Facility Booking Confirmations**
**Edge Function:** `supabase/functions/send-booking-confirmation/index.ts`  
**Trigger:** When a facility booking is confirmed  
**From:** `{Church Name} <support@vestryhub.com>`  
**To:** Booking requester's email  
**Subject:** Custom (booking confirmation)  
**Content:**
- Booking details (facility, date, time)
- Confirmation message
- Booking reference number

**Code:**
```typescript
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ from, to, subject, html }),
});
```

---

### 5. **Bible Reading Reminders**
**Edge Function:** `supabase/functions/send-bible-reminder/index.ts`  
**Trigger:** Scheduled (daily/weekly based on user preferences)  
**From:** `{Church Name} <support@vestryhub.com>`  
**To:** Members who opted in for reminders  
**Subject:** Custom (Bible reading reminder)  
**Content:**
- Daily/weekly Bible reading passage
- Encouragement message
- Link to Bible Explorer

**Code:**
```typescript
const resendKey = Deno.env.get("RESEND_API_KEY");
if (!resendKey) {
  return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
    status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
```

---

## 🔄 Inbound Email Handling

### Booking Response Webhook
**Edge Function:** `supabase/functions/receive-booking-response/index.ts`  
**Purpose:** Receives inbound email replies from Resend webhooks  
**Use Case:** Members can reply to booking confirmation emails

**Webhook Detection:**
```typescript
const isResendEmail = "type" in payload && 
  typeof payload.type === "string" && 
  payload.type.startsWith("email.");
```

**Webhook Shape:**
```typescript
{
  type: "email.received",
  data: {
    from: "member@example.com",
    subject: "Re: Booking Confirmation",
    text: "Reply text",
    html: "Reply HTML",
    headers: [...]
  }
}
```

---

## 🗄️ Database Integration

### Integration Provider Enum
Resend is registered as an integration provider in the database:

**Migration:** `supabase/migrations/20260314195434_vestry_enums.sql`
```sql
CREATE TYPE integration_provider_enum AS ENUM (
  'pesapal',
  'intasend',
  'africas_talking',
  'resend'
);
```

### Communications Table
All sent emails are logged to the `communications` table:
- `tenant_id` - Church identifier
- `channel` - "email"
- `subject` - Email subject
- `body` - Email body (plain text)
- `recipient_count` - Number of recipients
- `status` - "sent", "failed", "scheduled"
- `sent_at` - Timestamp
- `scheduled_at` - For scheduled emails
- `is_test` - Boolean flag for test emails

---

## 🛡️ Error Handling

All Edge Functions include comprehensive error handling:

### Missing API Key
```typescript
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!RESEND_API_KEY) {
  return new Response(
    JSON.stringify({ error: "RESEND_API_KEY not configured" }), 
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

### Failed Send
```typescript
if (!res.ok) {
  const err = await res.text();
  throw new Error(`Resend error: ${err}`);
}
```

### Graceful Degradation
For member welcome emails, if Resend is not configured:
```typescript
if (!RESEND_API_KEY) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      no_provider: true, 
      details: { memberName, email, churchCode, loginUrl } 
    }), 
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

---

## 📊 Email Statistics

### Current Email Types: 5
1. Staff Invitations
2. Member Welcome Emails
3. Bulk Communications/Broadcasts
4. Facility Booking Confirmations
5. Bible Reading Reminders

### Edge Functions Using Resend: 5
1. `send-invitation`
2. `send-member-welcome`
3. `send-communication`
4. `send-booking-confirmation`
5. `send-bible-reminder`

### Inbound Webhooks: 1
1. `receive-booking-response` (handles Resend inbound email webhooks)

---

## 🔧 Configuration Checklist

To ensure Resend is properly configured:

- [x] **API Key Set:** `RESEND_API_KEY` stored in Supabase secrets
- [x] **Domain Verified:** `vestry.app` and `vestryhub.com` domains verified in Resend
- [x] **From Addresses Configured:**
  - `noreply@vestry.app`
  - `support@vestryhub.com`
- [x] **Webhook Configured:** Inbound email webhook pointing to `receive-booking-response`
- [x] **Email Templates:** Branded email template in `_shared/branded-email.ts`
- [x] **Error Handling:** All functions handle missing API key gracefully
- [x] **Database Logging:** All emails logged to `communications` table

---

## 🚀 Testing

### Test Email Function
The `send-communication` function includes a built-in test email feature:

```typescript
// Send test email
POST /functions/v1/send-communication
{
  "tenant_id": "...",
  "is_test": true,
  "admin_email": "admin@example.com",
  "admin_first_name": "John"
}
```

**Response:**
```json
{
  "ok": true,
  "sent_to": "admin@example.com"
}
```

---

## 📝 Legal & Compliance

Resend is mentioned in the following legal documents:

1. **Terms of Service** (`src/pages/settings/Legal.tsx`)
   - Listed under "Integrations and Third-Party Services"

2. **Data Policy** (`src/pages/legal/DataPolicy.tsx`)
   - Listed as data processor
   - Location: US
   - Compliance: SCCs + DPA

3. **Privacy Policy** (`src/pages/legal/PrivacyPolicy.tsx`)
   - Listed under "Third-Party Services"
   - Purpose: Transactional email delivery

---

## 🔐 Security Best Practices

1. ✅ **API Key Storage:** Stored as Supabase secret (not in code or .env)
2. ✅ **Server-Side Only:** All Resend calls from Edge Functions (never frontend)
3. ✅ **CORS Headers:** Proper CORS configuration on all Edge Functions
4. ✅ **Error Messages:** Generic error messages to users (detailed logs server-side)
5. ✅ **Rate Limiting:** Handled by Resend's built-in rate limits
6. ✅ **Email Validation:** All recipient emails validated before sending
7. ✅ **Webhook Security:** Webhook endpoint validates payload structure

---

## 📞 Support

### Resend Dashboard
- URL: https://resend.com/dashboard
- Access: Requires Vestry Hub Resend account credentials

### API Documentation
- URL: https://resend.com/docs
- Endpoint: `https://api.resend.com/emails`
- Method: POST
- Auth: Bearer token in Authorization header

### Rate Limits
- Free tier: 100 emails/day
- Pro tier: 50,000 emails/month
- Enterprise: Custom limits

---

## 🎯 Future Enhancements

Potential future email types:
- [ ] Password reset emails
- [ ] Event registration confirmations
- [ ] Donation receipts
- [ ] Volunteer shift reminders
- [ ] Birthday/anniversary greetings
- [ ] Sermon notes delivery
- [ ] Newsletter campaigns
- [ ] Attendance follow-ups

---

## ✅ Summary

**Resend Configuration Status:** ✅ FULLY CONFIGURED

- **API Key:** Stored in Supabase secrets as `RESEND_API_KEY`
- **Email Types:** 5 different email types currently implemented
- **Edge Functions:** 5 functions sending emails, 1 receiving webhooks
- **From Addresses:** 2 configured (`noreply@vestry.app`, `support@vestryhub.com`)
- **Branding:** All emails use branded template with church logo
- **Error Handling:** Comprehensive error handling and logging
- **Database Logging:** All emails logged to `communications` table
- **Legal Compliance:** Documented in Terms, Privacy Policy, and Data Policy

**Ready for production use!** 🚀

