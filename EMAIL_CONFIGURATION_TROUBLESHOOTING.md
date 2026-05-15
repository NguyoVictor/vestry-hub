# Email Configuration Troubleshooting Guide

## Issue: "Send Test Email" Returns 500 Error

### Problem Description
When clicking the "Send Test Email" button in the Communications module, the system returns:
- ❌ **500 Internal Server Error**
- Frontend shows: "Failed to send test email. Check your email configuration."
- Console error: `POST https://[project].supabase.co/functions/v1/send-communication 500 (Internal Server Error)`

### Root Cause Analysis

#### 1. Missing Database Tables ✅ FIXED
**Issue**: Edge Function was trying to query non-existent `email_branding` table
**Solution**: Created the missing table with proper schema:
```sql
CREATE TABLE email_branding (
  id VARCHAR PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tenant_id VARCHAR NOT NULL,
  logo_url TEXT,
  sender_photo_url TEXT,
  sender_name TEXT,
  email_signature TEXT,
  primary_color VARCHAR(7) DEFAULT '#4F46E5',
  button_color VARCHAR(7) DEFAULT '#F97316',
  text_color VARCHAR(7) DEFAULT '#1F2937',
  footer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);
```

#### 2. Missing Communications Table Columns ✅ FIXED
**Issue**: Communications table missing required columns
**Solution**: Added missing columns:
```sql
ALTER TABLE communications ADD COLUMN IF NOT EXISTS recipient_count INTEGER DEFAULT 0;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
```

#### 3. Domain Verification Issue ⚠️ **CURRENT ISSUE**
**Issue**: Resend API returns 403 error
**Error Message**: 
```json
{
  "statusCode": 403,
  "message": "The vestryhub.com domain is not verified. Please, add and verify your domain on https://resend.com/domains",
  "name": "validation_error"
}
```

### Current Status
- ✅ **Database**: All required tables and columns exist
- ✅ **Environment Variables**: RESEND_API_KEY is properly configured
- ✅ **Edge Function**: Deployed and functional
- ❌ **Domain Verification**: `vestryhub.com` not verified in Resend

## Solution Steps

### Step 1: Verify Domain in Resend Dashboard
1. **Login to Resend**: Go to [https://resend.com/domains](https://resend.com/domains)
2. **Add Domain**: Click "Add Domain" and enter `vestryhub.com`
3. **DNS Configuration**: Add the required DNS records to your domain registrar:
   - **SPF Record**: `v=spf1 include:_spf.resend.com ~all`
   - **DKIM Record**: Provided by Resend (unique per domain)
   - **DMARC Record**: `v=DMARC1; p=quarantine; rua=mailto:dmarc@vestryhub.com`
4. **Verify**: Click "Verify Domain" in Resend dashboard
5. **Wait**: DNS propagation can take up to 48 hours

### Step 2: Alternative Solutions

#### Option A: Use Different Verified Domain
If you have another verified domain, update the Edge Function:
```typescript
// In functions/send-communication/index.ts
from: `${churchName} <noreply@yourdomain.com>`,
```

#### Option B: Use Resend's Default Domain (Testing Only)
For immediate testing, use Resend's default:
```typescript
from: `${churchName} <onboarding@resend.dev>`,
```
⚠️ **Note**: This is only for testing and has limitations

### Step 3: Verify Fix
1. **Check Domain Status**: Ensure domain shows "Verified" in Resend dashboard
2. **Test Email**: Click "Send Test Email" button
3. **Check Logs**: Monitor Edge Function logs for success
4. **Verify Receipt**: Check admin email inbox

## Diagnostic Tools

### Check Environment Variables
```bash
curl -X POST "https://[project].supabase.co/functions/v1/test-env" \
  -H "Content-Type: application/json" -d "{}"
```

### Test Resend API Directly
```bash
curl -X POST "https://[project].supabase.co/functions/v1/test-resend" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

### Check Edge Function Logs
```bash
# Using Supabase CLI
supabase functions logs send-communication

# Or via Supabase Dashboard
# Go to Edge Functions > send-communication > Logs
```

## Common Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `The vestryhub.com domain is not verified` | Domain not verified in Resend | Verify domain in Resend dashboard |
| `RESEND_API_KEY not configured` | Missing API key | Add API key to Supabase Edge Functions secrets |
| `relation "email_branding" does not exist` | Missing database table | Run database migration to create table |
| `column "recipient_count" does not exist` | Missing table columns | Add missing columns to communications table |
| `Invalid API key` | Wrong or expired API key | Update API key in Supabase secrets |

## Prevention Checklist

### Before Deploying Email Features:
- [ ] Verify domain in email service provider (Resend)
- [ ] Configure DNS records (SPF, DKIM, DMARC)
- [ ] Test API key with simple email send
- [ ] Ensure all database tables exist
- [ ] Verify Edge Function environment variables
- [ ] Test with actual email addresses

### Regular Maintenance:
- [ ] Monitor domain verification status
- [ ] Check API key expiration dates
- [ ] Review email delivery rates
- [ ] Monitor Edge Function logs for errors
- [ ] Test email functionality monthly

## Files Modified During Fix

### Database Schema
- Created: `email_branding` table
- Modified: `communications` table (added columns)

### Edge Functions
- `functions/send-communication/index.ts` - Main email function
- `functions/_shared/branded-email.ts` - Email template builder
- `functions/test-env/index.ts` - Environment diagnostics
- `functions/test-resend/index.ts` - Resend API testing

### Frontend
- `src/pages/communications/Communications.tsx` - Send test email functionality

## Contact Information
- **Resend Support**: [https://resend.com/support](https://resend.com/support)
- **Supabase Docs**: [https://supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)

---

**Last Updated**: May 7, 2026  
**Status**: Domain verification pending  
**Next Action**: Verify `vestryhub.com` domain in Resend dashboard