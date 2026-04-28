# Verse of the Day (VOTD) - Daily System

## 🌅 How It Works

The Verse of the Day (VOTD) now changes automatically at **midnight (00:00)** every day.

## ✨ Features

### 1. **Date-Based Selection**
- Each day gets a unique verse
- The verse is determined by the current date
- Same verse shows all day long (consistent experience)
- Changes automatically at midnight

### 2. **Consistent Daily Verse**
- If you visit the page at 8 AM, you see verse A
- If you visit again at 3 PM, you still see verse A
- At midnight (00:00), it automatically changes to verse B
- Everyone sees the same verse on the same day

### 3. **Automatic Midnight Refresh**
- If the page is open at midnight, VOTD updates automatically
- No need to refresh the page
- Smooth transition to the new day's verse

### 4. **Manual Refresh Option**
- "Refresh" button still works
- Clicking it shows a different random verse
- Great for exploring more verses
- Doesn't affect the daily verse for others

## 🔧 Technical Implementation

### Date-Based Algorithm
```typescript
// Use date as seed for consistent selection
const today = "2026-04-28"; // YYYY-MM-DD format
const dateNum = new Date(today).getTime(); // Convert to timestamp
const index = Math.floor((dateNum / 86400000) % VOTD_REFS.length);
const verse = VOTD_REFS[index]; // Same verse all day
```

### Storage
- Verse is saved to localStorage with the date
- Format: `{ date: "2026-04-28", ref: "JHN.3.16" }`
- On page load, checks if saved verse is for today
- If yes, uses saved verse
- If no (new day), calculates new verse

### Midnight Timer
```typescript
// Calculate milliseconds until midnight
const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0);
const msUntilMidnight = tomorrow.getTime() - now.getTime();

// Set timeout to refresh at midnight
setTimeout(() => {
  loadVotd(); // Load new verse
}, msUntilMidnight);
```

## 📅 Example Timeline

**Monday, April 28, 2026**
- 00:00 - Verse changes to John 3:16
- 08:00 - User visits, sees John 3:16
- 12:00 - User visits again, still sees John 3:16
- 18:00 - User visits again, still sees John 3:16
- 23:59 - Still showing John 3:16

**Tuesday, April 29, 2026**
- 00:00 - **Verse automatically changes** to Psalm 23:1
- 08:00 - User visits, sees Psalm 23:1
- All day - Everyone sees Psalm 23:1

## 🎯 Benefits

### For Users
- ✅ Consistent verse throughout the day
- ✅ Can share the same verse with others
- ✅ Automatic updates (no manual refresh needed)
- ✅ Still can explore more verses with Refresh button

### For Churches
- ✅ Everyone in congregation sees same verse
- ✅ Can discuss the daily verse together
- ✅ Predictable and reliable
- ✅ Great for daily devotionals

### Technical
- ✅ Works offline (uses localStorage)
- ✅ No server required
- ✅ Efficient (no unnecessary API calls)
- ✅ Deterministic (same date = same verse)

## 🧪 Testing

### Test Daily Change
1. Open Bible Explorer
2. Note the current VOTD
3. Change your system time to 23:59
4. Wait 1 minute (or change to 00:01 next day)
5. VOTD should change automatically

### Test Consistency
1. Open Bible Explorer in one tab
2. Note the VOTD
3. Open Bible Explorer in another tab
4. Should show the same VOTD
5. Both tabs should update at midnight

### Test Manual Refresh
1. Open Bible Explorer
2. Note the VOTD
3. Click "Refresh" button
4. Should show a different random verse
5. Reload page
6. Should show the original daily verse again

## 📊 Verse Pool

Currently using **30 curated verses**:
- John 3:16 - "For God so loved the world..."
- Psalm 23:1 - "The LORD is my shepherd..."
- Romans 8:28 - "All things work together for good..."
- Philippians 4:13 - "I can do all things through Christ..."
- Isaiah 41:10 - "Fear not, for I am with you..."
- Jeremiah 29:11 - "For I know the plans I have for you..."
- And 24 more inspiring verses

### Rotation
- 30 verses in the pool
- Each verse appears once every 30 days
- Predictable rotation based on date
- Can expand the pool by adding more verses to `VOTD_REFS` array

## 🔮 Future Enhancements (Optional)

### Possible Additions
- [ ] Themed verses (e.g., hope, faith, love)
- [ ] Seasonal verses (Christmas, Easter, etc.)
- [ ] User-selected verse categories
- [ ] Share daily verse on social media
- [ ] Email daily verse to subscribers
- [ ] Verse of the week for deeper study

## 📝 Code Location

**File**: `src/pages/media/BibleExplorer.tsx`

**Key Functions**:
- `loadVotd()` - Loads the daily verse
- `useEffect()` - Sets up midnight timer
- `lsGet/lsSet()` - Manages localStorage

**Storage Key**: `bible_votd_daily`

**Data Format**:
```json
{
  "date": "2026-04-28",
  "ref": "JHN.3.16"
}
```

---

**The VOTD system is now fully automatic and changes daily at midnight!** 🌙✨
