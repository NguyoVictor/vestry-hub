# Design Document — Bible Explorer UI Revamp (Member Side)

## Overview

The Bible Explorer UI Revamp delivers a premium, engagement-focused Bible reading experience at `/member/bible` within Vestry Hub. The existing `MemberBible.tsx` is a minimal placeholder that calls an external API and stores data in `localStorage`. This revamp replaces it entirely with a new page (`src/pages/member/BibleExplorer.tsx`) built on the existing local-first architecture (`src/lib/bibleService.ts` + `public/bible/{translation}/{book}.json`), adds five new Supabase tables for social engagement and progress tracking, and introduces a suite of animated UI components.

The design is intentionally member-side only. The admin-side `src/pages/media/BibleExplorer.tsx` is left untouched.

### Key Design Goals

- **Local-first, zero external API calls** — all Bible content served from `public/bible/`.
- **Social engagement** — highlights, bookmarks, reactions, and notes persisted to Supabase, scoped by `tenant_id`.
- **Premium reading UX** — Framer Motion animations, Focus Mode, typography controls, command palette.
- **Consistent with Vestry design system** — `font-jakarta`, orange-500 primary, `rounded-xl shadow-sm`, TanStack Query, `TABLES`/`COLS` constants.

---

## Architecture

### High-Level Component Tree

```
BibleExplorer (src/pages/member/BibleExplorer.tsx)
├── <Helmet> — page title
├── <PageTransition> — page-level fade/slide
├── CommandPalette (command-palette.tsx) — ⌘K overlay
├── Header (sticky)
│   ├── Title + subtitle
│   ├── ⌘K trigger button
│   └── Focus Mode toggle
├── SpotlightCard (VOTD hero)
└── Two-column layout
    ├── Sidebar (left)
    │   ├── Book navigation panel
    │   ├── AnimatedProgressCard (progress-card.tsx)
    │   └── Tabs: Read | Search | Bookmarks | Progress
    │       ├── Read tab — book/chapter selector
    │       ├── Search tab — inline search
    │       ├── Bookmarks tab — AnimatedList
    │       └── Progress tab — reading stats
    └── Reading Area (right)
        ├── Translation switcher (pill strip)
        ├── Chapter header + nav controls
        ├── Verse list (staggered AnimatePresence)
        │   └── VerseRow × N
        │       ├── Verse number (orange/40)
        │       ├── Verse text (highlight overlay)
        │       ├── Hover action bar (highlight | bookmark | note | react)
        │       ├── HighlightPicker bubble
        │       ├── ReactionBar
        │       └── Tiptap inline note editor
        └── Chapter navigation (prev/next)
```

### Data Flow

```
bibleService.ts (local JSON)
    ↓ getChapterVerses() / getVerse() / searchVerses()
BibleExplorer.tsx
    ↓ useQuery (TanStack Query, staleTime: 300_000)
    ↓
Supabase (verse_highlights, verse_bookmarks, verse_reactions,
          reading_progress, verse_notes, member_preferences)
    ↑ useBibleHighlights / useBibleBookmarks / useBibleReactions
    ↑ useBibleProgress / useBibleNotes / useMemberPreferences
```

### State Management

- **Server state**: TanStack Query (`useQuery` / `useMutation`) for all Supabase reads/writes.
- **Local UI state**: `useState` for current book, chapter, translation, focus mode, active tab, open note verse.
- **Realtime**: Supabase channel subscription for `verse_reactions` (live count updates).
- **No `useEffect + useState` for data fetching** — all data via TanStack Query hooks.

---

## Components and Interfaces

### New Pages

#### `src/pages/member/BibleExplorer.tsx`

The main page component. Replaces `MemberBible.tsx` as the route target for `/member/bible`.

```typescript
interface BibleExplorerState {
  book: string;           // e.g. "John"
  chapter: number;        // 1-based
  translation: string;    // version ID (KJV/WEB/ASV)
  focusMode: boolean;
  activeTab: "read" | "search" | "bookmarks" | "progress";
  commandPaletteOpen: boolean;
  openNoteVerse: number | null;  // verse_number with expanded Tiptap
}
```

### New UI Components

#### `src/components/ui/SpotlightCard.jsx` + `SpotlightCard.css`

A card with a radial orange glow that follows the mouse cursor. Used for the VOTD hero.

```typescript
interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;  // default: "rgba(249,115,22,0.15)"
}
```

#### `src/components/ui/AnimatedList.jsx` + `AnimatedList.css`

A list that animates items in with staggered entrance. Used for the Bookmarks tab.

```typescript
interface AnimatedListProps {
  items: React.ReactNode[];
  className?: string;
  delay?: number;  // ms between items, default 50
}
```

#### `src/components/ui/progress-card.tsx` (AnimatedProgressCard)

A card with an animated Framer Motion progress bar. Used in the sidebar Progress section.

```typescript
interface AnimatedProgressCardProps {
  chaptersRead: number;
  totalChapters?: number;  // default 1189
  className?: string;
}
```

#### `src/components/ui/command-palette.tsx`

A `⌘K` modal overlay with fuzzy search, book navigation commands, translation switching, and inline verse search.

```typescript
interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (book: string, chapter: number) => void;
  onTranslationChange: (versionId: string) => void;
  onToggleFocusMode: () => void;
  currentTranslation: string;
}
```

### New Hooks

#### `src/hooks/useBibleHighlights.ts`

```typescript
interface VerseHighlight {
  id: string;
  tenant_id: string;
  member_id: string;
  book_id: string;
  chapter: number;
  verse_number: number;
  color: string;
  created_at: string;
}

// Returns highlights for the current chapter, plus toggle mutation
useBibleHighlights(tenantId: string, memberId: string, bookId: string, chapter: number)
  → { highlights: VerseHighlight[], toggleHighlight: (verseNumber, color) => void }
```

#### `src/hooks/useBibleBookmarks.ts`

```typescript
interface VerseBookmark {
  id: string;
  tenant_id: string;
  member_id: string;
  book_id: string;
  chapter: number;
  verse_number: number;
  verse_text: string;
  translation: string;
  created_at: string;
}

useBibleBookmarks(tenantId: string, memberId: string)
  → { bookmarks: VerseBookmark[], toggleBookmark: (verse) => void, isBookmarked: (bookId, chapter, verseNumber) => boolean }
```

#### `src/hooks/useBibleReactions.ts`

```typescript
interface VerseReaction {
  id: string;
  tenant_id: string;
  member_id: string;
  book_id: string;
  chapter: number;
  verse_number: number;
  reaction: string;
  created_at: string;
}

useBibleReactions(tenantId: string, memberId: string, bookId: string, chapter: number)
  → { reactions: VerseReaction[], reactionCounts: Record<number, Record<string, number>>, toggleReaction: (verseNumber, reaction) => void }
```

#### `src/hooks/useBibleProgress.ts`

```typescript
interface ReadingProgress {
  id: string;
  tenant_id: string;
  member_id: string;
  book_id: string;
  chapter: number;
  read_at: string;
}

useBibleProgress(tenantId: string, memberId: string)
  → { progress: ReadingProgress[], chaptersRead: number, percentComplete: number, markChapterRead: (bookId, chapter) => void }
```

#### `src/hooks/useBibleNotes.ts`

```typescript
interface VerseNote {
  id: string;
  tenant_id: string;
  member_id: string;
  book_id: string;
  chapter: number;
  verse_number: number;
  content: string;
  updated_at: string;
}

useBibleNotes(tenantId: string, memberId: string, bookId: string, chapter: number)
  → { notes: VerseNote[], saveNote: (verseNumber, content) => void, hasNote: (verseNumber) => boolean }
```

#### `src/hooks/useMemberPreferences.ts`

```typescript
interface BibleSettings {
  fontSize: number;        // 14–24
  fontFamily: "serif" | "sans";
  lineSpacing: 1.5 | 1.75 | 2.0;
  lastBook: string;
  lastChapter: number;
  lastTranslation: string;
}

useMemberPreferences(tenantId: string, memberId: string)
  → { bibleSettings: BibleSettings, updateBibleSettings: (partial: Partial<BibleSettings>) => void }
```

---

## Data Models

### New Supabase Tables

All tables use `tenant_id` (not `church_id`). All IDs are `TEXT` (VARCHAR). New constants must be added to `src/lib/schema.ts`.

#### `verse_highlights`

```sql
CREATE TABLE verse_highlights (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON verse_highlights (tenant_id, member_id, book_id, chapter);
```

#### `verse_bookmarks`

```sql
CREATE TABLE verse_bookmarks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  verse_text TEXT NOT NULL,
  translation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON verse_bookmarks (tenant_id, member_id);
```

#### `verse_reactions`

```sql
CREATE TABLE verse_reactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, member_id, book_id, chapter, verse_number, reaction)
);
CREATE INDEX ON verse_reactions (tenant_id, book_id, chapter);
```

#### `reading_progress`

```sql
CREATE TABLE reading_progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, member_id, book_id, chapter)
);
CREATE INDEX ON reading_progress (tenant_id, member_id);
```

#### `verse_notes`

```sql
CREATE TABLE verse_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON verse_notes (tenant_id, member_id, book_id, chapter);
```

#### `member_preferences` — `bible_settings` column

The `member_preferences` table may already exist. Add the column if absent:

```sql
ALTER TABLE member_preferences
  ADD COLUMN IF NOT EXISTS bible_settings JSONB DEFAULT '{}';
```

### `schema.ts` Additions

```typescript
// In TABLES:
VERSE_HIGHLIGHTS: "verse_highlights",
VERSE_BOOKMARKS: "verse_bookmarks",
VERSE_REACTIONS: "verse_reactions",
READING_PROGRESS: "reading_progress",
VERSE_NOTES: "verse_notes",
MEMBER_PREFERENCES: "member_preferences",

// In COLS:
BIBLE_SETTINGS: "bible_settings",
MEMBER_ID: "member_id",
BOOK_ID: "book_id",
VERSE_NUMBER: "verse_number",
REACTION: "reaction",
COLOR: "color",
VERSE_TEXT: "verse_text",
TRANSLATION: "translation",
READ_AT: "read_at",
CONTENT: "content",
```

### Translation Version IDs

Preserved from the existing `BibleExplorer.tsx`:

| Label | Version ID |
|-------|-----------|
| KJV   | `de4e12af7f28f599-02` |
| WEB   | `06125adad2d5898a-01` |
| ASV   | `65eec8e0b60e656b-01` |

### VOTD Deterministic Selection

```typescript
const VOTD_REFS = [/* 30 curated refs from existing BibleExplorer.tsx */];

function getVOTDRef(): string {
  const dayOfYear = getDayOfYear(new Date());
  return VOTD_REFS[dayOfYear % VOTD_REFS.length];
}
```

The selection is a pure function of the current date and the list length — no randomness, no server call.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: VOTD deterministic selection

*For any* calendar date and any non-empty VOTD_REFS list, the selected verse index SHALL equal `dayOfYear(date) % refs.length`, and calling the function twice with the same date SHALL return the same reference.

**Validates: Requirements 2.1**

---

### Property 2: Highlight round-trip

*For any* valid combination of `(tenant_id, member_id, book_id, chapter, verse_number, color)`, saving a highlight to `verse_highlights` and then fetching highlights for that chapter SHALL return a record containing the saved color for that verse.

**Validates: Requirements 4.2, 4.3, 4.4**

---

### Property 3: Highlight toggle (idempotence)

*For any* verse and color, applying the same highlight color twice SHALL result in no highlight record existing for that verse — the second application removes the first.

**Validates: Requirements 4.5**

---

### Property 4: Bookmark round-trip and toggle

*For any* verse, bookmarking it SHALL cause it to appear in the member's bookmark list; bookmarking the same verse again SHALL remove it from the list. The list length after a toggle-on followed by a toggle-off SHALL equal the original length.

**Validates: Requirements 5.2, 5.3**

---

### Property 5: Reaction count accuracy

*For any* set of reaction records for a given `(tenant_id, book_id, chapter, verse_number)`, the displayed count for each emoji SHALL equal the number of records in `verse_reactions` with that `reaction` value for the tenant.

**Validates: Requirements 6.3**

---

### Property 6: Reaction toggle (idempotence)

*For any* `(member_id, book_id, chapter, verse_number, reaction)`, toggling a reaction on then off SHALL result in no record existing for that combination — the UNIQUE constraint is respected and the net effect is zero.

**Validates: Requirements 6.4, 6.5**

---

### Property 7: Reading progress round-trip

*For any* `(tenant_id, member_id, book_id, chapter)`, marking a chapter as read SHALL cause it to appear in the member's `reading_progress` records. Marking the same chapter again SHALL not create a duplicate (UNIQUE constraint).

**Validates: Requirements 7.2**

---

### Property 8: Progress percentage invariant

*For any* count of chapters read `N` (where `0 ≤ N ≤ 1189`), the displayed percentage SHALL equal `Math.round((N / 1189) * 100)` and the displayed chapter count SHALL equal `N`.

**Validates: Requirements 7.3**

---

### Property 9: Typography preferences round-trip

*For any* valid `BibleSettings` object (font size in [14, 24], valid font family, valid line spacing), saving it to `member_preferences.bible_settings` and then fetching it SHALL return an equivalent object with all fields preserved.

**Validates: Requirements 9.5, 9.6**

---

### Property 10: Font size range invariant

*For any* font size value `s` in the range [14, 24], applying it to the Reading Area SHALL result in verse text rendered at exactly `s`px. Values outside [14, 24] SHALL be clamped to the nearest boundary.

**Validates: Requirements 9.1**

---

### Property 11: Command palette book coverage

*For any* book in the 66-book biblical canon, the Command Palette SHALL contain a navigation command for that book. No canonical book SHALL be absent from the command list.

**Validates: Requirements 10.2**

---

### Property 12: Search result relevance

*For any* non-empty search query `q`, every verse returned by `bibleService.searchVerses()` SHALL contain `q` (case-insensitive) in its text. No result SHALL be returned that does not contain the query string.

**Validates: Requirements 10.5**

---

### Property 13: Note auto-save round-trip

*For any* note content string saved for a `(tenant_id, member_id, book_id, chapter, verse_number)`, fetching the note after the debounce period SHALL return the same content string. Saving a new version SHALL overwrite the previous content.

**Validates: Requirements 11.4**

---

### Property 14: Note dot indicator invariant

*For any* set of verses in a chapter, a verse SHALL display a dot indicator if and only if a note record exists for that `(member_id, book_id, chapter, verse_number)`. Verses without notes SHALL NOT display the indicator.

**Validates: Requirements 11.5**

---

### Property 15: Note privacy isolation

*For any* note saved by member A, querying `verse_notes` with a different `member_id` (member B) SHALL NOT return member A's note. Notes are strictly scoped to the saving member.

**Validates: Requirements 11.6**

---

### Property 16: Tenant isolation invariant

*For any* Supabase query across all five new tables (`verse_highlights`, `verse_bookmarks`, `verse_reactions`, `reading_progress`, `verse_notes`), the query SHALL include a `tenant_id` filter equal to the value from `useChurch()`. No query SHALL return records from a different tenant.

**Validates: Requirements 4.7, 5.6, 6.8, 7.6, 11.7, 12.7**

---

## Error Handling

### Supabase Write Failures

| Operation | Failure Behaviour |
|-----------|------------------|
| Save highlight | `toast.error("Failed to save highlight")` + revert optimistic update |
| Remove highlight | `toast.error("Failed to remove highlight")` + revert |
| Save bookmark | `toast.error("Failed to save bookmark")` + revert |
| Remove bookmark | `toast.error("Failed to remove bookmark")` + revert |
| Toggle reaction | `toast.error("Failed to update reaction")` + revert |
| Save note | `toast.error("Failed to save note")` |
| Mark chapter read | Silent retry once; suppress error from UI |
| Save preferences | `toast.error("Failed to save preferences")` |

### Bible Content Load Failures

- If `bibleService.getChapterVerses()` throws, display an inline error state in the Reading Area with a retry button.
- If `bibleService.getVerse()` fails for the VOTD, fall back to a hardcoded default verse (`JHN.3.16`).
- If `bibleService.searchVerses()` fails, display "Search unavailable" in the Command Palette results area.

### Realtime Subscription

- If the Supabase Realtime channel fails to connect, the reaction counts remain static (last fetched values). No error toast — the feature degrades gracefully to non-live counts.

### Optimistic Updates

All mutations (highlights, bookmarks, reactions) use TanStack Query optimistic updates:
1. Apply the change to the local cache immediately.
2. On success: invalidate the relevant query key to sync with server.
3. On error: roll back the optimistic update via `onError` context and show `toast.error()`.

---

## Testing Strategy

### Unit Tests (example-based)

Focus on specific behaviours and edge cases:

- `getVOTDRef()` returns the correct ref for a known date (e.g. Jan 1 → index 0).
- `getVOTDRef()` wraps correctly when `dayOfYear >= VOTD_REFS.length`.
- `useBibleProgress` `percentComplete` returns `0` when no chapters are read.
- `useBibleProgress` `percentComplete` returns `100` when all 1189 chapters are read.
- `CommandPalette` closes on `Escape` key press.
- `CommandPalette` opens on `⌘K` / `Ctrl+K`.
- Focus Mode hides sidebar and header.
- Focus Mode restores layout on `Escape`.
- `toast.error()` is called when a Supabase highlight write fails.
- Skeleton loaders are shown while `isLoading` is true.

### Property-Based Tests

Using **fast-check** (TypeScript-native PBT library). Each test runs a minimum of **100 iterations**.

Tag format: `// Feature: bible-explorer-revamp, Property N: <property_text>`

**Property 1 — VOTD deterministic selection**
```typescript
// Feature: bible-explorer-revamp, Property 1: VOTD deterministic selection
fc.assert(fc.property(
  fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }),
  fc.array(fc.string({ minLength: 3 }), { minLength: 1, maxLength: 100 }),
  (date, refs) => {
    const idx = getDayOfYear(date) % refs.length;
    expect(getVOTDRef(date, refs)).toBe(refs[idx]);
    expect(getVOTDRef(date, refs)).toBe(getVOTDRef(date, refs)); // stable
  }
));
```

**Property 2 — Highlight round-trip** (with Supabase mock)
```typescript
// Feature: bible-explorer-revamp, Property 2: Highlight round-trip
fc.assert(fc.property(
  fc.record({ tenantId: fc.string(), memberId: fc.string(), bookId: fc.string(),
               chapter: fc.integer({ min: 1, max: 150 }),
               verseNumber: fc.integer({ min: 1, max: 200 }),
               color: fc.constantFrom('yellow','green','blue','pink','purple') }),
  async (input) => {
    await mockSaveHighlight(input);
    const results = await mockFetchHighlights(input.tenantId, input.memberId, input.bookId, input.chapter);
    expect(results.some(h => h.verse_number === input.verseNumber && h.color === input.color)).toBe(true);
  }
));
```

**Property 3 — Highlight toggle**
```typescript
// Feature: bible-explorer-revamp, Property 3: Highlight toggle (idempotence)
```

**Property 4 — Bookmark round-trip and toggle**
```typescript
// Feature: bible-explorer-revamp, Property 4: Bookmark round-trip and toggle
```

**Property 5 — Reaction count accuracy**
```typescript
// Feature: bible-explorer-revamp, Property 5: Reaction count accuracy
fc.assert(fc.property(
  fc.array(fc.record({ reaction: fc.constantFrom('🔥','❤️','🙏','💡','😢'), memberId: fc.string() }), { minLength: 0, maxLength: 50 }),
  (reactionRecords) => {
    const counts = computeReactionCounts(reactionRecords);
    for (const emoji of ['🔥','❤️','🙏','💡','😢']) {
      expect(counts[emoji]).toBe(reactionRecords.filter(r => r.reaction === emoji).length);
    }
  }
));
```

**Property 6 — Reaction toggle**
```typescript
// Feature: bible-explorer-revamp, Property 6: Reaction toggle (idempotence)
```

**Property 7 — Reading progress round-trip** (with mock)

**Property 8 — Progress percentage invariant**
```typescript
// Feature: bible-explorer-revamp, Property 8: Progress percentage invariant
fc.assert(fc.property(
  fc.integer({ min: 0, max: 1189 }),
  (chaptersRead) => {
    const { percent, count } = computeProgress(chaptersRead);
    expect(count).toBe(chaptersRead);
    expect(percent).toBe(Math.round((chaptersRead / 1189) * 100));
  }
));
```

**Property 9 — Typography preferences round-trip** (with mock)

**Property 10 — Font size range invariant**
```typescript
// Feature: bible-explorer-revamp, Property 10: Font size range invariant
fc.assert(fc.property(
  fc.integer({ min: 0, max: 100 }),
  (rawSize) => {
    const clamped = clampFontSize(rawSize);
    expect(clamped).toBeGreaterThanOrEqual(14);
    expect(clamped).toBeLessThanOrEqual(24);
  }
));
```

**Property 11 — Command palette book coverage**
```typescript
// Feature: bible-explorer-revamp, Property 11: Command palette book coverage
fc.assert(fc.property(
  fc.constantFrom(...ALL_66_BOOKS),
  (book) => {
    const commands = buildCommandList();
    expect(commands.some(c => c.type === 'navigate' && c.book === book)).toBe(true);
  }
));
```

**Property 12 — Search result relevance**
```typescript
// Feature: bible-explorer-revamp, Property 12: Search result relevance
fc.assert(fc.property(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  async (query) => {
    const results = await searchVerses(KJV_VERSION_ID, query, 50);
    for (const verse of results.data.verses) {
      expect(verse.text.toLowerCase()).toContain(query.toLowerCase());
    }
  }
));
```

**Properties 13–16** — Note round-trip, dot indicator, privacy isolation, tenant isolation: implemented with mocked Supabase client using `vi.fn()` / `jest.fn()`.

### Integration Tests

- Supabase Realtime subscription receives insert event → reaction count updates without full re-fetch (1–2 examples).
- `member_preferences.bible_settings` column exists and accepts JSONB (smoke test).
- All five new tables exist with correct columns and indexes (smoke test via `supabase db inspect`).

### Accessibility

- Command Palette: `role="dialog"`, `aria-modal="true"`, focus trap, `aria-label` on search input.
- Verse rows: `role="article"`, verse number in `aria-label`.
- Focus Mode toggle: `aria-pressed` state.
- Translation switcher: `role="radiogroup"` with `aria-checked` per pill.
- All interactive elements reachable via keyboard (`Tab`, `Enter`, `Space`, `Escape`, arrow keys in Command Palette).
