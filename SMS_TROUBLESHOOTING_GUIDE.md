# SMS Troubleshooting Guide

## Why SMS Shows "Failed" Status

When SMS shows as "Failed" in the SMS History, it means Africa's Talking API rejected the message. Here are the most common causes and solutions:

## 🔍 **Step 1: Check Phone Number Format**

**❌ Common Wrong Formats:**
- `0712345678` (missing country code)
- `254712345678` (missing + sign)
- `+254 712 345 678` (has spaces)
- `+254-712-345-678` (has dashes)

**✅ Correct Format:**
- `+254712345678` (Kenya)
- `+256712345678` (Uganda)
- `+255712345678` (Tanzania)

**Fix:** Update member phone numbers to international format with country code.

## 🔍 **Step 2: Verify SMS Settings**

### Check Username:
- **Sandbox**: Use `sandbox`
- **Production**: Use your actual AT username

### Check API Key:
- Must be valid and not expired
- Get from Africa's Talking Dashboard → Settings → API Key
- Should start with letters/numbers (not spaces)

### Check Sender ID:
- **If custom**: Must be approved by Africa's Talking
- **If not approved**: Leave blank or use `AFRICASTKNG`
- **Test**: Try removing Sender ID completely

## 🔍 **Step 3: Check Account Balance**

1. Log into [Africa's Talking Dashboard](https://account.africastalking.com)
2. Check your SMS balance
3. **Sandbox**: Limited free credits (usually 100 SMS)
4. **Production**: Need to top up your account

## 🔍 **Step 4: Test with Known Working Number**

Try sending to a number you know works:
1. Go to Settings → Communications → SMS
2. Click "Send Test SMS"
3. Should send to your admin phone number
4. If test fails, it's a configuration issue

## 🔍 **Step 5: Check Specific Error Messages**

The failure reason is stored in the database. Common errors:

### **"InvalidPhoneNumber"**
- **Cause**: Phone number format is wrong
- **Fix**: Use international format (+254...)

### **"InsufficientBalance"**
- **Cause**: No SMS credits left
- **Fix**: Top up your Africa's Talking account

### **"InvalidSenderId"**
- **Cause**: Sender ID not approved
- **Fix**: Remove Sender ID or use approved one

### **"InvalidCredentials"**
- **Cause**: Wrong username/API key
- **Fix**: Double-check credentials in AT dashboard

### **"RateLimitExceeded"**
- **Cause**: Sending too many SMS too fast
- **Fix**: Wait a few minutes and try again

## 🛠️ **Quick Fix Checklist**

1. **✅ Phone Numbers**: All in `+254...` format
2. **✅ SMS Settings**: Valid username and API key
3. **✅ Sender ID**: Remove or use approved one
4. **✅ Balance**: Check Africa's Talking account has credits
5. **✅ Test SMS**: Try sending test SMS first

## 🔧 **Immediate Actions**

### 1. Fix Phone Numbers:
```sql
-- Update phone numbers to international format
UPDATE members 
SET phone = CONCAT('+254', SUBSTRING(phone FROM 2)) 
WHERE phone LIKE '07%' AND tenant_id = 'your-tenant-id';
```

### 2. Test SMS Settings:
- Go to Settings → Communications → SMS
- Click "Send Test SMS"
- Check if it works

### 3. Remove Sender ID:
- Go to Settings → Communications → SMS
- Clear the "Sender ID" field
- Save settings
- Try sending SMS again

### 4. Check Balance:
- Visit [Africa's Talking Dashboard](https://account.africastalking.com)
- Top up if balance is low

## 📞 **Still Not Working?**

If SMS still fails after these steps:

1. **Check Edge Function logs** in Supabase Dashboard
2. **Contact Africa's Talking support** with your API logs
3. **Try a different phone number** to isolate the issue
4. **Switch to sandbox mode** for testing

The most common issue is **phone number format** - make sure all numbers start with `+` and country code!