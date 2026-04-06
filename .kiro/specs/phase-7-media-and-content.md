Here is your **Phase 7 prompt** — Media & Content:

---

## 🏗️ Lovable Prompt — Phase 7: Media & Content

---

**CONTEXT — What already exists, do not rebuild:**

This is **Vestry**, a multi-tenant Church SaaS platform. The following phases are already complete:
- Phase 0: Supabase Auth, onboarding, church access code + QR code
- Phase 1: AppLayout (collapsible sidebar, top navbar, dark mode), AuthGuard, Dashboard Overview, all routes scaffolded
- Phase 2: Full Settings (all 8 sub-sections), public church page at `/church/:slug`
- Phase 3: Full People module (Members, Groups, House Fellowships, Families, Visitors, Follow-Up Tasks, New Converts)
- Phase 4: Full Finance module (Give Online, Giving Records, Pledge Campaigns, Church Expenses, Budget Management, Payroll, Fund Accounting, Accounts Payable, General Ledger, Payouts)
- Phase 5: Full Events & Operations module (Services, Events, Volunteering, Member Requests, Board Meetings, Facility & Event Booking)
- Phase 6: Full Security & Communications module (Security Centre, Incident Management, Communications, Announcements, Member Messaging, Testimonies, Surveys)

**Do not touch any of the above. This phase replaces the placeholder pages for the Media & Content section only:**
`/graphics-studio`, `/ai-tools`, `/church-studio`, `/bible-explorer`, `/song-library`, `/church-media`, `/asset-management`, `/sermon-preparation`, `/sermons`, `/livestreaming`

All other placeholder pages remain untouched.

---

**TECH STACK (same throughout all phases):**
- React + TypeScript + Vite
- Supabase (PostgreSQL, RLS, Edge Functions, Storage)
- Tailwind CSS + shadcn/ui
- React Router v6
- TanStack Query v5
- React Hook Form + Zod
- Lucide React
- `react-helmet-async`
- Sonner (toasts)
- `date-fns`
- Recharts
- `papaparse`
- `@react-pdf/renderer`
- `qrcode.react`
- Additional libraries to install: `react-player` (video/audio playback), `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-placeholder` (rich text editor for sermon preparation)

---

### PART 1 — SHARED MEDIA COMPONENTS

**`<MediaUploadZone>` component:**
- Props: `accept: string[]` (e.g. `['image/*', 'video/*', 'audio/*']`), `maxSize: number` (bytes), `maxFiles: number`, `onUpload: (files: File[]) => Promise<void>`, `uploading: boolean`, `progress?: number`
- Drag and drop zone: dashed border, cloud upload icon, "Drag files here or click to browse"
- Shows accepted file types + max size below
- While uploading: progress bar + filename + "Uploading... X%" text
- On complete: green checkmark + filename + file size
- On error: red X + error message
- Supports multiple files (shows stacked progress bars if multiple)

**`<MediaThumbnail>` component:**
- Props: `url: string`, `type: 'image' | 'video' | 'audio' | 'document' | 'pdf'`, `name: string`, `size?: string`, `onClick?: () => void`
- Image: `<img>` with `object-cover`, rounded-lg, hover overlay with expand icon
- Video: thumbnail with play button overlay (centered white circle with triangle)
- Audio: waveform placeholder (static SVG waveform graphic) + audio icon + filename
- Document/PDF: file icon (color coded by type) + filename + size
- All variants: hover scale effect (`hover:scale-105 transition-transform`)

**`<MediaLightbox>` component:**
- Full-screen overlay modal for viewing media
- Image: centered `<img>` with zoom in/out buttons + download button
- Video: `<ReactPlayer>` centered, controls enabled
- Audio: audio player with waveform visualization
- Navigation: prev/next arrows if viewing within a gallery
- Close button (top right, X icon)
- Keyboard navigation: left/right arrow keys, Escape to close

**`<RichTextEditor>` component (wrapper around TipTap):**
- Props: `value: string`, `onChange: (html: string) => void`, `placeholder?: string`, `minHeight?: string`
- Toolbar: Bold, Italic, Underline, Strikethrough, | Heading 1, Heading 2, Heading 3, | Bullet List, Numbered List, Blockquote, | Link, | Undo, Redo
- Character count display (bottom right of editor)
- Styled with Tailwind: clean white background, subtle border, focus ring in indigo
- Dark mode support

**`<AudioPlayer>` component:**
- Props: `url: string`, `title: string`, `duration?: number`
- Custom styled audio player (not default browser controls):
  - Play/Pause button (large, indigo circle)
  - Progress bar (scrubable, indigo fill)
  - Current time / Total duration
  - Volume slider
  - Download button
  - Playback speed selector (0.75x / 1x / 1.25x / 1.5x / 2x)

---

### PART 2 — GRAPHICS STUDIO PAGE (`/graphics-studio`)

**Page title:** `Graphics Studio — Vestry`
**PageHeader:** "Graphics Studio" / "Upload and manage your church design assets"
**Header actions:** "Upload Assets" button + "Create Folder" button

---

**TOP STATS ROW (3 cards):**
- Total Assets (count of all files)
- Storage Used (`X MB / Y MB` based on plan limit)
- Recently Added (count uploaded in last 7 days)

---

**LAYOUT — File Manager Style:**

Two-column layout:
- Left panel (220px): Folder tree navigation
- Right panel (flex-1): Asset grid / list view

**Left panel — Folder Tree:**
- Root: "All Assets" (shows everything)
- Default folders: Flyers / Banners / Social Media / Logos / Backgrounds / Miscellaneous
- Custom folders (created by the church)
- Each folder: folder icon + name + asset count badge
- Selected folder highlighted in indigo
- "+" button next to "Folders" header to create a new folder
- Right-click context menu on folder: Rename, Delete (with confirmation — must be empty to delete, or force delete with warning)

**Right panel — Asset Grid:**

View toggle (grid / list) in top right.

**Grid view:** `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3`
- Each asset: `<MediaThumbnail>` with filename below (truncated), file size in `text-xs text-slate-400`
- Checkbox overlay (top-left) on hover for multi-select
- Three-dot menu (top-right) on hover: Download, Move to Folder, Rename, Delete

**List view:** table with columns: Name, Type, Size, Uploaded By, Date, Folder, Actions

**Upload Assets:**
- Clicking "Upload Assets" button opens a Sheet with `<MediaUploadZone>`
- Accepts: images (PNG, JPG, WEBP, SVG), PDFs
- Max file size: 10MB per file
- Max files per upload: 20
- Folder selector: where to place uploaded files (select from folder list)
- On upload: INSERT into `media_assets` table + upload file to Supabase Storage `graphics-studio/{church_id}/{folder_id}/{filename}`

**Asset Detail — Sheet (on click):**
- Large preview (image) or file icon
- Filename (editable inline)
- File info: type, size, dimensions (for images), uploaded by, uploaded date
- Tags (tag input — editable)
- Folder (editable select)
- Direct URL (copy button)
- "Download" button
- "Delete" button (red, with confirmation)
- Usage info: "Used in X announcements, X events" (future — for now just show the field)

**Bulk actions (when items selected):**
- Move to Folder (select folder → move all selected)
- Download as ZIP (trigger browser download of selected files as a ZIP — use `jszip` library)
- Delete Selected (confirmation dialog with count)

---

### PART 3 — AI TOOLS PAGE (`/ai-tools`)

**Page title:** `AI Tools — Vestry`
**PageHeader:** "AI Tools" / "Generate content for your church using artificial intelligence"

---

**Layout:** Grid of AI tool cards, each opening a dedicated tool interface.

`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

**Available AI Tools (9 tools):**

1. **Sermon Outline Generator** — "Generate a structured sermon outline from a scripture or topic"
2. **Prayer Points Generator** — "Generate targeted prayer points for any theme or need"
3. **Announcement Writer** — "Write compelling church announcements in seconds"
4. **Devotional Writer** — "Create daily devotional content from a scripture passage"
5. **Social Media Caption Writer** — "Generate engaging captions for church social media posts"
6. **Event Description Writer** — "Write compelling descriptions for your church events"
7. **Newsletter Writer** — "Draft a church newsletter from bullet points"
8. **Bible Study Questions** — "Generate discussion questions for any Bible passage"
9. **Pastoral Letter Writer** — "Draft formal pastoral letters and communications"

Each tool card:
- Tool icon (relevant Lucide icon)
- Tool name in `font-semibold`
- Description in `text-sm text-slate-500`
- "Open Tool" button (indigo outline)
- Usage count badge (e.g. "Used 24 times") — from `ai_tool_usage` table

---

**AI TOOL INTERFACE (Sheet, opens when "Open Tool" is clicked):**

The Sheet is wide (`max-w-2xl`). Layout: input form on top, generated output below.

**For each tool, show the appropriate input fields. Examples:**

*Sermon Outline Generator:*
- Scripture Reference (text input, e.g. "John 3:16" or "Romans 8:28-39")
- Sermon Topic / Title (text input)
- Target Audience (select: General / Youth / Children / Women / Men / New Believers)
- Sermon Duration (select: 20 min / 30 min / 45 min / 60 min)
- Preaching Style (select: Expository / Topical / Narrative / Evangelistic)
- Number of Points (select: 3 / 4 / 5)
- Generate button (indigo, full width)

*Prayer Points Generator:*
- Theme / Topic (text input, e.g. "healing", "national peace", "finances")
- Context (textarea, optional — e.g. "Our church is going through a building project")
- Number of Prayer Points (select: 5 / 7 / 10 / 12)
- Style (select: Conversational / Liturgical / Warfare / Thanksgiving)
- Generate button

*Announcement Writer:*
- Event/Announcement Topic (text input)
- Key Details (textarea — dates, times, locations, etc.)
- Tone (select: Formal / Friendly / Urgent / Celebratory)
- Length (select: Short (1 para) / Medium (2-3 paras) / Long (full announcement))
- Generate button

*(Similar input structures for remaining tools — always: relevant inputs + Generate button)*

**Output section (appears after generation):**
- `<RichTextEditor>` pre-filled with the AI-generated content (editable — user can tweak before copying)
- Action bar below the editor:
  - "Copy to Clipboard" button
  - "Use in Sermon Prep" button (visible for sermon outlines — saves to `/sermon-preparation` as a new draft)
  - "Use in Announcement" button (visible for announcements — pre-fills the Announcements compose form)
  - "Regenerate" button (reruns the API call with same inputs)
  - "Clear" button

**API Integration:**
- All AI tools call the Anthropic Claude API via a Supabase Edge Function `generate-content`
- The Edge Function accepts: `{tool: string, inputs: Record<string, string>, churchId: string}`
- It constructs an appropriate system prompt per tool type and calls `claude-sonnet-4-20250514` with `max_tokens: 2000`
- The Edge Function returns the generated text
- Store each usage in `ai_tool_usage` table: `{church_id, tool_name, input_summary, created_by, created_at}`
- Show a loading spinner + "Generating with AI..." text while the Edge Function is running
- On error: `toast.error("Generation failed. Please try again.")`
- The API key is stored as a Supabase secret `ANTHROPIC_API_KEY` — never expose it to the frontend

---

### PART 4 — CHURCH STUDIO PAGE (`/church-studio`)

**Page title:** `Church Studio — Vestry`
**PageHeader:** "Church Studio" / "Your audio and video sermon library"
**Header actions:** "Upload Media" button

---

**TOP STATS ROW (3 cards):**
- Total Sermons (count of all published media items)
- Total Duration (sum of all media durations, formatted as "X hours Y mins")
- Storage Used (total size of all uploaded media files)

---

**TWO-TAB LAYOUT:**

*All Media tab (default):*

Filter bar: search input + media type (All / Audio / Video) + series filter + speaker filter + date range

`<DataTable>` with columns:

| Column | Content | Sortable |
|--------|---------|----------|
| Title | Thumbnail + title + series badge | ✅ |
| Type | Audio / Video badge | ✅ |
| Speaker | Avatar + name | ✅ |
| Series | Series name (or "—") | ✅ |
| Duration | Formatted duration (e.g. "42:30") | ✅ |
| Size | File size | ✅ |
| Uploaded | Date | ✅ |
| Status | Published / Draft / Processing | ✅ |
| Actions | Play, Edit, Download, Delete | — |

Clicking "Play" opens `<MediaLightbox>` with the audio or video player.

*Series tab:*

Card grid of sermon series: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

Each series card:
- Series cover image (uploaded, or auto-generated indigo gradient with series title)
- Series title in `font-semibold`
- Episode count badge: "X episodes"
- Speaker(s): avatar stack
- Date range: "Jan 2024 — Mar 2024"
- Description excerpt
- "View Series" button

---

**UPLOAD MEDIA — Sheet form:**

Fields:
- Title (required, max 200 chars)
- Media Type (radio: Audio / Video)
- File Upload (`<MediaUploadZone>`):
  - Audio: accepts MP3, WAV, M4A — max 500MB
  - Video: accepts MP4, MOV, WEBM — max 2GB
  - Shows upload progress bar (large, prominent — these are big files)
  - Upload to Supabase Storage `church-studio/{church_id}/{media_id}/`
- Thumbnail Image (image upload, optional — auto-generated from video if video type)
- Speaker (searchable select from `members` or free text for guests)
- Series (select from existing series or "Create New Series" option)
- Scripture Reference (text input, e.g. "Matthew 5:1-12")
- Description (textarea)
- Duration (auto-detected from file metadata, or manual input MM:SS)
- Recording Date (date picker, default today)
- Tags (tag input)
- Status (select: Published / Draft, default Published)

**Create New Series (inline, triggered from upload form):**
- Appears as an expandable section when "Create New Series" is selected
- Fields: Series Title, Description, Cover Image Upload, Start Date

---

**MEDIA DETAIL PAGE (`/church-studio/:mediaId`):**

**Layout:** Full-width player at top, metadata below in two columns.

**Player section (full width, `bg-slate-900` dark background):**
- Video: `<ReactPlayer>` with full controls, autoplay off, responsive 16:9 container
- Audio: church logo / sermon thumbnail displayed large (album-art style), `<AudioPlayer>` component below

**Content (two columns below player):**

*Left (2/3):*
- Title in `text-2xl font-bold`
- Speaker + recording date + duration
- Scripture reference (highlighted chip)
- Series badge (links to series detail)
- Description (full text)
- Tags (chips)
- "Download" button + "Share" button (copies link)

*Right (1/3):*
- Series playlist card: if this media is in a series, show the full episode list. Current episode highlighted. Click other episodes to navigate.
- Related media: 3 most recent media from same speaker or series

---

### PART 5 — BIBLE EXPLORER PAGE (`/bible-explorer`)

**Page title:** `Bible Explorer — Vestry`
**PageHeader:** "Bible Explorer" / "Search, read and study the Bible"

---

**Layout:** Three-panel layout on desktop, stacked on mobile.

**Panel 1 — Navigation (left, 200px):**
- Bible version selector at top: dropdown (KJV / NIV / ESV / NLT / NKJV / AMP — stored as user preference)
- Book list: Old Testament section + New Testament section with `<details>` expand/collapse
- Each book: click to load in Panel 2
- Current book highlighted in indigo
- Search icon at top opens Panel 3 into search mode

**Panel 2 — Reading pane (flex-1, center):**
- Book name + Chapter navigation: prev/next arrows + chapter number buttons (responsive — shows dropdown on mobile)
- Verse display:
  - Verse number in `text-xs font-bold text-slate-400 mr-2 select-none`
  - Verse text in `text-base leading-relaxed`
  - Clicking a verse: highlights it in indigo-50 background
  - Right-click / long-press on verse: context menu → Copy Verse, Add Note, Highlight (color picker: yellow/green/blue/pink), Add to Favorites
- Font size controls (A- / A+) — persisted to localStorage
- Line spacing toggle (normal / relaxed / loose)
- Reading mode toggle: Normal / Focus Mode (hides sidebar, centers text, increases font, adds subtle paper background texture)

**Bible data source:**
Use the free **Bible API** at `https://bible-api.com/{book}+{chapter}` (no auth required, returns KJV). For other versions, integrate `api.scripture.api.bible` (requires free API key stored as Supabase secret `BIBLE_API_KEY`). Cache responses in TanStack Query with `staleTime: Infinity` — Bible text never changes.

**Panel 3 — Search & Notes (right, 280px):**

Two tabs:

*Search tab (default):*
- Search input: "Search the Bible..."
- Results appear as verse cards: reference (bold) + verse text excerpt + click to navigate to that verse in Panel 2
- Recent searches (stored in localStorage, last 10)
- Suggested searches: "Verse of the day" (pulled from Bible API or hardcoded rotation)

*Notes tab:*
- List of all user notes (from `bible_notes` table):
  - Each note: scripture reference + note text + date
  - Click to navigate to that verse
  - Edit (inline) + Delete
- "Add Note" button → scripture reference input + note textarea → INSERT into `bible_notes`

**Highlighted verses** stored in `bible_highlights` table: `{user_id, book, chapter, verse, color, created_at}`
**Favorite verses** stored in `bible_favorites` table: same structure

---

### PART 6 — SONG LIBRARY PAGE (`/song-library`)

**Page title:** `Song Library — Vestry`
**PageHeader:** "Song Library" / "Manage your worship songs and lyrics"
**Header actions:** "Add Song" button

---

**Songs list — two views:**

**Card grid view (default):** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

Each song card:
- Song title in `font-semibold text-lg`
- Artist / Original artist in `text-sm text-slate-500`
- Tags row: genre chips (Hymn / Contemporary / Gospel / Praise / Worship / Other) + tempo badge (Slow / Medium / Fast) + key badge (e.g. "Key of G")
- Verse count: "X verses + chorus"
- Last used: "Last used {relative date}" or "Never used"
- Three-dot menu: View Lyrics, Edit, Add to Set List, Delete

**List view:** `<DataTable>` with columns: Title, Artist, Key, Tempo, Genre, Last Used, Actions

Filter bar: search input + genre filter + key filter + tempo filter + tag filter

---

**ADD / EDIT SONG — Sheet form:**

Fields:
- Song Title (required)
- Artist / Original Artist (text input)
- Genre (select: Hymn / Contemporary Gospel / Praise / Worship / Other)
- Key (select: A / A# / Bb / B / C / C# / Db / D / D# / Eb / E / F / F# / Gb / G / G# / Ab)
- Tempo (select: Slow / Medium / Fast)
- Time Signature (select: 4/4 / 3/4 / 6/8 / Other)
- BPM (number input, optional)
- Lyrics (rich textarea — structured with verse/chorus labels):
  - Dynamic sections: add "Verse 1", "Chorus", "Bridge", "Verse 2" etc.
  - Each section: label (editable text, e.g. "Verse 1") + lyrics textarea
  - "Add Section" button
  - Drag to reorder sections using `@dnd-kit/sortable`
- Chord Chart (textarea, optional — plain text chord notation above lyrics)
- CCLI Number (text input, optional — for copyright compliance)
- Tags (tag input)
- Audio Preview (file upload — MP3/WAV — optional reference recording)
- Notes (textarea)

---

**SONG DETAIL / LYRICS VIEW — Sheet (full height):**

Opens on "View Lyrics" action.

- Song title + artist + key badge + tempo badge
- Full lyrics displayed section by section:
  - Section label in `text-xs font-bold uppercase text-indigo-600 mb-1` (e.g. "VERSE 1")
  - Lyrics in `text-base leading-relaxed whitespace-pre-wrap`
  - Subtle separator between sections
- Chord chart toggle (show/hide chords above lyrics)
- Print button: opens print dialog with clean lyrics-only formatting
- "Add to Set List" button
- Transpose tool: key selector dropdown + "Transpose" button — updates chord display to new key (client-side transposition logic: map each chord to semitone offset)
- Audio preview player (if audio file uploaded)

---

**SET LISTS:**

A sub-section (accessible via a "Set Lists" tab on the Song Library page):

Each set list: service/event name + date + songs list (ordered) + "Use This Set List" button

Create Set List:
- Set List Name (text input)
- Date / Service (date picker + service select)
- Songs: searchable multi-select from song library, drag to reorder
- Notes (textarea)
- Save → INSERT into `set_lists` + `set_list_songs` tables

---

### PART 7 — CHURCH MEDIA PAGE (`/church-media`)

**Page title:** `Church Media — Vestry`
**PageHeader:** "Church Media" / "Photos and videos from your church"
**Header actions:** "Upload Media" button + "Create Album" button

---

**Albums grid (top section):**

`grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`

Each album card:
- Cover photo (first photo in album, or grey placeholder)
- Album name in `font-semibold`
- Photo count badge
- Event/service link badge (if linked to an event)
- Date range of photos
- Three-dot menu: Edit, Download All, Delete

"All Photos" is always the first card (shows all photos across all albums).

**Photos grid (below albums or when album is selected):**

Masonry-style or uniform grid: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2`

Each photo:
- `<img>` with `object-cover aspect-square rounded-md`
- Hover: dark overlay + expand icon (center) + checkbox (top-left) + three-dot menu (top-right)
- Click: opens `<MediaLightbox>` in gallery mode (left/right navigation through all photos in current album)

**Upload Media — Sheet:**
- `<MediaUploadZone>` accepting images (JPG, PNG, WEBP) and videos (MP4, MOV) — max 25MB per file — max 50 files at once
- Album selector (which album to add to) + "Create New Album" inline option
- Caption (textarea, optional — applied to all uploaded files or individual captions toggle)
- Linked Event (optional select from events)
- Upload progress: grid of file thumbnails each with their own progress bar
- Upload to Supabase Storage `church-media/{church_id}/{album_id}/{filename}`

**Lightbox (from `<MediaLightbox>`):**
- Full-screen overlay
- Caption below image
- Download button, Share button (copy direct URL), Delete button
- Photo info sidebar (date taken, file size, album, linked event)
- Left/right navigation with keyboard support

---

### PART 8 — ASSET MANAGEMENT PAGE (`/asset-management`)

**Page title:** `Asset Management — Vestry`
**PageHeader:** "Asset Management" / "Track and manage church physical assets"
**Header actions:** "Add Asset" button + "Export" button

---

**TOP STATS ROW (3 cards):**
- Total Assets (count)
- Total Value (sum of `purchase_value` for all assets)
- Assets Under Maintenance (count where `status = 'maintenance'`)

---

**Assets Table:**

`<DataTable>` with columns:

| Column | Content | Sortable |
|--------|---------|----------|
| Asset | Photo thumbnail (40px square) + name in `font-medium` | ✅ |
| Category | Badge (Audio Equipment / Furniture / Vehicle / IT Equipment / Kitchen / Musical Instruments / Other) | ✅ |
| Location | Where the asset is kept | ✅ |
| Condition | Badge: Excellent / Good / Fair / Poor / Damaged | ✅ |
| Status | In Use / Available / Maintenance / Disposed (`<StatusBadge>`) | ✅ |
| Purchase Value | `<CurrencyDisplay>` | ✅ |
| Purchase Date | Formatted date | ✅ |
| Actions | View, Edit, Delete | — |

Filter sidebar: category, condition, status, location, date range

---

**ADD / EDIT ASSET — Sheet form:**

Fields:
- Asset Name (required)
- Category (select: Audio Equipment / Furniture / Vehicle / IT Equipment / Kitchen / Musical Instruments / Building / Other)
- Description (textarea)
- Asset Photo (image upload → Supabase Storage `assets/{church_id}/{asset_id}/`)
- Serial Number (text input)
- Model / Brand (text input)
- Location (text input — e.g. "Main Hall", "Sound Room", "Office")
- Condition (select: Excellent / Good / Fair / Poor / Damaged)
- Status (select: In Use / Available / Maintenance / Disposed)
- Purchase Date (date picker)
- Purchase Value (number input with currency)
- Supplier / Vendor (text input)
- Warranty Expiry Date (date picker, optional)
- Assigned To (searchable member select — who is responsible for this asset)
- Maintenance Notes (textarea)
- Next Maintenance Due (date picker, optional)

**Asset Detail — Sheet:**
- Asset photo (large)
- All metadata
- Maintenance history:
  - List of maintenance records: date, description, cost, performed by
  - "Log Maintenance" button → date + description + cost + performed by → INSERT into `asset_maintenance` table
- Depreciation calculator (basic):
  - Inputs: purchase value, useful life (years, number input), salvage value
  - Output: current book value + annual depreciation amount (straight-line method)
  - Displayed as a small table: Year 1 → Year N with book values

---

### PART 9 — SERMON PREPARATION PAGE (`/sermon-preparation`)

**Page title:** `Sermon Preparation — Vestry`
**PageHeader:** "Sermon Preparation" / "Draft, organize and prepare your sermons"
**Header actions:** "New Sermon" button

---

**Sermons list (left panel, 280px) + Editor (right panel, flex-1) — IDE-style layout:**

*Left panel — Sermon list:*
- Search input at top
- Filter: All / My Sermons / Drafts / Published / Archived
- Each sermon item: title (truncated) + status badge + date + speaker avatar
- "New Sermon" button at top of list
- Selected sermon highlighted

*Right panel — Sermon editor:*
- Shows when a sermon is selected, or "Select a sermon to begin editing" empty state

---

**SERMON EDITOR:**

**Editor Header (sticky):**
- Sermon title (large editable input, `text-2xl font-bold`, placeholder "Sermon Title...")
- Status badge (Draft / Ready / Published) — click to change
- "Publish to Church Studio" button (indigo) — publishes the sermon to `/sermons` page + optionally links to a Church Studio media upload
- Last saved indicator: "Saved 2 minutes ago" — auto-saves every 30 seconds via debounced mutation
- More actions menu: Duplicate, Archive, Delete, Export as PDF

**Editor body (two-column on large screens, stacked on mobile):**

*Left — Main editor (2/3 width):*

Tabbed content:

*Outline tab (default):*
- Scripture Reference (text input, prominent, e.g. "John 15:1-8")
- Introduction (rich text — `<RichTextEditor>` with min-height 100px)
- Main Points (dynamic list — add/remove/reorder using `@dnd-kit/sortable`):
  - Each main point: Point number (auto) + Point title (text input) + Point body (collapsible `<RichTextEditor>`)
  - Sub-points can be nested inside each main point (add sub-point button inside each point)
- Conclusion (rich text)
- Altar Call / Application (rich text, optional section)
- "Add Section" button (adds custom sections: Illustration / Story / Quote / Prayer / Application)

*Full Manuscript tab:*
- Single `<RichTextEditor>` for writing the complete sermon manuscript
- Pre-populated from the outline if outline was filled in first ("Import from Outline" button)

*Notes tab:*
- Private notes, research, quotes, illustrations — `<RichTextEditor>`

**Right — Sidebar (1/3 width):**

*Sermon Details card:*
- Speaker (searchable member select or free text, default current user)
- Series (select from existing sermon series or create new)
- Date to Preach (date picker)
- Occasion (select: Regular Service / Special Service / Conference / Funeral / Wedding / Other)
- Target Audience (select)
- Duration (number input — estimated minutes)
- Tags (tag input)

*Scripture References card:*
- List of all scripture references added (can be tagged inline in the editor by typing e.g. `@John3:16` and selecting from a dropdown)
- Click any reference: opens a small Bible popup showing the verse text inline

*Resources card:*
- Upload reference documents (PDFs, images) for this sermon
- Saved to Supabase Storage `sermon-resources/{church_id}/{sermon_id}/`
- List of uploaded files with download buttons

*AI Assist card:*
- "Generate Outline with AI" button → shortcut to AI Tools, pre-fills sermon topic from current sermon title
- "Suggest Illustrations" button → calls Claude API to suggest relevant illustrations/stories for the sermon topic
- "Generate Prayer Points" button → generates prayer points for the sermon theme

---

**EXPORT SERMON AS PDF:**
Uses `@react-pdf/renderer` to generate a clean PDF:
- Church logo header
- Sermon title (large)
- Scripture reference
- Speaker + date
- Full outline/manuscript content
- Footer: church name

---

### PART 10 — SERMONS & MESSAGES PAGE (`/sermons`)

**Page title:** `Sermons & Messages — Vestry`
**PageHeader:** "Sermons & Messages" / "Published sermon archive"
**Header actions:** "Upload Sermon" button (links to Church Studio upload)

---

This is the published-facing sermon archive. It shows sermons that have been published from Sermon Preparation or uploaded directly in Church Studio.

**Filter bar:** search input + series filter + speaker filter + media type (All / Audio / Video) + date range

**Sermons grid:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

Each sermon card:
- Thumbnail image (video thumbnail or sermon banner, or indigo gradient with scripture ref)
- Media type badge (Audio / Video) in top-left corner of thumbnail
- Duration badge in top-right corner (e.g. "42:30")
- Series badge below thumbnail
- Sermon title in `font-semibold text-lg`
- Scripture reference in `text-sm text-indigo-600`
- Speaker avatar + name + date
- Description excerpt (2 lines)
- Play button (prominent, centered below description)
- Download button + Share button (icon buttons)

**Series section (below sermons grid):**

"Browse by Series" heading + horizontal scroll row of series cards:
- Series cover + name + episode count
- Click → filters the sermons grid to that series only

**Sermon Detail page (`/sermons/:sermonId`):**

Full-page layout with player at top (reuses Church Studio media detail layout) + sermon notes below:
- Sermon notes (from sermon preparation notes field)
- Scripture reference with inline verse text
- Downloads section: "Download Audio/Video" + "Download Notes PDF"
- Share buttons
- Series navigation (prev/next sermon in series)

---

### PART 11 — LIVESTREAMING PAGE (`/livestreaming`)

**Page title:** `Livestreaming — Vestry`
**PageHeader:** "Livestreaming" / "Manage and embed live streams for your church"
**Header actions:** "Schedule Stream" button

---

**TWO-TAB LAYOUT:**

*Active / Upcoming tab (default):*

**Live Now section (shown only if there is a stream with `status = 'live'`):**
- Large prominent card with red pulsing "🔴 LIVE" badge
- Stream title + service/event name
- Embedded `<ReactPlayer>` showing the live stream (YouTube/Zoom embed)
- Viewer count (if available from YouTube API)
- "Share Stream" button → copies stream URL

**Upcoming Streams section:**
Card list of scheduled streams:
- Each card: stream title, linked service/event, platform (YouTube / Zoom / Facebook / Other), scheduled datetime, countdown timer (e.g. "Starts in 2 hours 15 minutes"), stream URL, status badge
- "Go Live" button (changes status to live when the time comes)
- "Edit" + "Cancel" actions

*Past Streams tab:*
`<DataTable>` of completed streams: title, platform, date, duration, linked recording in Church Studio (if saved), actions (view, restream, delete)

---

**SCHEDULE STREAM — Sheet form:**

Fields:
- Stream Title (required)
- Platform (select: YouTube Live / Zoom / Facebook Live / Custom RTMP / Other)
- Stream URL / Embed URL (text input — paste the YouTube/Zoom/Facebook live URL or embed code)
- Stream Key (text input, optional — for RTMP streams, stored securely)
- Linked Service or Event (select from upcoming services/events)
- Scheduled Start (datetime picker)
- Estimated Duration (number input — minutes)
- Description (textarea)
- Chat Embed URL (text input, optional — e.g. YouTube live chat embed)
- Enable on Public Church Page (toggle) — shows the live stream embed on `/church/:slug` during the stream
- Notify Members (toggle) — sends in-app notification to all members when stream goes live

**YouTube Integration:**
If YouTube integration is connected (from Settings → Integrations):
- "Fetch from YouTube" button: calls YouTube Data API to pull upcoming live broadcasts automatically, pre-filling the form

**Embed preview:**
After entering a stream URL, show a live preview of the `<ReactPlayer>` embed in the Sheet so the admin can verify it loads correctly before saving.

---

### PART 12 — DATABASE MIGRATIONS FOR PHASE 7

```sql
-- MEDIA ASSETS TABLE (Graphics Studio)
CREATE TABLE media_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  width INT,
  height INT,
  tags TEXT[],
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage media assets"
  ON media_assets FOR ALL
  USING (church_id IN (
    SELECT church_id FROM church_members
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- MEDIA FOLDERS TABLE
CREATE TABLE media_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES media_folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage folders"
  ON media_folders FOR ALL
  USING (church_id IN (
    SELECT church_id FROM church_members
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- AI TOOL USAGE TABLE
CREATE TABLE ai_tool_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  tool_name TEXT NOT NULL,
  input_summary TEXT,
  output_length INT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ai_tool_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage AI usage"
  ON ai_tool_usage FOR ALL
  USING (church_id IN (
    SELECT church_id FROM church_members
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- SERMON SERIES TABLE
CREATE TABLE sermon_series (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE sermon_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage sermon series"
  ON sermon_series FOR ALL
  USING (church_id IN (
    SELECT church_id FROM church_members
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- CHURCH STUDIO MEDIA TABLE
CREATE TABLE studio_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('audio','video')),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  speaker TEXT,
  speaker_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  series_id UUID REFERENCES sermon_series(id) ON DELETE SET NULL,
  scripture_reference TEXT,
  description TEXT,
  duration_seconds INT,
  file_size BIGINT,
  recording_date DATE,
  tags TEXT[],
  status TEXT DEFAULT 'published' CHECK (status IN ('published','draft','processing')),
  linked_sermon_id UUID,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE studio_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage studio media"
  ON studio_media FOR ALL
  USING (church_id IN (
    SELECT church_id FROM church_members
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- BIBLE NOTES TABLE
CREATE TABLE bible_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  book TEXT NOT NULL,
  chapter INT NOT NULL,
  verse INT NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE bible_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own Bible notes"
  ON bible_notes FOR ALL
  USING (user_id = auth.uid());

-- BIBLE HIGHLIGHTS TABLE
CREATE TABLE bible_highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book TEXT NOT NULL,
  chapter INT NOT NULL,
  verse INT NOT NULL,
  color TEXT DEFAULT 'yellow' CHECK (color IN ('yellow','green','blue','pink')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, book, chapter, verse)
);
ALTER TABLE bible_highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own highlights"
  ON bible_highlights FOR ALL
  USING (user_id = auth.uid());

-- BIBLE FAVORITES TABLE
CREATE TABLE bible_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book TEXT NOT NULL,
  chapter INT NOT NULL,
  verse INT NOT NULL,
  verse_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, book, chapter, verse)
);
ALTER TABLE bible_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own favorites"
  ON bible_favorites FOR ALL
  USING (user_id = auth.uid());

-- SONGS TABLE
CREATE TABLE songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  genre TEXT DEFAULT 'other' CHECK (genre IN (
    'hymn','contemporary_gospel','praise','worship','other'
  )),
  key TEXT,
  tempo TEXT CHECK (tempo IN ('slow','medium','fast')),
  time_signature TEXT DEFAULT '4/4',
  bpm INT,
  sections JSONB DEFAULT '[]',
  chord_chart TEXT,
  ccli_number TEXT,
  tags TEXT[],
  audio_url TEXT,
  notes TEXT,
  last_used_date DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage songs"
  ON songs FOR ALL
  USING (church_id IN (
    SELECT church_id FROM church_members
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- SET LISTS TABLE
CREATE TABLE set_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  service_date DATE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE set_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage set lists"
  ON set_lists FOR ALL
  USING (church_id IN (
    SELECT church_id FROM church_members
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- SET LIST SONGS TABLE
CREATE TABLE set_list_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_list_id UUID REFERENCES set_lists(id) ON DELETE CASCADE NOT NULL,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE NOT NULL,
  position INT NOT NULL,
  key_override TEXT,
  notes TEXT,
  UNIQUE(set_list_id, song_id)
);
ALTER TABLE set_list_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage set list songs"
  ON set_list_songs FOR ALL
  USING (set_list_id IN (
    SELECT id FROM set_lists WHERE church_id IN (
      SELECT church_id FROM church_members
      WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
    )
  ));

-- CHURCH MEDIA ALBUMS TABLE
CREATE TABLE media_albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cover_photo_url TEXT,
  linked_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE media_albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage albums"
  ON media_albums FOR ALL
  USING (church_id IN (
    SELECT church_id FROM church_members
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- CHURCH MEDIA PHOTOS TABLE
CREATE TABLE media_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  album_id UUID REFERENCES media_albums(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'image' CHECK (file_type IN ('image','video')),
  caption TEXT,
  file_size BIGINT,
  width INT,
  height INT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE media_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage photos"
  ON media_photos FOR ALL
  USING (church_id IN (
    SELECT church_id FROM church_members
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- CHURCH ASSETS TABLE
CREATE TABLE church_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'other' CHECK (category IN (
    'audio_equipment','furniture','vehicle','it_equipment',
    'kitchen','musical_instruments','building','other'
  )),
  description TEXT,
  photo_url TEXT,
  serial_number TEXT,
  model TEXT,
  brand TEXT,
  location TEXT,
  condition TEXT DEFAULT 'good' CHECK (condition IN ('excellent','good','fair','poor','damaged')),
  status TEXT DEFAULT 'available' CHECK (status IN ('in_use','available','maintenance','disposed')),
  purchase_date DATE,
  purchase_value DECIMAL(12,2),
  currency TEXT DEFAULT 'KES',
  supplier TEXT,
  warranty_expiry DATE,
  assigned_to UUID REFERENCES members(id) ON DELETE SET NULL,
  maintenance_notes TEXT,
  next_maintenance_due DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE church_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage assets"
  ON church_assets FOR ALL
  USING (church_id IN (
    SELECT church_id FROM church_members
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- ASSET MAINTENANCE TABLE
CREATE TABLE asset_maintenance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES church_assets(id) ON DELETE CASCADE NOT NULL,
  maintenance_date DATE DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  cost DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'KES',
  performed_by TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE asset_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage maintenance"
  ON asset_maintenance FOR ALL
  USING (asset_id IN (
    SELECT id FROM church_assets WHERE church_id IN (
      SELECT church_id FROM church_members
      WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
    )
  ));

-- SERMONS TABLE (Sermon Preparation)
CREATE TABLE sermons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  scripture_reference TEXT,
  speaker TEXT,
  speaker_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  series_id UUID REFERENCES sermon_series(id) ON DELETE SET NULL,
  occasion TEXT DEFAULT 'regular_service' CHECK (occasion IN (
    'regular_service','special_service','conference','funeral','wedding','other'
  )),
  target_audience TEXT,
  estimated_duration INT,
  date_to_preach DATE,
  introduction TEXT,
  main_points JSONB DEFAULT '[]',
  conclusion TEXT,
  altar_call TEXT,
  manuscript TEXT,
  notes TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','ready','published','archived')),
  linked_studio_media_id UUID REFERENCES studio_media(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage sermons"
  ON sermons FOR ALL
  USING (church_id IN (
    SELECT church_id FROM church_members
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));

-- LIVESTREAMS TABLE
CREATE TABLE livestreams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN (
    'youtube','zoom','facebook','rtmp','other'
  )),
  stream_url TEXT NOT NULL,
  stream_key TEXT,
  embed_url TEXT,
  chat_embed_url TEXT,
  linked_service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  linked_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  scheduled_start TIMESTAMPTZ,
  estimated_duration INT,
  description TEXT,
  show_on_public_page BOOLEAN DEFAULT true,
  notify_members BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE livestreams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage livestreams"
  ON livestreams FOR ALL
  USING (church_id IN (
    SELECT church_id FROM church_members
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','staff')
  ));
```

---

**Build exactly this. Replace the 10 Media & Content placeholder pages from Phase 1 with fully functional, Supabase-connected pages as described. Install `react-player`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, and `jszip` if not already installed. The Supabase Edge Function `generate-content` must use the `ANTHROPIC_API_KEY` secret — never expose it to the frontend. Do not modify any code from Phases 1–6.**

