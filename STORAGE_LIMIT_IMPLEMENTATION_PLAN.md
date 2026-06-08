# Storage Limit Implementation - Complete File List

## 📋 All File Upload Components Identified

### 1. **Email & Communications** (3 files)
- `src/pages/communications/EmailBranding.tsx` - Logo and sender photo uploads
- `src/pages/member/MemberMessages.tsx` - Message attachments
- `src/pages/communications/MemberMessaging.tsx` - Message attachments

### 2. **Church Settings & Profile** (3 files)
- `src/pages/settings/GeneralSettings.tsx` - Church logo upload
- `src/pages/settings/ChurchProfile.tsx` - Church logo upload
- `src/pages/settings/SeoPublicPage.tsx` - OG image upload

### 3. **Media & Sermons** (5 files)
- `src/pages/media/Sermons.tsx` - Sermon thumbnails, audio files, documents
- `src/pages/media/ChurchStudio.tsx` - Sermon recordings (audio/video)
- `src/pages/media/ChurchMedia.tsx` - General media uploads (images/videos/audio)
- `src/pages/media/SermonPreparation.tsx` - Sermon archive uploads (PDF/DOC)
- `src/components/sermons/SermonDrawer.tsx` - Sermon thumbnails, audio, documents

### 4. **Operations & Facilities** (2 files)
- `src/pages/operations/FacilityBooking.tsx` - Thumbnails, gallery images, videos
- `src/pages/media/AssetManagement.tsx` - Asset images

### 5. **Growth & Resources** (2 files)
- `src/pages/growth/ResourcesStore.tsx` - Store covers, gallery, digital files
- `src/pages/growth/DiscipleshipResources.tsx` - Resource file uploads

### 6. **Public & Surveys** (1 file)
- `src/pages/public/SurveyTake.tsx` - Survey file uploads

### 7. **Song Library** (1 file)
- `src/pages/media/SongLibrary/components/CoverArt/ImageUpload.tsx` - Cover art uploads

---

## 🎯 Implementation Strategy

### Phase 1: Critical Files (High Impact)
1. ChurchMedia.tsx - Main media upload hub
2. Sermons.tsx - Sermon content uploads
3. FacilityBooking.tsx - Multiple file types
4. ResourcesStore.tsx - Store digital files

### Phase 2: Settings & Profile (Medium Impact)
5. GeneralSettings.tsx - Church logo
6. ChurchProfile.tsx - Church logo
7. SeoPublicPage.tsx - OG images
8. EmailBranding.tsx - Email branding assets

### Phase 3: Messaging & Communications (Medium Impact)
9. MemberMessages.tsx - Message attachments
10. MemberMessaging.tsx - Message attachments

### Phase 4: Specialized Features (Lower Impact)
11. ChurchStudio.tsx - Sermon recordings
12. SermonPreparation.tsx - Archive uploads
13. SermonDrawer.tsx - Sermon assets
14. AssetManagement.tsx - Asset images
15. DiscipleshipResources.tsx - Resource files
16. SurveyTake.tsx - Survey uploads
17. SongLibrary ImageUpload.tsx - Cover art

---

## 📝 Implementation Template

For each file, implement this exact pattern:

### Step 1: Add Imports
```typescript
import { useSubscription } from '@/hooks/useSubscription';
import { showPaywallToast } from '@/components/PaywallToast';
import { TABLES } from '@/lib/schema';
```

### Step 2: Get Subscription Data in Component
```typescript
const { limits, usage } = useSubscription();
const { tenantId } = useChurch();
```

### Step 3: Pre-Upload Check
```typescript
// Before upload
const fileSizeGB = file.size / (1024 * 1024 * 1024);
if ((usage.storage_gb + fileSizeGB) > limits.storage_gb) {
  showPaywallToast('storage', 'storage');
  return;
}
```

### Step 4: Post-Upload Increment
```typescript
// After successful upload
await supabase
  .from(TABLES.TENANT_SUBSCRIPTIONS)
  .update({
    storage_used_gb: usage.storage_gb + fileSizeGB
  })
  .eq('tenant_id', tenantId);
```

### Step 5: On Delete Decrement
```typescript
// When deleting file
await supabase
  .from(TABLES.TENANT_SUBSCRIPTIONS)
  .update({
    storage_used_gb: Math.max(0, usage.storage_gb - fileSizeGB)
  })
  .eq('tenant_id', tenantId);
```

---

## 🔍 Special Cases

### Multiple File Uploads (ChurchMedia, FacilityBooking, ResourcesStore)
```typescript
// Calculate total size first
const totalSizeGB = files.reduce((sum, file) => 
  sum + (file.size / (1024 * 1024 * 1024)), 0
);

if ((usage.storage_gb + totalSizeGB) > limits.storage_gb) {
  showPaywallToast('storage', 'storage');
  return;
}

// Upload all files...

// Increment once with total size
await supabase
  .from(TABLES.TENANT_SUBSCRIPTIONS)
  .update({
    storage_used_gb: usage.storage_gb + totalSizeGB
  })
  .eq('tenant_id', tenantId);
```

### Upsert Operations (Logo uploads with upsert: true)
```typescript
// For upsert operations, we need to:
// 1. Check if old file exists
// 2. Get old file size
// 3. Calculate net change
// 4. Update storage accordingly

// Before upload
const fileSizeGB = file.size / (1024 * 1024 * 1024);

// Check if we're replacing an existing file
let oldFileSizeGB = 0;
if (existingFilePath) {
  // Try to get old file size (if tracked)
  // For simplicity, assume replacement doesn't increase storage
  // Or fetch old file metadata
}

const netChangeGB = fileSizeGB - oldFileSizeGB;

if ((usage.storage_gb + netChangeGB) > limits.storage_gb) {
  showPaywallToast('storage', 'storage');
  return;
}

// After upload
await supabase
  .from(TABLES.TENANT_SUBSCRIPTIONS)
  .update({
    storage_used_gb: usage.storage_gb + netChangeGB
  })
  .eq('tenant_id', tenantId);
```

### File Deletion Tracking
For files deleted via storage.remove():
```typescript
// Before delete, get file size
const { data: fileData } = await supabase.storage
  .from('bucket-name')
  .list(path);

const fileSize = fileData?.find(f => f.name === fileName)?.metadata?.size || 0;
const fileSizeGB = fileSize / (1024 * 1024 * 1024);

// Delete file
await supabase.storage.from('bucket-name').remove([filePath]);

// Decrement storage
await supabase
  .from(TABLES.TENANT_SUBSCRIPTIONS)
  .update({
    storage_used_gb: Math.max(0, usage.storage_gb - fileSizeGB)
  })
  .eq('tenant_id', tenantId);
```

---

## 🚀 Implementation Order

### Immediate (Today)
1. ✅ ChurchMedia.tsx - Main media hub
2. ✅ Sermons.tsx - Sermon uploads
3. ✅ FacilityBooking.tsx - Facility media
4. ✅ ResourcesStore.tsx - Store files

### Next Session
5. GeneralSettings.tsx
6. ChurchProfile.tsx
7. SeoPublicPage.tsx
8. EmailBranding.tsx
9. MemberMessages.tsx
10. MemberMessaging.tsx

### Final Session
11-17. Remaining specialized components

---

## 📊 Storage Buckets Used

| Bucket Name | Used In | File Types |
|-------------|---------|------------|
| `church-logos` | EmailBranding, GeneralSettings, ChurchProfile | Images (PNG, JPG, SVG) |
| `church-media` | ChurchMedia, SeoPublicPage | Images, Videos, Audio |
| `sermon-thumbnails` | Sermons, SermonDrawer | Images (JPG, PNG, WebP) |
| `sermon-audio` | Sermons, SermonDrawer | Audio files |
| `sermon-documents` | Sermons, SermonDrawer | PDF, DOC, DOCX |
| `sermon-recordings` | ChurchStudio | Audio/Video |
| `sermon-archives` | SermonPreparation | PDF, DOC, DOCX, TXT, MD, RTF |
| `facility-thumbnails` | FacilityBooking | Images (WebP) |
| `facility-images` | FacilityBooking | Images (WebP) |
| `facility-videos` | FacilityBooking | Videos |
| `message-attachments` | MemberMessages, MemberMessaging | Documents, Images |
| `asset-images` | AssetManagement | Images |
| `store-covers` | ResourcesStore | Images |
| `store-gallery` | ResourcesStore | Images |
| `store-digital-files` | ResourcesStore | Digital products |
| `survey-uploads` | SurveyTake | Various files |
| `discipleship-resources` | DiscipleshipResources | PDF, DOC, Video, Audio |

---

## ✅ Testing Checklist

After implementation:
- [ ] Test upload when under limit → succeeds
- [ ] Test upload when at limit → shows paywall toast
- [ ] Test upload when over limit → shows paywall toast
- [ ] Verify storage_used_gb increments after upload
- [ ] Test file deletion → storage_used_gb decrements
- [ ] Test multiple file upload → total size checked
- [ ] Test upsert operation → net change calculated
- [ ] Verify Math.max(0, ...) prevents negative storage
- [ ] Test with different file sizes (KB, MB, GB)
- [ ] Verify billing page shows correct storage usage

---

## 🎯 Success Criteria

✅ All 17 upload components have storage checks  
✅ Storage increments after successful uploads  
✅ Storage decrements after file deletions  
✅ Paywall toast shows when limit reached  
✅ No negative storage values possible  
✅ Multiple file uploads check total size  
✅ Upsert operations handle replacements correctly  

---

**Status:** Ready for implementation  
**Estimated Time:** 4-6 hours for all components  
**Priority:** High - Completes subscription system
