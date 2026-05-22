# Canva Integration Implementation Complete

## ✅ What Was Implemented

### 1. Database Migration
- **File**: `supabase/migrations/20260522083501_add_canva_tokens_table.sql`
- **Table**: `canva_tokens` with RLS policies scoped to `tenant_id`
- **Columns**: `tenant_id`, `access_token`, `refresh_token`, `expires_at`, `canva_user_id`, `canva_user_name`, `canva_user_email`
- **Status**: ✅ Applied to production database

### 2. Supabase Edge Functions
- **`canva-oauth`**: Generates PKCE OAuth URL and redirects to Canva
- **`canva-callback`**: Handles OAuth callback, exchanges code for tokens, stores in database
- **`canva-refresh-token`**: Automatically refreshes expired access tokens
- **Environment Detection**: Automatically uses correct redirect URI based on environment

### 3. Graphics Studio Page Updates
- **File**: `src/pages/media/GraphicsStudio.tsx`
- **Features**:
  - Connect/Disconnect Canva account
  - Display connection status with user info
  - Fetch and display church designs from Canva API
  - "Create New Design" button (opens Canva)
  - Export designs as PNG with download
  - Automatic token refresh when expired
  - Error handling for OAuth flow

### 4. OAuth Callback Page
- **File**: `src/pages/auth/CanvaCallback.tsx`
- **Purpose**: Loading screen during OAuth callback processing
- **Redirect**: Edge Function handles actual callback and redirects to Graphics Studio

## 🚀 Deployment Instructions

### Step 1: Set Canva Secrets in Supabase
```bash
supabase secrets set CANVA_CLIENT_ID="your_canva_client_id"
supabase secrets set CANVA_CLIENT_SECRET="your_canva_client_secret"
```

### Step 2: Deploy Edge Functions
```bash
supabase functions deploy canva-oauth
supabase functions deploy canva-callback  
supabase functions deploy canva-refresh-token
```

### Step 3: Verify Database Migration (Already Applied)
```bash
npx supabase db push
```

## 🔧 Canva App Configuration

### Required Redirect URIs in Canva Developer Console:
- **Production**: `https://vestryhub.com/auth/canva/callback`
- **Local Development**: `http://localhost:8080/auth/canva/callback`

### Required Scopes:
- `design:content:write` - Create and edit designs
- `asset:write` - Upload assets
- `profile:read` - Get user profile info
- `design:content:read` - Read design content
- `asset:read` - Read assets
- `design:meta:read` - Read design metadata

## 🎯 How It Works

### OAuth Flow:
1. User clicks "Connect Canva Account" in Graphics Studio
2. `canva-oauth` Edge Function generates PKCE OAuth URL
3. User redirects to Canva for authorization
4. Canva redirects to `canva-callback` Edge Function
5. Edge Function exchanges code for tokens and stores in database
6. User redirects back to Graphics Studio with success message

### Token Management:
- Access tokens automatically refresh when expired (5 min before expiry)
- Refresh tokens stored securely in database with RLS
- All API calls use fresh access tokens

### Design Management:
- Fetch designs from Canva API (`GET /v1/designs`)
- Display thumbnails, titles, and last modified dates
- "Edit" button opens design in Canva
- "Export" button downloads design as PNG
- "Create New Design" opens Canva create page

## 🔒 Security Features

- **PKCE OAuth Flow**: Prevents authorization code interception
- **RLS Policies**: Database access scoped to tenant_id
- **Token Encryption**: Stored securely in Supabase
- **Environment Detection**: Correct redirect URIs for prod/dev
- **Error Handling**: Graceful fallbacks for all failure scenarios

## 📱 User Experience

### Connected State:
- Shows "Connected as [User Name]" badge
- Grid of church designs with thumbnails
- Create, edit, and export functionality
- Refresh and disconnect options

### Disconnected State:
- Clean connect screen with Canva branding
- Clear instructions and privacy notes
- One-click connection flow

## 🧪 Testing

### Test OAuth Flow:
1. Go to `/graphics-studio`
2. Click "Connect Canva Account"
3. Complete Canva OAuth
4. Verify connection and design fetching

### Test Token Refresh:
- Tokens automatically refresh before expiry
- No user intervention required
- Seamless API access

### Test Export:
1. Click export button on any design
2. Wait for processing (up to 30 seconds)
3. PNG file should download automatically

## 📋 Environment Variables

The Edge Functions automatically detect environment:
- **Production**: `ENVIRONMENT=production` → uses `https://vestryhub.com/auth/canva/callback`
- **Development**: Default → uses `http://localhost:8080/auth/canva/callback`

## ✨ Features Delivered

✅ Full OAuth 2.0 + PKCE flow  
✅ Secure token storage with auto-refresh  
✅ Design fetching and display  
✅ PNG export functionality  
✅ Create new design integration  
✅ Connection management (connect/disconnect)  
✅ Error handling and user feedback  
✅ Environment-aware redirect URIs  
✅ RLS security policies  
✅ Mobile-responsive UI  

The Canva integration is now **production-ready** and provides a seamless graphics creation experience for church administrators! 🎨