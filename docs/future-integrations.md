# Future Integrations

This document tracks pending external configuration steps and planned integrations for Vestry Hub.

---

## 1. Email — Custom Domain via Resend

**Current state:** Booking confirmation emails are sent from `onboarding@resend.dev` (Resend's universal test sender). This works on all accounts without domain verification but shows Resend's domain in the sender field.

**To permanently fix with your own domain:**

1. Go to [resend.com](https://resend.com) → **Domains**
2. Click **Add Domain** and enter your domain (e.g. `yourdomain.com`)
3. Add the DNS records Resend provides to your domain registrar (TXT + MX records)
4. Wait for verification (usually 5–30 minutes)
5. Once verified, update the `from` address in the `send-booking-confirmation` edge function:

```typescript
// supabase/functions/send-booking-confirmation/index.ts
// Change this line:
const fromAddress = `${senderName} <onboarding@resend.dev>`;

// To:
const fromAddress = `${senderName} <noreply@yourdomain.com>`;
```

6. Redeploy the edge function via Supabase dashboard or CLI:
```bash
supabase functions deploy send-booking-confirmation
```

**Recommended sender address:** `noreply@yourdomain.com` or `bookings@yourdomain.com`

---

## 2. SMS — Africa's Talking

**Current state:** SMS confirmations show "Coming Soon" in the UI. The `send-booking-confirmation` edge function already has SMS support via Africa's Talking but it requires the following secrets to be set in Supabase:

| Secret | Description |
|--------|-------------|
| `AT_API_KEY` | Africa's Talking API key |
| `AT_USERNAME` | Africa's Talking username (sandbox or production) |

**To enable SMS:**

1. Create an account at [africastalking.com](https://africastalking.com)
2. Get your API key and username from the dashboard
3. Add secrets to Supabase:
   - Dashboard → Settings → Edge Functions → Secrets
   - Add `AT_API_KEY` and `AT_USERNAME`
4. Remove the "Coming Soon" badge from the SMS buttons in `src/pages/operations/FacilityBooking.tsx`

---

## 3. Push Notifications — Firebase Cloud Messaging

**Current state:** The `send-push-notification` edge function is deployed. Push notifications are not yet wired to facility booking events.

**To enable:**
1. Set up a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add `FIREBASE_SERVER_KEY` to Supabase secrets
3. Integrate FCM token registration in the member portal

---

## 4. WhatsApp — Meta Business API

**Current state:** WhatsApp messaging infrastructure exists (`send-whatsapp-message` edge function deployed). Not yet connected to facility booking notifications.

**To enable:**
1. Set up a Meta Business account and WhatsApp Business API
2. Add `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` to Supabase secrets

---

*Last updated: April 2026*
