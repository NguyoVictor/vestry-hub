# Watch Live Feature Specification

## Quick Start

This directory contains the complete specification for the Watch Live feature.

---

## Files

### 📋 requirements.md
**What it contains**: Feature overview, user stories, functional requirements, success criteria

**Read this to understand**:
- What the feature does
- Who it's for
- What problems it solves
- What's in scope and out of scope

### 🎨 design.md
**What it contains**: Architecture, component specs, data flows, UI/UX patterns, code examples

**Read this to understand**:
- How the feature works technically
- Component hierarchy
- Database queries
- Animations and styling
- Error handling

### ✅ tasks.md
**What it contains**: 14 detailed tasks with subtasks, acceptance criteria, testing instructions

**Read this to understand**:
- What needs to be built
- In what order
- How to verify it works
- Estimated time per task

---

## Status

- ✅ **Database Setup**: Complete (migrations applied)
- ⏳ **Implementation**: Ready to start
- 📊 **Progress**: 1/14 tasks complete (7%)

---

## Quick Commands

### Execute All Tasks
```
Execute all tasks in .kiro/specs/watch-live-feature/tasks.md
```

### Execute Single Task
```
Execute Task 1 from .kiro/specs/watch-live-feature/tasks.md
```

### Check Progress
```
Show task status from .kiro/specs/watch-live-feature/tasks.md
```

---

## Implementation Order

1. ✅ Task 0: Database Setup (DONE)
2. Task 1: Admin Go Live Panel (2-3 hours)
3. Task 2: Admin Page Header (1 hour)
4. Task 4: Member Page Core (2 hours)
5. Task 5: Member Live State (4-5 hours)
6. Task 7: Recording Card (2 hours)
7. Task 6: Member Not Live State (3-4 hours)
8. Task 8: Recordings Tab + Modal (3 hours)
9. Task 9: Realtime Sync (2 hours)
10. Task 3: Admin Recordings Tab (1-2 hours)
11. Task 10: Notifications (2-3 hours)
12. Task 11: Route Wiring (30 min)
13. Task 12: Testing & QA (3-4 hours)
14. Task 13: Documentation (1-2 hours)

**Total**: 30-40 hours

---

## Key Features

### Admin
- One-click Go Live with 4 streaming providers
- Auto-generated Jitsi rooms
- Service metadata tracking
- Live status indicators
- Recordings management

### Member
- Cinematic live stream player
- Real-time chat with reactions
- Countdown timer for next service
- Recordings library with search
- Push notifications

### Technical
- Supabase Realtime for instant updates
- Multi-provider support (YouTube, Facebook, Jitsi, Custom)
- Responsive design (mobile, tablet, desktop)
- Full dark mode support
- Accessibility compliant

---

## Critical Rules

### ❌ Never Modify
- `src/index.css`
- `tailwind.config.ts`
- `src/components/ui/*`
- `src/components/layout/AppLayout.tsx`

### ✅ Always
- Use `TABLES` and `COLS` constants
- Filter by `tenant_id`
- Add `dark:` variants
- Use `motion/react` for animations
- Set `staleTime: 300000`

### 🚫 Never
- Hardcode `tenant_id`
- Install new packages
- Use `useEffect` for data fetching

---

## Files to Create

1. `src/pages/member/MemberWatchLive.tsx`
2. `src/components/shared/StreamPlayer.tsx`
3. `src/components/shared/LiveChatPanel.tsx`
4. `src/components/shared/CountdownTimer.tsx`
5. `src/components/shared/RecordingCard.tsx`
6. `src/components/shared/VideoModal.tsx`

## Files to Modify

1. `src/pages/Livestreaming.tsx`
2. `src/App.tsx`
3. `src/pages/member/MemberHome.tsx`

---

## Testing Checklist

- [ ] Admin can go live (all 4 providers)
- [ ] Member sees stream when live
- [ ] Chat works in real-time
- [ ] Countdown timer accurate
- [ ] Recordings playback works
- [ ] Notifications delivered
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] No console errors

---

## Support

**Questions?** Check:
1. `design.md` for technical details
2. `requirements.md` for feature specs
3. `tasks.md` for implementation steps

**Issues?** Verify:
1. Database migrations applied
2. Protected files untouched
3. All queries filter by tenant_id
4. Dark mode classes present

---

**Created**: May 3, 2026  
**Status**: Ready for implementation  
**Next**: Execute Task 1 (Admin Go Live Panel)
