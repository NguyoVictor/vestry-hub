# Requirements Document

## Introduction

The Bible Explorer UI Revamp (Member Side) delivers a premium, engagement-focused Bible reading experience at `/member/bible` within Vestry Hub. It is built entirely on the existing local-first architecture (`src/lib/bibleService.ts` + `public/bible/{translation}/{book}.json`) — no external API calls. The revamp introduces a two-column layout, animated verse reading, social engagement features (highlights, bookmarks, reactions, notes), reading progress tracking, focus mode, typography controls, and a command palette. All Supabase queries are scoped by `tenant_id` from `useChurch()`. All IDs are VARCHAR. All new tables follow the `TABLES`/`COLS` constants pattern in `src/lib/schema.ts`.

---

## Glossary

- **Bible_Explorer**: The member-side page at `/member/bible` being revamped.
- **Bible_Service**: `src/lib/bibleService.ts` — the local-first data layer providing `getVerse`, `getChapterVerses`, and `searchVerses`.
- **VOTD_Card**: The Verse of the Day hero card displayed at the top of the page.
- **Reading_Area**: The right-side column where chapter verses are rendered.
- **Sidebar**: The left-side column containing book navigation, progress card, and tab panels.
- **Verse_Row**: A single rendered verse within the Reading Area, including its number and action bar.
- **Highlight_Picker**: The floating color-picker bubble that appears on verse hover.
- **Bookmark_List**: The animated list of saved verse bookmarks shown in the Bookmarks tab.
- **Reaction_Bar**: The emoji reaction strip shown per verse, with per-church counts.
- **Progress_Card**: The animated sidebar card showing chapters read and overall Bible completion.
- **Focus_Mode**: A distraction-free reading state that hides all chrome except the Reading Area.
- **Command_Palette**: The `⌘K` / `Ctrl+K` overlay for navigation, search, and commands.
- **Tiptap_Editor**: The inline rich-text note editor rendered per verse.
- **Translation_Switcher**: The pill-based UI for switching between KJV, WEB, and ASV translations.
- **Tenant**: A church organisation identified by `tenant_id` in all Supabase queries.
- **Member**: The authenticated user identified by `member_id` (maps to `userId` from `useChurch()`).

---

## Requirements

### Requirement 1: Page Layout Restructure

**User Story:** As a member, I want a well-organised Bible Explorer page with a clear header, hero section, and two-column reading layout, so that I can navigate and read scripture comfortably.

#### Acceptance Criteria

1. THE Bible_Explorer SHALL render a sticky page header containing the title "Bible Explorer", a `⌘K` search trigger button, and a Focus Mode toggle button.
2. THE Bible_Explorer SHALL render the VOTD_Card immediately below the header, spanning the full content width.
3. THE Bible_Explorer SHALL render a two-column layout below the VOTD_Card: a Sidebar on the left and a Reading_Area on the right.
4. THE Sidebar SHALL contain a book navigation panel, a Progress_Card, and a tab strip with tabs: Read, Search, Bookmarks, and Progress.
5. THE Reading_Area SHALL display the current chapter's verse list and a chapter navigation control.
6. WHEN the viewport width is below 768px, THE Bible_Explorer SHALL collapse to a single-column layout with the Sidebar accessible via a drawer or toggle.
7. THE Bible_Explorer SHALL apply a background colour of `#fafaf9` (warm paper-like) to the page root.
8. THE Bible_Explorer SHALL use `rounded-xl` and `shadow-sm` on all card elements.
9. THE Bible_Explorer SHALL display skeleton loaders (not spinners) while Bible data is loading.

---

### Requirement 2: Verse of the Day (VOTD) Hero Card

**User Story:** As a member, I want to see an inspiring Verse of the Day when I open the Bible Explorer, so that I start my reading session with a meaningful scripture.

#### Acceptance Criteria

1. THE VOTD_Card SHALL display a verse selected deterministically by the current calendar day from the curated `VOTD_REFS` list in the local JSON data.
2. THE VOTD_Card SHALL render using the `SpotlightCard` component with an orange radial glow effect.
3. WHEN the VOTD_Card mounts, THE Bible_Explorer SHALL animate it into view using a Framer Motion entrance animation with spring config `{ type: "spring", bounce: 0.2, duration: 0.4 }`.
4. THE VOTD_Card SHALL display the verse text, the verse reference, and the active translation label.
5. WHEN the member clicks the VOTD_Card verse reference, THE Bible_Explorer SHALL navigate the Reading_Area to that book and chapter.
6. THE VOTD_Card SHALL load verse content via `Bible_Service.getVerse()` from local JSON — no external API calls.

---

### Requirement 3: Premium Verse Reading Experience

**User Story:** As a member, I want verses to appear with smooth animations and a clean reading interface, so that reading scripture feels premium and focused.

#### Acceptance Criteria

1. WHEN a chapter loads, THE Reading_Area SHALL animate each Verse_Row into view with a staggered entrance, applying a 15ms delay between consecutive verses using Framer Motion.
2. WHEN the member navigates to a different chapter, THE Reading_Area SHALL use `AnimatePresence` to transition out the old verse list and transition in the new one.
3. THE Reading_Area SHALL render a Translation_Switcher pill strip showing KJV, WEB, and ASV options.
4. WHEN the member selects a translation in the Translation_Switcher, THE Bible_Explorer SHALL animate the active indicator using Framer Motion `layoutId` so it slides smoothly between pills.
5. WHEN the member selects a translation, THE Reading_Area SHALL reload the current chapter from `Bible_Service.getChapterVerses()` using the new translation.
6. WHEN the member hovers over a Verse_Row, THE Reading_Area SHALL reveal an inline action bar with buttons for: highlight, bookmark, note, and react.
7. THE Reading_Area SHALL render verse numbers in orange at 40% opacity (`text-orange-500/40`).
8. THE Reading_Area SHALL render verse text in `#1c1917`.

---

### Requirement 4: Highlighting System

**User Story:** As a member, I want to highlight verses in different colours, so that I can visually mark passages that are meaningful to me.

#### Acceptance Criteria

1. THE Bible_Explorer SHALL persist highlights to a Supabase table `verse_highlights` with columns: `id` (VARCHAR), `tenant_id` (VARCHAR), `member_id` (VARCHAR), `book_id` (VARCHAR), `chapter` (INTEGER), `verse_number` (INTEGER), `color` (VARCHAR), `created_at` (TIMESTAMPTZ).
2. WHEN the member hovers over a Verse_Row, THE Reading_Area SHALL display a Highlight_Picker bubble offering five colour options: yellow, green, blue, pink, and purple.
3. WHEN the member selects a colour from the Highlight_Picker, THE Bible_Explorer SHALL save the highlight to `verse_highlights` scoped by `tenant_id` and `member_id`.
4. WHEN a chapter loads, THE Bible_Explorer SHALL fetch all highlights for that chapter from `verse_highlights` filtered by `tenant_id` and `member_id`, and apply the corresponding background colour to each highlighted Verse_Row.
5. WHEN the member selects a colour already applied to a verse, THE Bible_Explorer SHALL remove the existing highlight record from `verse_highlights`.
6. IF a Supabase write to `verse_highlights` fails, THEN THE Bible_Explorer SHALL display a `toast.error()` notification and revert the optimistic UI update.
7. ALL queries to `verse_highlights` SHALL be scoped by `tenant_id` from `useChurch()`.

---

### Requirement 5: Bookmarks & Favorites Tab

**User Story:** As a member, I want to bookmark verses and view them in a dedicated tab, so that I can quickly return to passages I care about.

#### Acceptance Criteria

1. THE Bible_Explorer SHALL persist bookmarks to a Supabase table `verse_bookmarks` with columns: `id` (VARCHAR), `tenant_id` (VARCHAR), `member_id` (VARCHAR), `book_id` (VARCHAR), `chapter` (INTEGER), `verse_number` (INTEGER), `verse_text` (TEXT), `translation` (VARCHAR), `created_at` (TIMESTAMPTZ).
2. WHEN the member clicks the bookmark action on a Verse_Row, THE Bible_Explorer SHALL save the verse to `verse_bookmarks` scoped by `tenant_id` and `member_id`, and animate the bookmark icon with a spring bounce using `{ type: "spring", bounce: 0.2, duration: 0.4 }`.
3. WHEN the member clicks the bookmark action on an already-bookmarked verse, THE Bible_Explorer SHALL delete the record from `verse_bookmarks` and animate the icon back to its default state.
4. THE Bookmarks tab in the Sidebar SHALL render the member's bookmarks using the `AnimatedList` component.
5. WHEN the member clicks a bookmark entry in the Bookmark_List, THE Bible_Explorer SHALL navigate the Reading_Area to that book and chapter, and apply a pulse animation to the target Verse_Row.
6. ALL queries to `verse_bookmarks` SHALL be scoped by `tenant_id` and `member_id` from `useChurch()`.
7. IF a Supabase write to `verse_bookmarks` fails, THEN THE Bible_Explorer SHALL display a `toast.error()` notification.

---

### Requirement 6: Verse Reactions

**User Story:** As a member, I want to react to verses with emoji reactions and see how other members of my church have reacted, so that I feel connected to my congregation through scripture.

#### Acceptance Criteria

1. THE Bible_Explorer SHALL persist reactions to a Supabase table `verse_reactions` with columns: `id` (VARCHAR), `tenant_id` (VARCHAR), `member_id` (VARCHAR), `book_id` (VARCHAR), `chapter` (INTEGER), `verse_number` (INTEGER), `reaction` (VARCHAR), `created_at` (TIMESTAMPTZ), and a UNIQUE constraint on `(tenant_id, member_id, book_id, chapter, verse_number, reaction)`.
2. THE Reaction_Bar SHALL offer five reaction options: 🔥, ❤️, 🙏, 💡, 😢.
3. THE Reaction_Bar SHALL display the aggregate reaction count per emoji, scoped to the current `tenant_id`, so all members of the same church see the same counts.
4. WHEN the member clicks a reaction, THE Bible_Explorer SHALL upsert the reaction to `verse_reactions` and animate the emoji with a spring bounce using `{ type: "spring", bounce: 0.2, duration: 0.4 }`.
5. WHEN the member clicks a reaction they have already submitted, THE Bible_Explorer SHALL delete the record from `verse_reactions` (toggle off).
6. THE Bible_Explorer SHALL subscribe to Supabase Realtime on the `verse_reactions` table filtered by `tenant_id`, `book_id`, and `chapter`, so that reaction counts update live without a page refresh.
7. WHEN the Realtime subscription receives an insert or delete event, THE Bible_Explorer SHALL update the displayed reaction counts without a full re-fetch.
8. ALL queries to `verse_reactions` SHALL be scoped by `tenant_id` from `useChurch()`.

---

### Requirement 7: Reading Progress Tracker

**User Story:** As a member, I want my reading progress to be tracked automatically and displayed in the sidebar, so that I can see how much of the Bible I have read.

#### Acceptance Criteria

1. THE Bible_Explorer SHALL persist reading progress to a Supabase table `reading_progress` with columns: `id` (VARCHAR), `tenant_id` (VARCHAR), `member_id` (VARCHAR), `book_id` (VARCHAR), `chapter` (INTEGER), `read_at` (TIMESTAMPTZ), and a UNIQUE constraint on `(tenant_id, member_id, book_id, chapter)`.
2. WHEN the member scrolls to the bottom of a chapter in the Reading_Area, THE Bible_Explorer SHALL upsert a record to `reading_progress` for that `book_id` and `chapter`, scoped by `tenant_id` and `member_id`.
3. THE Progress_Card in the Sidebar SHALL display the number of chapters read and the percentage of the full Bible (1189 chapters total) completed by the member.
4. THE Progress_Card SHALL use the `AnimatedProgressCard` component with a Framer Motion animated progress bar.
5. WHEN a chapter is marked as read for the first time, THE Bible_Explorer SHALL trigger a confetti micro-animation as a celebration feedback.
6. ALL queries to `reading_progress` SHALL be scoped by `tenant_id` and `member_id` from `useChurch()`.
7. IF a Supabase write to `reading_progress` fails, THEN THE Bible_Explorer SHALL silently retry once and suppress the error from the member UI.

---

### Requirement 8: Focus Mode

**User Story:** As a member, I want a distraction-free reading mode, so that I can concentrate fully on scripture without UI chrome.

#### Acceptance Criteria

1. WHEN the member activates Focus Mode via the header toggle or `⌘K` command, THE Bible_Explorer SHALL hide the Sidebar, page header, and all navigation chrome using a Framer Motion layout animation.
2. WHILE Focus Mode is active, THE Reading_Area SHALL expand to a full-width centered column with a maximum width of 680px.
3. WHILE Focus Mode is active, THE Bible_Explorer SHALL display a floating "Exit Focus" pill button anchored to the bottom-centre of the viewport.
4. WHEN the member presses the `Escape` key while Focus Mode is active, THE Bible_Explorer SHALL deactivate Focus Mode and restore the standard layout.
5. WHEN the member clicks the "Exit Focus" pill, THE Bible_Explorer SHALL deactivate Focus Mode and restore the standard layout.
6. THE layout transition into and out of Focus Mode SHALL use Framer Motion with spring config `{ type: "spring", bounce: 0.2, duration: 0.4 }`.

---

### Requirement 9: Typography & Reading Comfort Controls

**User Story:** As a member, I want to adjust the font size, font family, and line spacing of the verse text, so that I can read comfortably according to my personal preference.

#### Acceptance Criteria

1. THE Bible_Explorer SHALL provide a font size slider allowing values between 14px and 24px (inclusive) applied to verse text in the Reading_Area.
2. THE Bible_Explorer SHALL provide a font family toggle with two options: Serif and Sans-serif, applied to verse text in the Reading_Area.
3. THE Bible_Explorer SHALL provide a line spacing toggle with three options: Normal (1.5), Relaxed (1.75), and Loose (2.0), applied to verse text in the Reading_Area.
4. WHEN the member changes any typography setting, THE Reading_Area SHALL apply the change with a smooth CSS transition of 200ms.
5. THE Bible_Explorer SHALL persist typography preferences to the Supabase `member_preferences` table under a `bible_settings` JSONB column, scoped by `tenant_id` and `member_id`.
6. WHEN the Bible_Explorer page loads, THE Bible_Explorer SHALL read the member's saved `bible_settings` from `member_preferences` and apply them before the first render.
7. ALL queries to `member_preferences` SHALL be scoped by `tenant_id` and `member_id` from `useChurch()`.

---

### Requirement 10: Enhanced Search — Command Palette

**User Story:** As a member, I want a keyboard-accessible command palette, so that I can quickly navigate to any book, switch translations, or search scripture without using the mouse.

#### Acceptance Criteria

1. WHEN the member presses `⌘K` (macOS) or `Ctrl+K` (Windows/Linux), THE Bible_Explorer SHALL open the `CommandPalette` component as a modal overlay.
2. THE Command_Palette SHALL provide commands to navigate to any of the 66 canonical Bible books.
3. THE Command_Palette SHALL provide commands to switch between the available translations (KJV, WEB, ASV).
4. THE Command_Palette SHALL provide commands to toggle Focus Mode, navigate to the Bookmarks tab, and navigate to the Progress tab.
5. WHEN the member types a search query in the Command_Palette, THE Bible_Explorer SHALL execute an inline verse search using `Bible_Service.searchVerses()` from local JSON and display matching results within the palette.
6. WHEN the member selects a search result in the Command_Palette, THE Bible_Explorer SHALL close the palette and navigate the Reading_Area to the corresponding book and chapter.
7. WHEN the member presses `Escape` while the Command_Palette is open, THE Bible_Explorer SHALL close the palette.
8. THE Command_Palette SHALL be accessible via keyboard navigation (arrow keys to move between results, Enter to select).

---

### Requirement 11: Verse Notes (Inline Tiptap Editor)

**User Story:** As a member, I want to write private notes on individual verses using a rich-text editor, so that I can record my personal reflections and study insights.

#### Acceptance Criteria

1. THE Bible_Explorer SHALL persist verse notes to a Supabase table `verse_notes` with columns: `id` (VARCHAR), `tenant_id` (VARCHAR), `member_id` (VARCHAR), `book_id` (VARCHAR), `chapter` (INTEGER), `verse_number` (INTEGER), `content` (TEXT), `updated_at` (TIMESTAMPTZ).
2. WHEN the member clicks the note action on a Verse_Row, THE Bible_Explorer SHALL expand an inline `Tiptap_Editor` beneath that verse.
3. THE Tiptap_Editor SHALL support bold, italic, underline, highlight, and placeholder text.
4. WHEN the member types in the Tiptap_Editor, THE Bible_Explorer SHALL auto-save the note content to `verse_notes` after a 1000ms debounce.
5. WHEN a verse has a saved note, THE Reading_Area SHALL display a dot indicator on that Verse_Row to signal the presence of a note.
6. THE verse notes SHALL be private to the `member_id` — no other member SHALL be able to read or query another member's notes.
7. ALL queries to `verse_notes` SHALL be scoped by `tenant_id` and `member_id` from `useChurch()`.
8. IF a Supabase write to `verse_notes` fails, THEN THE Bible_Explorer SHALL display a `toast.error()` notification.

---

### Requirement 12: Global Design Rules

**User Story:** As a member, I want the Bible Explorer to feel visually consistent and polished, so that the reading experience matches the premium quality of the rest of Vestry Hub.

#### Acceptance Criteria

1. THE Bible_Explorer SHALL apply a page background colour of `#fafaf9` to create a warm, paper-like reading surface.
2. THE Reading_Area SHALL render verse text in colour `#1c1917`.
3. THE Reading_Area SHALL render verse numbers in orange at 40% opacity (`text-orange-500/40`).
4. ALL card elements in the Bible_Explorer SHALL use `rounded-xl` border radius and `shadow-sm`.
5. THE Bible_Explorer SHALL display skeleton loaders (using the shadcn `Skeleton` component) during all data loading states — no spinner icons.
6. ALL Framer Motion spring animations in the Bible_Explorer SHALL use the config `{ type: "spring", bounce: 0.2, duration: 0.4 }`.
7. ALL Supabase queries in the Bible_Explorer SHALL be scoped by `tenant_id` from `useChurch()`.
8. THE Bible_Explorer SHALL use `TABLES` and `COLS` constants from `src/lib/schema.ts` for all Supabase table and column references — no hardcoded strings.
9. THE Bible_Explorer SHALL use `font-jakarta` (Plus Jakarta Sans) as the primary typeface.
10. THE Bible_Explorer SHALL use TanStack Query `useQuery` hooks with `staleTime: 300_000` for all data fetching — no `useEffect + useState` data fetching patterns.
11. THE Bible_Explorer SHALL use `useChurch()` context to obtain `tenantId` and `userId` for all Supabase operations.
12. THE Bible_Explorer page SHALL be wrapped in `<PageTransition>` for consistent page-level animation.
