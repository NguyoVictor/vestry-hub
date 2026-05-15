# SMS Compose Functionality - Complete Fix

## Problem Identified
When trying to send SMS from the Communications → Compose page, users got the error: **"Edge function returned a non-2xx status code"**

## Root Cause Analysis
The SMS compose functionality had multiple critical issues:

### 1. **Wrong Edge Function**
- **Problem**: The compose page called `send-communication` for both email AND SMS
- **Issue**: `send-communication` only handles EMAIL (uses Resend API), has no SMS logic
- **Fix**: Updated to call `africastalking-sms` for SMS messages

### 2. **Wrong Data Mapping**
- **Problem**: For SMS, it filtered recipients by `email` field instead of `phone`
- **Issue**: SMS needs phone numbers, not email addresses
- **Fix**: Updated to filter by `phone` field for SMS recipients

### 3. **Missing Phone Numbers in Query**
- **Problem**: Members query didn't include `phone` field
- **Issue**: Can't send SMS without phone numbers
- **Fix**: Added `phone` to the members SELECT query

### 4. **Missing Phone Support in Types**
- **Problem**: Member interface didn't include `phone` field
- **Issue**: TypeScript errors and missing phone data
- **Fix**: Added `phone: string | null` to Member interface

### 5. **Incomplete Recipient Mapping**
- **Problem**: `allSelectedRecipients` didn't include phone numbers
- **Issue**: Phone data not available for SMS sending
- **Fix**: Added `phone` field to all recipient mappings

### 6. **Manual Recipients Missing Phone Support**
- **Problem**: Manual recipients only supported email
- **Issue**: Couldn't add phone-only recipients for SMS
- **Fix**: Added phone input field and updated logic

## Files Modified

### 1. `src/pages/communications/ComposeEmail.tsx`

#### **Updated handleSend Function:**
```typescript
// Before: Called send-communication for both email and SMS
const { error } = await supabase.functions.invoke("send-communication", {
  body: { tenant_id: tenantId, channel, recipients, ... }
});

// After: Different functions for different channels
if (channel === "sms") {
  const smsRecipients = allSelectedRecipients
    .filter(r => r.phone) // Filter by phone, not email
    .map(r => ({ phone: r.phone!, ... }));
  
  const { error } = await supabase.functions.invoke("africastalking-sms", {
    body: { tenant_id: tenantId, recipients: smsRecipients, message: smsMessage }
  });
} else {
  // Email logic unchanged
}
```

#### **Updated Members Query:**
```typescript
// Before: Missing phone field
.select("id, first_name, last_name, email, status, gender, date_of_birth, join_date")

// After: Includes phone field
.select("id, first_name, last_name, email, phone, status, gender, date_of_birth, join_date")
```

#### **Updated Member Interface:**
```typescript
// Before: No phone field
interface Member {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  // ... other fields
}

// After: Includes phone field
interface Member {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null; // Added
  // ... other fields
}
```

#### **Updated Recipient Mapping:**
```typescript
// Before: Only email
...selectedMembers.map(m => ({
  id: m.id,
  name: `${m.first_name || ""} ${m.last_name || ""}`.trim() || "Member",
  email: m.email,
  type: 'member' as const,
  status: m.status
}))

// After: Includes phone
...selectedMembers.map(m => ({
  id: m.id,
  name: `${m.first_name || ""} ${m.last_name || ""}`.trim() || "Member",
  email: m.email,
  phone: m.phone, // Added
  type: 'member' as const,
  status: m.status
}))
```

#### **Updated Manual Recipients:**
- Added phone input field
- Updated validation to accept either email OR phone
- Updated manual recipient type to include phone
- Updated addManualRecipient function

## Expected Behavior After Fix

### ✅ **SMS Sending Now Works:**
1. **Correct Edge Function**: Calls `africastalking-sms` for SMS messages
2. **Phone Number Support**: Filters recipients by phone numbers
3. **Manual Recipients**: Can add phone-only recipients
4. **Proper Validation**: Shows helpful errors if no phone numbers available
5. **SMS History**: Messages logged to `sms_history` table
6. **Recipient Tracking**: Individual delivery status tracked

### ✅ **Email Sending Still Works:**
- Email functionality unchanged and working
- Uses `send-communication` Edge Function
- Filters recipients by email addresses

### ✅ **Mixed Recipients Supported:**
- Can select members with both email and phone
- SMS goes to those with phone numbers
- Email goes to those with email addresses
- Clear feedback on recipient counts

## Testing Checklist

### SMS Functionality:
- [ ] Navigate to Communications → Compose → SMS
- [ ] Select recipients with phone numbers
- [ ] Compose SMS message
- [ ] Click "Send SMS" - should work without errors
- [ ] Check SMS history for sent messages
- [ ] Verify recipients received SMS

### Email Functionality:
- [ ] Navigate to Communications → Compose → Email  
- [ ] Select recipients with email addresses
- [ ] Compose email with subject and body
- [ ] Click "Send Email" - should work as before

### Manual Recipients:
- [ ] Add manual recipient with phone number only
- [ ] Add manual recipient with email only
- [ ] Add manual recipient with both phone and email
- [ ] Send SMS to phone-only recipient
- [ ] Send email to email-only recipient

## Error Messages Improved:
- **No phone numbers**: "No recipients have phone numbers. Please add phone numbers to send SMS."
- **No email addresses**: "No recipients have email addresses. Please add email addresses to send emails."
- **Manual recipient validation**: "Please enter an email address or phone number"

The SMS compose functionality should now work completely end-to-end! 🎉