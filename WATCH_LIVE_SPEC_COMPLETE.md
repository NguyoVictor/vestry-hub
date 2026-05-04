# ✅ Watch Live Feature Spec — COMPLETE

## Summary

I've created a comprehensive specification for the Watch Live feature in `.kiro/specs/watch-live-feature/`.

---

## What Was Created

### 1. Requirements Document ✅
**File**: `.kiro/specs/watch-live-feature/requirements.md`

**Contains**:
- Complete feature overview
- User stories (admin + member)
- Functional requirements (FR1-FR5)
- Non-functional requirements (performance, scalability, accessibility)
- Technical constraints
- Success criteria
- Out of scope items
- Future enhancements

**Key Sections**:
- Database schema requirements
- Admin page enhancements
- Member page specifications
- Realtime sync requirements
- Notification requirements

---

### 2. Design Document ✅
**File**: `.kiro/specs/watch-live-feature/design.md`

**Contains**:
- Architecture overview with diagrams
- Component hierarchy (admin + member)
- Data flow diagrams
- UI/UX design patterns
- Color palette and typography
- Spacing and animations
- Responsive breakpoints
- Component specifications with code examples
- Database queries
- Error handling patterns
- Performance optimizations
- Accessibility guidelines
- Testing strategy
- Security considerations

**Key Components Designed**:
- StreamPlayer
- LiveChatPanel
- CountdownTimer
- RecordingCard
- VideoModal

---

### 3. Tasks Document ✅
**File**: `.kiro/specs/watch-live-feature/tasks.md`

**Contains**:
- 14 detailed tasks (Task 0-13)
- Each task has:
  - Status indicator
  - Estimated time
  - Dependencies
  - Files to modify
  - Detailed subtasks with checkboxes
  - Acceptance criteria
  - Testing instructions
- Critical path analysis
- Recommended execution order
- Getting started guide

**Tasks Breakdown**:
- ✅ Task 0: Database Setup (DONE)
- ⏳ Task 1: Admin Go Live Panel
- ⏳ Task 2: Admin Page Header Enhancement
- ⏳ Task 3: Admin Recordings Tab Enhancement
- ⏳ Task 4: Member Watch Live Page - Core Structure
- ⏳ Task 5: Member Watch Live - STATE 1 (Live)
- ⏳ Task 6: Member Watch Live - STATE 2 (Not Live)
- ⏳ Task 7: Recording Card Component
- ⏳ Task 8: Past Recordings Tab & Video Modal
- ⏳ Task 9: Realtime Live Status Sync
- ⏳ Task 10: Notifications
- ⏳ Task 11: Route Wiring
- ⏳ Task 12: Testing & QA
- ⏳ Task 13: Documentation & Cleanup

---

## Database Setup ✅ COMPLETE

I've already completed Task 0 by applying the database migrations via Supabase MCP:

### What Was Added:

**livestream_schedules table** (enhanced):
- `stream_provider` (youtube, facebook, jitsi, custom)
- `stream_url` (for YouTube/Facebook/custom URLs)
- `jitsi_room` (auto-generated room name)
- `pastor_name`, `series_name`, `scripture`
- `thumbnail_url`, `recording_url`, `recording_duration`
- `viewer_count`, `ended_at`, `chat_enabled`

**live_chat_messages table** (new):
- Complete chat message storage
- RLS policies for admin and member access
- Realtime enabled for instant message delivery
- Indexed for performance

---

## Feature Highlights

### Admin Side
1. **Go Live Panel**: One-click streaming with 4 provider options
2. **Auto-Generated Jitsi Rooms**: No configuration needed
3. **Service Metadata**: Pastor, series, scripture tracking
4. **Live Status Badge**: Pulsing red indicator when live
5. **Recordings Management**: Add YouTube/Vimeo URLs, track duration

### Member Side
1. **STATE 1 (Live)**: Cinematic player + real-time chat
2. **STATE 2 (Not Live)**: Countdown timer + recent recordings
3. **Multi-Provider Support**: YouTube, Facebook, Jitsi, Custom
4. **Live Chat**: Real-time messaging with reactions
5. **Recordings Library**: Browse and watch past services
6. **Countdown Timer**: Flip-style animated countdown
7. **Push Notifications**: "We Are Live" + service reminders

### Technical Features
1. **Realtime Sync**: Instant state transitions via Supabase Realtime
2. **Optimistic UI**: Messages appear immediately
3. **Responsive Design**: Mobile, tablet, desktop
4. **Dark Mode**: Full support throughout
5. **Accessibility**: Keyboard navigation, ARIA labels, screen reader support

---

## Implementation Estimate

### Total Time: 30-40 hours

**Breakdown**:
- Admin enhancements: 6-8 hours
- Member page (both states): 12-15 hours
- Components (chat, player, cards): 8-10 hours
- Realtime + notifications: 4-5 hours
- Testing + QA: 3-4 hours
- Documentation: 1-2 hours

---

## How to Execute

### Option 1: Run All Tasks Sequentially
```bash
# In Kiro, run:
"Execute all tasks in .kiro/specs/watch-live-feature/tasks.md"
```

### Option 2: Run Tasks Individually
```bash
# Start with Task 1:
"Execute Task 1 from .kiro/specs/watch-live-feature/tasks.md"

# Then Task 2, 3, etc.
```

### Option 3: Manual Implementation
1. Open `.kiro/specs/watch-live-feature/tasks.md`
2. Follow each task in order
3. Check off subtasks as you complete them
4. Use design.md for component specifications
5. Refer to requirements.md for feature details

---

## Key Files to Create

### New Files (7 total):
1. `src/pages/member/MemberWatchLive.tsx` — Main member page
2. `src/components/shared/StreamPlayer.tsx` — Video player
3. `src/components/shared/LiveChatPanel.tsx` — Chat interface
4. `src/components/shared/CountdownTimer.tsx` — Countdown display
5. `src/components/shared/RecordingCard.tsx` — Recording card
6. `src/components/shared/VideoModal.tsx` — Video playback modal
7. `src/lib/streamHelpers.ts` — Utility functions (optional)

### Files to Modify (3 total):
1. `src/pages/Livestreaming.tsx` — Add Go Live panel
2. `src/App.tsx` — Add member route
3. `src/pages/member/MemberHome.tsx` — Update Watch Live tile

---

## Critical Rules (From Spec)

### ❌ NEVER MODIFY:
- `src/index.css`
- `tailwind.config.ts`
- `src/components/ui/*` (all shadcn components)
- `src/components/layout/AppLayout.tsx`

### ✅ ALWAYS:
- Use `TABLES` and `COLS` constants from `schema.ts`
- Filter all queries by `tenant_id`
- Use `useChurch()` for admin pages
- Use `useMemberPortal()` for member pages
- Add `dark:` variants for all colors
- Use `motion/react` for animations
- Set `staleTime: 300000` on all queries
- Use `BlurFadeIn` for page transitions
- Spring transitions: `stiffness: 400, damping: 25`

### 🚫 NEVER:
- Hardcode `tenant_id` or `church_id`
- Install new npm packages
- Use `useEffect + useState` for data fetching
- Modify protected files

---

## Testing Checklist

After implementation, verify:

### Admin Side
- [ ] Can go live with YouTube
- [ ] Can go live with Facebook
- [ ] Can go live with Jitsi
- [ ] Can go live with Custom URL
- [ ] Jitsi room auto-generates correctly
- [ ] Service details save properly
- [ ] Can end stream
- [ ] Can add recording URLs
- [ ] Stats display correctly

### Member Side
- [ ] See live stream when admin goes live
- [ ] Stream player works for all providers
- [ ] Chat messages send and receive in real-time
- [ ] Reactions work
- [ ] Countdown timer counts down accurately
- [ ] Can browse recordings
- [ ] Video modal plays recordings
- [ ] Notify Me button works
- [ ] State transitions smooth

### Realtime
- [ ] Admin goes live → Member sees within 5 seconds
- [ ] Admin ends → Member sees STATE 2 within 5 seconds
- [ ] Chat messages appear instantly
- [ ] No memory leaks

### Notifications
- [ ] "We Are Live" sent to all members
- [ ] Service reminder sent 30 min before
- [ ] Deep links work

### Quality
- [ ] Dark mode works throughout
- [ ] Mobile responsive
- [ ] No console errors
- [ ] No hardcoded tenant_id
- [ ] Protected files untouched

---

## Next Steps

1. **Review the spec files**:
   - Read `requirements.md` for feature overview
   - Read `design.md` for technical details
   - Read `tasks.md` for implementation steps

2. **Choose execution method**:
   - Run all tasks automatically
   - Run tasks one by one
   - Implement manually

3. **Start with Task 1**:
   - Admin Go Live Panel
   - Estimated time: 2-3 hours
   - Clear acceptance criteria

4. **Test incrementally**:
   - Don't wait until the end
   - Test each task as you complete it

5. **Commit frequently**:
   - Small, focused commits
   - Clear commit messages

---

## Support

If you encounter issues:

1. **Check the design document** for component specifications
2. **Check the requirements document** for feature details
3. **Check existing code** for patterns to follow
4. **Test in isolation** before integrating
5. **Ask for clarification** if anything is unclear

---

## Summary

✅ **Database migrations applied** (Task 0 complete)  
✅ **Comprehensive spec created** (requirements, design, tasks)  
✅ **Ready for implementation** (all details documented)  
✅ **Clear execution path** (14 tasks with subtasks)  
✅ **Testing strategy defined** (acceptance criteria per task)  

**Total Spec Pages**: 3 files, ~2000 lines of documentation  
**Implementation Estimate**: 30-40 hours  
**Status**: Ready to execute

---

**Created**: May 3, 2026  
**By**: Kiro AI  
**Location**: `.kiro/specs/watch-live-feature/`  
**Next Action**: Execute tasks from `tasks.md`
