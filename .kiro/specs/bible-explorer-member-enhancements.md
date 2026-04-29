# Bible Explorer Member Side — Implementation Spec

## Target File
`src/pages/member/BibleExplorer.tsx`

## Status: Ready for Implementation

---

## SECTION A: BUG FIXES & FEATURE COMPLETION

### A1. VOTD Refresh Button ✅
- [ ] Add refresh button to VOTD SpotlightCard (top-right)
- [ ] Implement rotation animation on click
- [ ] Cycle through VOTD_REFS array
- [ ] Store override in local state
- [ ] Invalidate VOTD query on refresh

### A2. Search Tab — Functional Search Bar ✅
- [ ] Add text input with debounce (400ms)
- [ ] Implement bibleService.searchVerses()
- [ ] Add useQuery with key ['bible-search', query, translation]
- [ ] Render results list (scrollable, clickable)
- [ ] Handle loading/empty/default states
- [ ] Navigate to verse on click

### A3. Bookmarks — Fully Functional ✅
- [ ] Add bookmark button to verse hover action bar
- [ ] Implement toggleBookmark with full verse object
- [ ] Show filled/outline icon based on state
- [ ] Render bookmarks in tab panel with AnimatedList
- [ ] Add remove button to each bookmark
- [ ] Navigate to verse on bookmark click
- [ ] Add pulse animation to target verse

### A4. Reactions — Fully Functional & Visible ✅
- [ ] Render reaction strip below every verse (always visible)
- [ ] Display aggregate counts from useBibleReactions
- [ ] Implement toggleReaction on emoji click
- [ ] Add/remove reactions with optimistic updates
- [ ] Highlight active reactions for current member
- [ ] Handle realtime subscription updates
- [ ] Add error handling with toast

### A5. Progress Tab — Fully Functional ✅
- [ ] Render AnimatedProgressCard with data
- [ ] Show chaptersRead / 1189
- [ ] Display percentComplete
- [ ] Add animated progress bar
- [ ] Show recent chapters list (10 entries)
- [ ] Handle empty state

### A6. Reading Progress Auto-Mark ✅
- [ ] Attach IntersectionObserver to last verse
- [ ] Call markChapterRead on viewport entry
- [ ] Invalidate progress query
- [ ] Trigger confetti on first-time completion

### A7. Tab Strip Overflow Fix ✅
- [ ] Reduce tab font size to text-xs
- [ ] Add flex-1 min-w-0 to each tab
- [ ] Add overflow-x-auto scrollbar-hide to container
- [ ] Ensure all 4 tabs fit properly

### A8. Remove Daily Devotionals from Member Home ✅
- [ ] Locate member dashboard feature grid
- [ ] Remove "Daily Devotionals" card
- [ ] Keep route intact

---

## SECTION B: PREMIUM ANIMATION ENHANCEMENTS

### B1. Animated Number Counter — Progress Stats ✅
- [ ] Create AnimatedDigit component
- [ ] Use useSpring with { stiffness: 200, damping: 20 }
- [ ] Implement digit-by-digit animation
- [ ] Apply to chaptersRead counter
- [ ] Apply to percentage figure
- [ ] Trigger on Progress tab activation

### B2. Text Shimmer — VOTD Verse Text ✅
- [ ] Wrap verse text in motion.span
- [ ] Implement linear-gradient sweep
- [ ] Animate backgroundPosition
- [ ] Play once on VOTD load
- [ ] Skip during skeleton state

### B3. Magnetic Button Effect — Chapter Nav ✅
- [ ] Create MagneticButton wrapper component
- [ ] Track mouse position with useMotionValue
- [ ] Implement spring-based pull effect
- [ ] Apply to prev/next chapter buttons
- [ ] Use spring config: { damping: 100, stiffness: 400 }

### B4. Ripple Effect — Emoji Reaction Clicks ✅
- [ ] Add position: relative to emoji buttons
- [ ] Capture click coordinates on onPointerDown
- [ ] Create ripple state array
- [ ] Render ripples with AnimatePresence
- [ ] Animate expansion and fade
- [ ] Support overlapping ripples

### B5. Blur Fade — Chapter Transition ✅
- [ ] Wrap verse list in AnimatePresence mode="wait"
- [ ] Add key={`${bookId}-${chapter}`}
- [ ] Implement exit animation (blur out)
- [ ] Implement enter animation (blur in)
- [ ] Coordinate with staggered verse entrance

### B6. Scroll-Linked Verse Opacity ✅
- [ ] Attach ref to Reading Area container
- [ ] Use whileInView on each verse
- [ ] Set viewport with margin: "-80px 0px -80px 0px"
- [ ] Fade verses at edges to opacity 0.4
- [ ] Keep center verses at opacity 1
- [ ] Apply only to verse text, not numbers

### B7. Dock-Style Reaction Bar ✅
- [ ] Add mouseX useMotionValue to reaction strip
- [ ] Track onMouseMove and onMouseLeave
- [ ] Calculate distance from mouseX to each emoji
- [ ] Map distance to scale with useTransform
- [ ] Apply useSpring: { mass: 0.1, stiffness: 170, damping: 12 }
- [ ] Scale hovered emoji to 1.5x
- [ ] Scale neighbors to 1.15x
- [ ] Keep count display at fixed size

---

## Implementation Order

1. Complete Section A (A1 → A8)
2. Implement Section B in order: B5 → B6 → B7 → B4 → B3 → B2 → B1

## Constraints

- All Supabase queries use TABLES/COLS from schema.ts
- All queries filter by tenant_id from useChurch()
- All useQuery hooks use staleTime: 300_000
- All Framer Motion springs use { type: "spring", bounce: 0.2, duration: 0.4 } unless specified
- No new npm packages (framer-motion already installed)
- Do not break existing staggered verse entrance animations

## Testing Checklist

- [ ] VOTD refresh cycles through verses correctly
- [ ] Search returns results and navigates properly
- [ ] Bookmarks add/remove and navigate correctly
- [ ] Reactions display, toggle, and update in realtime
- [ ] Progress tracking works and shows confetti
- [ ] Tab strip displays all 4 tabs without overflow
- [ ] All animations are smooth and performant
- [ ] No console errors or warnings
