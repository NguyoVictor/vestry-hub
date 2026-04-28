# Bible Explorer Testing Checklist

Use this checklist to verify all functionality works after the migration.

## 🧪 Pre-Testing Setup

- [ ] Open the app in your browser
- [ ] Navigate to Bible Explorer page
- [ ] Open browser console (F12) to check for errors

## ✅ Core Features

### Verse of the Day
- [ ] VOTD loads automatically on page load
- [ ] Shows a verse (not random - same verse all day)
- [ ] **Daily Change**: VOTD is consistent throughout the day
  - [ ] Open page in morning - note the verse
  - [ ] Open page in afternoon - same verse shows
  - [ ] Verse changes at midnight (00:00)
  - [ ] Can test by changing system time to 23:59, wait 1 min
- [ ] **Persistence**: Same verse shows across browser tabs
- [ ] **Storage**: Verse saved to localStorage with date
- [ ] "Read More" button works
- [ ] "Share" button copies to clipboard
- [ ] "Refresh" button loads a different random verse (manual override)
- [ ] After manual refresh, reloading page shows the daily verse again

### Bible Reader Tab
- [ ] Default view shows Genesis 1
- [ ] All verses display correctly
- [ ] Verse numbers are visible
- [ ] **Translation Selector**:
  - [ ] Can switch to KJV
  - [ ] Can switch to WEB
  - [ ] Can switch to ASV
  - [ ] Text changes when switching translations
- [ ] **Book Selector**:
  - [ ] Shows Old Testament books
  - [ ] Shows New Testament books
  - [ ] Can select any book
  - [ ] Book changes correctly
- [ ] **Chapter Selector**:
  - [ ] Shows correct number of chapters for selected book
  - [ ] Can select any chapter
  - [ ] Chapter changes correctly
- [ ] **Navigation**:
  - [ ] "Previous" button works (disabled on chapter 1)
  - [ ] "Next" button works (disabled on last chapter)
  - [ ] Can navigate through entire book
- [ ] **Bookmarking**:
  - [ ] Hover over verse shows bookmark icon
  - [ ] Clicking bookmark saves verse
  - [ ] Toast notification appears
  - [ ] Verse appears in Bookmarks tab

### Bookmarks Tab
- [ ] Shows all saved bookmarks
- [ ] Search box filters bookmarks
- [ ] Filter buttons work (All/Favorites/Notes)
- [ ] Can remove bookmarks
- [ ] Shows verse reference and text
- [ ] Shows translation used
- [ ] Empty state shows when no bookmarks

### Notes Tab
- [ ] "Add Note" button opens dialog
- [ ] Can create note with:
  - [ ] Title (optional)
  - [ ] Book selection
  - [ ] Chapter number
  - [ ] Verse number (optional)
  - [ ] Note text
  - [ ] Tags (comma separated)
  - [ ] Private toggle
- [ ] Note saves successfully
- [ ] Note appears in list
- [ ] Search filters notes
- [ ] Can delete notes
- [ ] Empty state shows when no notes

### Search Tab
- [ ] Translation selector works
- [ ] Can enter search term
- [ ] "Search" button triggers search
- [ ] Enter key triggers search
- [ ] Results show:
  - [ ] Verse reference
  - [ ] Verse text
  - [ ] Matching verses highlighted
- [ ] Shows result count
- [ ] Empty state when no results
- [ ] Loading state during search

### Lookup Tab
- [ ] Can enter verse reference (e.g., "John 3:16")
- [ ] Translation selector works
- [ ] "Search" button triggers lookup
- [ ] Enter key triggers lookup
- [ ] Result shows:
  - [ ] Verse reference
  - [ ] Verse text
  - [ ] Translation used
- [ ] Error message for invalid reference
- [ ] Examples shown in placeholder
- [ ] Empty state before lookup

### Readings Tab
- [ ] "Add Reading" button opens dialog
- [ ] Can create reading with:
  - [ ] Title
  - [ ] Book selection
  - [ ] Date
  - [ ] Chapter/verse range
  - [ ] Theme
  - [ ] Reflection
  - [ ] Publish toggle
- [ ] Reading saves successfully
- [ ] Published/Drafts filter works
- [ ] Can navigate to reading
- [ ] Can delete reading
- [ ] Empty state shows when no readings

### Reading Plan Tab
- [ ] Shows 30-day reading plan
- [ ] Can create custom plan
- [ ] Plan selector works
- [ ] Progress bar shows completion
- [ ] Today's reading highlighted
- [ ] Can mark days as complete
- [ ] Checkmarks appear for completed days
- [ ] Can delete plan
- [ ] Empty state when no plans

### Streaks Tab
- [ ] Shows current streak
- [ ] Shows longest streak
- [ ] Shows chapters read
- [ ] Shows readings completed
- [ ] Calendar view shows reading days
- [ ] Streak resets correctly

### Statistics Tab
- [ ] Shows total chapters read
- [ ] Shows total verses looked up
- [ ] Shows total notes
- [ ] Shows favorite book
- [ ] Shows reading distribution chart
- [ ] AI insights generate (if configured)
- [ ] Export options work

### Challenges Tab
- [ ] Shows available challenges
- [ ] Can start a challenge
- [ ] Progress tracks correctly
- [ ] Can complete challenge
- [ ] Shows completion status

### Reminders Tab
- [ ] Can enable/disable reminders
- [ ] Can set reminder time
- [ ] Can select reminder days
- [ ] Save button works
- [ ] Toast confirmation appears
- [ ] Reading groups section shows
- [ ] Can create reading group
- [ ] Social features work

## 🔍 Edge Cases

### Error Handling
- [ ] Invalid book reference shows error
- [ ] Invalid verse reference shows error
- [ ] Missing chapter shows error
- [ ] Network errors handled gracefully

### Data Persistence
- [ ] Bookmarks persist after page reload
- [ ] Notes persist after page reload
- [ ] Reading plans persist after page reload
- [ ] Streaks persist after page reload
- [ ] Settings persist after page reload

### Performance
- [ ] Chapter loads in < 200ms
- [ ] Search completes in < 1 second
- [ ] Lookup completes in < 100ms
- [ ] No lag when switching translations
- [ ] No lag when switching books

## 🌐 Browser Testing

Test in multiple browsers:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Mobile browser

## 📱 Responsive Testing

- [ ] Works on desktop (1920x1080)
- [ ] Works on tablet (768x1024)
- [ ] Works on mobile (375x667)
- [ ] All buttons accessible
- [ ] Text readable on all sizes

## 🐛 Console Errors

- [ ] No errors in browser console
- [ ] No warnings about missing files
- [ ] No 404 errors for Bible files
- [ ] No TypeScript errors

## ✨ Final Checks

- [ ] All tabs accessible
- [ ] All buttons clickable
- [ ] All forms submittable
- [ ] All data saves correctly
- [ ] All features work as before migration
- [ ] Performance is better than before
- [ ] No functionality lost

## 📝 Notes

Record any issues found:

```
Issue 1: [Description]
Steps to reproduce:
1. 
2. 
3. 

Issue 2: [Description]
Steps to reproduce:
1. 
2. 
3. 
```

---

## ✅ Sign Off

- [ ] All tests passed
- [ ] No critical issues found
- [ ] Ready for production deployment

**Tested by**: _______________  
**Date**: _______________  
**Browser**: _______________  
**Result**: ⭐⭐⭐⭐⭐

---

**If all checks pass, you're ready to deploy!** 🚀
