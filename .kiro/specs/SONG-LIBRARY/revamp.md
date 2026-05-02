# Kiro IDE Prompt — Song Library Full UI Revamp
## Church Hope ChMS · React + TypeScript + Tailwind + Framer Motion + shadcn/ui
## Theme: Spotify (dark) + Vercel (light) — Premium Dual-Mode

---

## 0. Guiding Aesthetic

The Song Library should feel like a **premium music product**, not a church admin form.

- **Light mode** → Vercel aesthetic: white surfaces, sharp type, ultra-thin borders (`0.5px`), generous whitespace, monospace key labels, subtle shadows
- **Dark mode** → Spotify aesthetic: deep `#0a0a0a` background, `#111111` card surfaces, `#7F77DD` purple accent glows, white text hierarchy, ambient color bleeding from song art
- Both modes use the same purple accent (`#7F77DD`) as the primary action color
- Typography: sharp, confident. Song titles in `font-semibold`, artists in muted secondary. No rounded bubbly fonts.
- Every interaction should have a micro-animation. Nothing is static.

---

## 1. Install Dependencies

```bash
npm install framer-motion motion @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities cmdk sonner
npx shadcn@latest add sheet tabs badge slider dropdown-menu toggle command sonner
npx shadcn@latest add @react-bits/BlurText-TS-TW
npx shadcn@latest add @react-bits/SpotlightCard-TS-TW
npx shadcn@latest add @react-bits/TiltedCard-TS-TW
npx shadcn@latest add @react-bits/ShinyText-TS-TW
npx shadcn@latest add @react-bits/Magnet-TS-TW
npx shadcn@latest add @react-bits/FadeContent-TS-TW
```

> CountUp and AnimatedList are already in the project from the Families revamp. Reuse them.

---

## 2. New File Structure

```
src/
  components/
    song-library/
      SongLibraryPage.jsx              ← REVAMPED: main page shell
      SongStatBar.jsx                  ← REVAMPED: animated stat cards (CountUp)
      SongSearchBar.jsx                ← NEW: ⌘K command palette search
      SongTabs.jsx                     ← REVAMPED: Songs / Service Planning tabs
      SongGrid.jsx                     ← NEW: card grid view
      SongList.jsx                     ← REVAMPED: list view with AnimatedList
      SongCard.jsx                     ← NEW: individual song card (grid mode)
      SongViewToggle.jsx               ← NEW: grid ↔ list toggle button
      SongContextMenu.jsx              ← NEW: ⋯ dropdown per song
      SongDetailDrawer.jsx             ← NEW: slide-in drawer for song detail/edit
      AddSongDrawer.jsx                ← REVAMPED: replaces Add Song modal
      ChordTransposer.jsx              ← NEW: transposition tool with slider
      SongCoverArt.jsx                 ← NEW: gradient cover + ambient color shadow
      EmptySongState.jsx               ← REVAMPED: animated empty state
      service-planning/
        ServicePlanningView.jsx        ← REVAMPED: full service planning view
        ServiceCard.jsx                ← NEW: individual service card
        SetlistBuilder.jsx             ← NEW: drag-and-drop setlist builder
        SetlistItem.jsx                ← NEW: draggable setlist row
        AddServiceDrawer.jsx           ← REVAMPED: replaces New Service modal
```

---

## 3. React Bits Components — Install and Use These Exactly

### 3a. BlurText — Page Heading Animation

Install: `npx shadcn@latest add @react-bits/BlurText-TS-TW`

Use on the main page heading:
```jsx
import BlurText from '@/components/ui/BlurText';

<BlurText
  text="Song Library"
  delay={80}
  animateBy="words"
  direction="top"
  className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white"
/>
```

### 3b. SpotlightCard — Song Cards in Grid View

Install: `npx shadcn@latest add @react-bits/SpotlightCard-TS-TW`

Wrap each `SongCard` in `SpotlightCard`:
```jsx
import SpotlightCard from '@/components/ui/SpotlightCard';

<SpotlightCard
  className="song-card"
  spotlightColor="rgba(127, 119, 221, 0.15)"
>
  <SongCard song={song} />
</SpotlightCard>
```

### 3c. TiltedCard — Featured/Recently Added Songs

Install: `npx shadcn@latest add @react-bits/TiltedCard-TS-TW`

Use for the top 3 most recently added songs shown in a "Recently Added" row above the main grid:
```jsx
import TiltedCard from '@/components/ui/TiltedCard';

<TiltedCard
  imageSrc={song.coverArtUrl || generateGradientDataUrl(song)}
  captionText={`${song.title} · ${song.artist}`}
  containerHeight="200px"
  containerWidth="200px"
  imageHeight="200px"
  imageWidth="200px"
  rotateAmplitude={10}
  scaleOnHover={1.05}
  showMobileWarning={false}
  showTooltip={true}
  displayOverlayContent={true}
  overlayContent={
    <div className="p-3">
      <p className="text-white font-medium text-sm">{song.title}</p>
      <p className="text-white/60 text-xs">{song.artist}</p>
      <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded mt-1 inline-block text-white">
        {song.key}
      </span>
    </div>
  }
/>
```

### 3d. ShinyText — Key Badges

Install: `npx shadcn@latest add @react-bits/ShinyText-TS-TW`

Use for the musical key displayed on each song card:
```jsx
import ShinyText from '@/components/ui/ShinyText';

<ShinyText
  text={song.key || '—'}
  disabled={false}
  speed={3}
  className="text-xs font-mono font-medium"
/>
```

### 3e. Magnet — Primary Action Buttons

Install: `npx shadcn@latest add @react-bits/Magnet-TS-TW`

Wrap the "+ Add Song" and "+ New Service" buttons:
```jsx
import Magnet from '@/components/ui/Magnet';

<Magnet strength={0.25} range={80}>
  <button
    onClick={() => setAddSongOpen(true)}
    className="flex items-center gap-2 px-4 py-2 bg-[#7F77DD] hover:bg-[#6b63c9] text-white rounded-lg text-sm font-medium transition-colors"
  >
    + Add Song
  </button>
</Magnet>
```

### 3f. FadeContent — Tab Content Transitions

Install: `npx shadcn@latest add @react-bits/FadeContent-TS-TW`

Wrap the content of each tab:
```jsx
import FadeContent from '@/components/ui/FadeContent';

<FadeContent blur={true} duration={400} easing="ease-out" initialOpacity={0}>
  {activeTab === 'songs' ? <SongGrid /> : <ServicePlanningView />}
</FadeContent>
```

---

## 4. SongCoverArt.jsx — Gradient Generation + Ambient Color Shadow

This component handles two cases:
1. **No cover art** → generate a unique gradient from the song title + key
2. **Has cover art** → render the image + extract dominant color → cast ambient glow

### Gradient Generation (no cover art)

```jsx
function generateGradientFromSong(title, key) {
  // Hash the title to get deterministic colors
  const hash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  };

  const keyColors = {
    'C':  ['#667eea', '#764ba2'],
    'G':  ['#f093fb', '#f5576c'],
    'D':  ['#4facfe', '#00f2fe'],
    'A':  ['#43e97b', '#38f9d7'],
    'E':  ['#fa709a', '#fee140'],
    'B':  ['#a18cd1', '#fbc2eb'],
    'F':  ['#ffecd2', '#fcb69f'],
    'Am': ['#a1c4fd', '#c2e9fb'],
    'Em': ['#d4fc79', '#96e6a1'],
    'Dm': ['#f6d365', '#fda085'],
    'Bb': ['#89f7fe', '#66a6ff'],
    'Eb': ['#fddb92', '#d1fdff'],
  };

  const titleHash = hash(title || 'song');
  const fallbackPairs = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
  ];

  const [from, to] = keyColors[key] || fallbackPairs[titleHash % fallbackPairs.length];
  const angle = (titleHash % 8) * 45;

  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}

// Generate a data URL for use as an image src (for TiltedCard)
function generateGradientDataUrl(song) {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 400, 400);
  const colors = getColorsForSong(song);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 400);
  // Add subtle music note watermark
  ctx.font = '120px serif';
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.textAlign = 'center';
  ctx.fillText('♪', 200, 240);
  return canvas.toDataURL('image/png');
}
```

### Ambient Color Extraction (has cover art)

When a song has a real cover image URL, use the Canvas API to extract the dominant color and render it as a blurred shadow/glow beneath the card:

```jsx
import { useEffect, useRef, useState } from 'react';

function useAmbientColor(imageUrl) {
  const [ambientColor, setAmbientColor] = useState(null);

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 50; // small sample for performance
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 50, 50);
      const data = ctx.getImageData(0, 0, 50, 50).data;

      // Average the RGB values
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      setAmbientColor(`rgb(${r}, ${g}, ${b})`);
    };
  }, [imageUrl]);

  return ambientColor;
}

// In SongCoverArt component:
export default function SongCoverArt({ song, size = 'md' }) {
  const ambientColor = useAmbientColor(song.coverArtUrl);
  const sizeMap = { sm: 'w-12 h-12', md: 'w-16 h-16', lg: 'w-40 h-40', xl: 'w-48 h-48' };

  return (
    <div className="relative" style={{ display: 'inline-block' }}>
      {/* Ambient glow shadow */}
      {ambientColor && (
        <div
          className="absolute inset-0 rounded-lg blur-xl opacity-60 scale-95 translate-y-2"
          style={{ background: ambientColor, zIndex: 0 }}
        />
      )}
      {/* Cover art */}
      <div
        className={`${sizeMap[size]} rounded-lg overflow-hidden relative z-10`}
        style={{
          background: song.coverArtUrl ? undefined : generateGradientFromSong(song.title, song.key),
        }}
      >
        {song.coverArtUrl ? (
          <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white/40 text-2xl">♪</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 5. SongStatBar.jsx — Revamped Animated Stat Cards

Keep the 4 existing stats: Total Songs, With Lyrics, With Chords, Services.

**Design:**
- Light mode: white card, `0.5px` border, subtle left accent bar in purple
- Dark mode: `#1a1a1a` card, faint purple border on hover
- Each card has: small colored icon (existing), muted label, `CountUp` animated number, and a tiny sub-label (e.g. "songs in library")
- Cards animate in with Framer Motion `staggerChildren` (delay 0.08s per card)

```jsx
import { motion } from 'framer-motion';
import CountUp from '@/components/ui/CountUp';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } }
};
const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

// 4 cards in a grid, each with CountUp number
// Render as: motion.div variants={containerVariants} > 4x motion.div variants={cardVariants}
```

---

## 6. SongSearchBar.jsx — ⌘K Command Palette

Replace the plain search input with a `cmdk`-powered command palette.

**Trigger:** A search bar that says `Search songs... ⌘K` — clicking it or pressing `⌘K` opens the palette.

```jsx
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// State: open (boolean)
// Keyboard shortcut:
useEffect(() => {
  const down = (e) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setOpen(true);
    }
  };
  document.addEventListener('keydown', down);
  return () => document.removeEventListener('keydown', down);
}, []);

// Render inside <Dialog open={open} onOpenChange={setOpen}>
//   <DialogContent className="p-0 overflow-hidden ...vercel dark modal style">
//     <Command>
//       <CommandInput placeholder="Search songs, artists, keys..." />
//       <CommandList>
//         <CommandEmpty>No songs found.</CommandEmpty>
//         <CommandGroup heading="Songs">
//           {filteredSongs.map(song => (
//             <CommandItem key={song.id} onSelect={() => { openSong(song); setOpen(false); }}>
//               <SongCoverArt song={song} size="sm" />
//               <div className="ml-2">
//                 <p className="text-sm font-medium">{song.title}</p>
//                 <p className="text-xs text-muted-foreground">{song.artist} · {song.key}</p>
//               </div>
//             </CommandItem>
//           ))}
//         </CommandGroup>
//         <CommandGroup heading="Quick Actions">
//           <CommandItem onSelect={() => setAddSongOpen(true)}>+ Add new song</CommandItem>
//           <CommandItem onSelect={() => setAddServiceOpen(true)}>+ New service</CommandItem>
//         </CommandGroup>
//       </CommandList>
//     </Command>
//   </DialogContent>
// </Dialog>
```

**Styling (Vercel-style dark palette):**
- Light: white bg, `border border-slate-200`, `shadow-2xl`
- Dark: `bg-[#111111]`, `border border-white/10`, `shadow-2xl`
- Input: no border, full width, `text-sm`
- Items: hover `bg-slate-100 dark:bg-white/5`, selected purple accent

---

## 7. SongTabs.jsx — Revamped Tab Bar

Replace the existing plain tab buttons with a Vercel-style sliding underline tab bar.

```jsx
import { motion } from 'framer-motion';

const tabs = [
  { id: 'songs', label: 'Songs', icon: '♪' },
  { id: 'services', label: 'Service Planning', icon: '📅' }
];

// Render each tab as a button
// Active tab: show a motion.div with layoutId="tab-underline" sliding indicator beneath it
// Tab content wrapped in FadeContent (React Bits) for blur transition

<div className="flex gap-0 border-b border-slate-200 dark:border-white/10">
  {tabs.map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className="relative px-4 py-2.5 text-sm font-medium ..."
    >
      {tab.label}
      {activeTab === tab.id && (
        <motion.div
          layoutId="tab-underline"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7F77DD]"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
    </button>
  ))}
</div>
```

---

## 8. SongGrid.jsx + SongCard.jsx — Card Grid View

### Grid layout

```jsx
// 4 columns on xl, 3 on lg, 2 on md, 1 on sm
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <AnimatePresence>
    {songs.map((song, index) => (
      <motion.div
        key={song.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        layout
      >
        <SpotlightCard spotlightColor="rgba(127, 119, 221, 0.12)">
          <SongCard song={song} />
        </SpotlightCard>
      </motion.div>
    ))}
  </AnimatePresence>
</div>
```

### SongCard design (each card)

```
┌─────────────────────────┐
│  [Cover Art / Gradient] │  ← SongCoverArt component (full width, 160px tall)
│                         │    with ambient glow shadow if real art
├─────────────────────────┤
│  Song Title             │  ← font-semibold, 14px, truncate
│  Artist / Author        │  ← muted, 12px
│                         │
│  [G] [4/4] [120 BPM]   │  ← ShinyText key badge + time sig + BPM badges
│                         │
│  [♪ Lyrics] [♫ Chords] │  ← small pills showing what's attached
│                         │
│  Last used: 3 days ago  │  ← muted 11px (usage history)
├─────────────────────────┤
│  [Add to Service]  [⋯] │  ← action row, hover-revealed
└─────────────────────────┘
```

**Hover behavior:**
- The action row at the bottom slides up into view with `motion.div` `y: 8 → 0, opacity: 0 → 1` on `whileHover` of the card
- The cover art scales up `1.03` on hover via CSS `transition`
- `SpotlightCard` glow follows the cursor

**Dark mode card:**
- `bg-[#111111]` surface
- `border border-white/8`
- Song title: `text-white`
- Artist: `text-white/50`
- Badges: `bg-white/10 text-white/70`

---

## 9. SongViewToggle.jsx — Grid ↔ List Toggle

```jsx
import { LayoutGrid, List } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

// Two toggle buttons side by side
// Active state: bg-[#7F77DD] text-white
// Inactive: transparent, muted icon
// Persists to localStorage key: 'song-library-view'
// Switch triggers AnimatePresence exit/enter of SongGrid vs SongList

<div className="flex border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
  <Toggle pressed={view === 'grid'} onPressedChange={() => setView('grid')}>
    <LayoutGrid size={15} />
  </Toggle>
  <Toggle pressed={view === 'list'} onPressedChange={() => setView('list')}>
    <List size={15} />
  </Toggle>
</div>
```

The view switch uses `AnimatePresence mode="wait"` with:
- Grid exit: `opacity: 0, scale: 0.97`
- List enter: `opacity: 0, x: -10` → `opacity: 1, x: 0`

---

## 10. SongList.jsx — Premium List View

Use the existing `AnimatedList` component (from Families revamp) with a custom `renderItem` for each song row.

**Each row:**
```
[Cover 40px] [Title / Artist]  [G]  [♪ ♫]  [Last used]  [⋯]
```

```jsx
<AnimatedList
  items={songs}
  onItemSelect={(song) => openSongDetail(song)}
  showGradients={false}
  renderItem={(song, index, isSelected) => (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer
      ${isSelected
        ? 'bg-[#7F77DD]/10 border-[#7F77DD]/30 dark:bg-[#7F77DD]/20'
        : 'bg-white dark:bg-[#111] border-slate-100 dark:border-white/8 hover:border-slate-200 dark:hover:border-white/15'
      }`}
    >
      <SongCoverArt song={song} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate dark:text-white">{song.title}</p>
        <p className="text-xs text-slate-400 truncate">{song.artist}</p>
      </div>
      <ShinyText text={song.key || '—'} className="text-xs font-mono w-8 text-center" />
      <div className="flex gap-1">
        {song.lyrics && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300">Lyrics</span>}
        {song.chordSheet && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">Chords</span>}
      </div>
      <span className="text-xs text-slate-400 whitespace-nowrap hidden md:block">
        {song.lastUsed ? `${getRelativeTime(song.lastUsed)}` : 'Never used'}
      </span>
      <SongContextMenu song={song} />
    </div>
  )}
/>
```

---

## 11. AddSongDrawer.jsx — Revamped Add Song (Sheet Drawer)

Replace the current modal with a shadcn `Sheet` (slide-in from right).

```jsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';

// Sheet width: 560px (sm:max-w-[560px])
// Dark mode: bg-[#0a0a0a] with white/10 borders

// FIELDS (keep all existing fields, redesigned):
// - Title* (full width)
// - Artist / Author + Key (side by side)
// - Tags: multi-select chips (Worship, Hymn, Offering, Communion, Opener, Closer)
// - BPM (number input) + Time Signature (select: 4/4, 3/4, 6/8, 2/4)
// - Lyrics (textarea, auto-resize, monospace font for readability)
// - Chord Sheet: toggle Plain Text / Upload PDF (existing behavior preserved)
// - Music Video URL (existing field, kept)
// - Cover Art: new file upload with drag-and-drop zone
//   → shows preview of uploaded image
//   → triggers ambient color extraction in SongCoverArt

// Cover art upload field:
<div
  className="border-2 border-dashed border-slate-200 dark:border-white/15 rounded-xl p-6 text-center cursor-pointer
    hover:border-[#7F77DD]/50 transition-colors"
  onDrop={handleDrop}
  onClick={() => fileInputRef.current?.click()}
>
  {previewUrl ? (
    <div className="relative">
      <img src={previewUrl} className="w-24 h-24 rounded-lg object-cover mx-auto" />
      <div className="absolute inset-0 rounded-lg" style={{ boxShadow: `0 8px 32px ${ambientColor}60` }} />
    </div>
  ) : (
    <div>
      <p className="text-sm text-slate-400">Drop cover art here or click to upload</p>
      <p className="text-xs text-slate-300 mt-1">PNG, JPG up to 5MB</p>
    </div>
  )}
</div>

// Footer:
<div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
  <Magnet strength={0.2} range={60}>
    <button type="submit" className="flex-1 bg-[#7F77DD] hover:bg-[#6b63c9] text-white py-2.5 rounded-lg font-medium transition-colors">
      Save Song
    </button>
  </Magnet>
  <button onClick={onClose} className="px-4 py-2.5 rounded-lg border ...">Cancel</button>
</div>
```

**New fields to add to the song data model:**
- `tags: string[]` (Worship, Hymn, Offering, Communion, Opener, Closer)
- `bpm: number | null`
- `timeSignature: string` (e.g. "4/4")
- `coverArtUrl: string | null`
- `lastUsed: Date | null`
- `usageCount: number` (default 0, increment when added to a service)

---

## 12. ChordTransposer.jsx — Transposition Tool

Shown on the Song Detail Drawer / page when a chord sheet exists.

### Behavior:
- A slider from -6 to +6 semitones
- Label shows current transposed key (e.g. "Original: G → Transposed: Bb")
- The chord sheet text re-renders live with all chords shifted by the selected semitones
- Reset button snaps back to 0

### Chord transposition engine:

```jsx
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function transposeChord(chord, semitones) {
  // Match the root note and optional modifier (m, maj7, sus4, etc.)
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;
  const [, root, modifier] = match;

  const noteIndex = NOTES.indexOf(root) !== -1
    ? NOTES.indexOf(root)
    : FLAT_NOTES.indexOf(root);

  if (noteIndex === -1) return chord;

  const newIndex = ((noteIndex + semitones) % 12 + 12) % 12;
  const newRoot = semitones > 0 ? FLAT_NOTES[newIndex] : NOTES[newIndex];
  return newRoot + modifier;
}

function transposeChordSheet(text, semitones) {
  if (semitones === 0) return text;
  // Replace all chord-like tokens in the text
  return text.replace(/\b([A-G][#b]?(?:m|maj|min|sus|aug|dim|add|6|7|9|11|13|\/[A-G][#b]?)*)\b/g,
    (match) => transposeChord(match, semitones)
  );
}
```

### UI:
```jsx
import { Slider } from '@/components/ui/slider';
import { motion, useSpring, useTransform } from 'framer-motion';

const [semitones, setSemitones] = useState(0);
const springSemitones = useSpring(semitones, { stiffness: 300, damping: 30 });

<div className="space-y-3">
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium">Transpose</span>
    <motion.span
      key={semitones}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-sm font-mono text-[#7F77DD]"
    >
      {semitones === 0 ? 'Original key' : `${semitones > 0 ? '+' : ''}${semitones} semitones → ${transposedKey}`}
    </motion.span>
  </div>

  <Slider
    min={-6} max={6} step={1}
    value={[semitones]}
    onValueChange={([val]) => setSemitones(val)}
    className="accent-[#7F77DD]"
  />

  <div className="flex justify-between text-xs text-slate-400 px-1">
    <span>-6</span>
    <span>0</span>
    <span>+6</span>
  </div>

  {semitones !== 0 && (
    <button onClick={() => setSemitones(0)} className="text-xs text-[#7F77DD] hover:underline">
      Reset to original
    </button>
  )}
</div>

{/* Rendered chord sheet with transposition applied */}
<pre className="mt-4 text-sm font-mono leading-relaxed whitespace-pre-wrap
  bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/10">
  {transposeChordSheet(song.chordSheet, semitones)}
</pre>
```

---

## 13. SetlistBuilder.jsx — Drag-and-Drop Setlist (Service Planning)

Uses `@dnd-kit` for the drag-and-drop engine + Framer Motion for the animation layer.

### Layout: Two-panel split
```
┌──────────────────────────┬─────────────────────────────┐
│  Song Library            │  Service: Sunday 20 April   │
│  (searchable list)       │  (setlist order)            │
│                          │                             │
│  [♪] Amazing Grace  G   │  1. ≡ Amazing Grace    G   │
│  [♪] How Great Thou A   │  2. ≡ Blessed Assurance D  │
│  [♪] Blessed Assurance  │  3. ≡ [Sermon] (non-song) │
│  [♪] Great Is Thy...    │  4. ≡ How Great Thou...    │
│                          │                             │
│  [+ Add Song]           │  [+ Add Item] [Export PDF] │
└──────────────────────────┴─────────────────────────────┘
```

### DnD implementation:

```jsx
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  arrayMove, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';

// Setlist state: array of items (songs + non-song items like Sermon, Prayer, Offering)
const [setlistItems, setSetlistItems] = useState([]);
const [activeItem, setActiveItem] = useState(null);

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor)
);

function handleDragEnd(event) {
  const { active, over } = event;
  setActiveItem(null);
  if (active.id !== over?.id) {
    setSetlistItems(items => {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }
}

// Wrap in DndContext + SortableContext
// Each setlist item uses useSortable hook
```

### SetlistItem.jsx:

```jsx
function SetlistItem({ item, index }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      animate={{ opacity: isDragging ? 0.4 : 1 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border
        bg-white dark:bg-[#111] border-slate-100 dark:border-white/8
        ${isDragging ? 'shadow-2xl scale-[1.02]' : ''}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-white/20
          hover:text-slate-500 dark:hover:text-white/50 transition-colors"
      >
        ⠿
      </div>

      {/* Position number */}
      <span className="text-xs font-mono text-slate-400 w-4">{index + 1}</span>

      {/* Song info */}
      {item.type === 'song' ? (
        <>
          <SongCoverArt song={item.song} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate dark:text-white">{item.song.title}</p>
            <p className="text-xs text-slate-400">{item.song.artist}</p>
          </div>
          <ShinyText text={item.song.key} className="text-xs font-mono" />
        </>
      ) : (
        <>
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-400 text-xs">
            {item.icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium dark:text-white">{item.label}</p>
            <p className="text-xs text-slate-400">{item.notes}</p>
          </div>
        </>
      )}

      {/* Remove button */}
      <button
        onClick={() => removeFromSetlist(item.id)}
        className="text-slate-300 hover:text-red-400 transition-colors text-sm"
      >
        ×
      </button>
    </motion.div>
  );
}
```

### Non-song items:
The "+ Add Item" button opens a small popover with options:
- Prayer
- Sermon
- Offering
- Announcements
- Communion
- Custom (text input)

Each renders differently in the setlist with a distinct icon.

### "Add to Service" from song card:
When a user clicks "Add to Service" on a song card or list item, show a `DropdownMenu` listing existing services. Selecting one appends the song to that service's setlist.

---

## 14. AddServiceDrawer.jsx — Revamped New Service (Sheet Drawer)

Replace the current modal with a shadcn `Sheet`.

**Fields (all existing fields kept, redesigned):**
- Service Name* (e.g. "Sunday Morning 20 April")
- Date picker (keep existing date input, styled)
- Notes textarea
- NEW: Service Theme (optional text — e.g. "The Grace of God")
- NEW: Worship Leader (select from members list or type a name)

**Design:** Same Sheet style as AddSongDrawer — consistent experience.

---

## 15. ServiceCard.jsx — Service Cards Grid

Each service renders as a card in the Service Planning view:

```
┌──────────────────────────┐
│  Sunday Morning          │  ← service name, font-semibold
│  April 20, 2025          │  ← date, muted
│                          │
│  [♪ 5 songs]            │  ← setlist count badge
│  Worship: Kayden N.      │  ← worship leader if set
│                          │
│  [Open Setlist]   [⋯]  │
└──────────────────────────┘
```

Cards animate in with stagger. Opening a service navigates to the `SetlistBuilder` for that service.

---

## 16. Dark Mode Implementation

All components must support dark mode via Tailwind's `dark:` prefix. The app already has a dark mode toggle.

**Key dark mode color values:**
```
Page background:   #0a0a0a
Card surfaces:     #111111
Elevated surfaces: #1a1a1a
Borders:           rgba(255,255,255,0.08) → rgba(255,255,255,0.15) on hover
Primary text:      #ffffff
Secondary text:    rgba(255,255,255,0.5)
Accent:            #7F77DD
Accent hover:      #9189e8
Accent glow:       rgba(127, 119, 221, 0.15)
```

**Spotify-style ambient in dark mode:**
In dark mode, the gradient cover art on song cards casts a faint glow upward behind the card — implemented via a blurred pseudo-element or a `box-shadow` using the extracted ambient color.

---

## 17. EmptySongState.jsx — Animated Empty States

### Songs tab empty:
```jsx
<motion.div
  initial={{ opacity: 0, scale: 0.96 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.4 }}
  className="flex flex-col items-center justify-center py-24 text-center"
>
  {/* Large musical note SVG illustration */}
  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7F77DD] to-[#a18cd1]
    flex items-center justify-center text-white text-4xl mb-6 shadow-lg">
    ♪
  </div>
  <BlurText text="No songs yet" animateBy="words" delay={100}
    className="text-xl font-semibold dark:text-white mb-2" />
  <p className="text-sm text-slate-400 mb-6">Add your first song to start building your library</p>
  <Magnet strength={0.2}>
    <button onClick={onAddSong} className="px-5 py-2.5 bg-[#7F77DD] text-white rounded-lg font-medium">
      + Add Song
    </button>
  </Magnet>
</motion.div>
```

### Service Planning empty: Same pattern with a calendar icon and "Create a service to start building setlists".

---

## 18. SongLibraryPage.jsx — Wiring It All Together

```jsx
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BlurText from '@/components/ui/BlurText';
import Magnet from '@/components/ui/Magnet';
import FadeContent from '@/components/ui/FadeContent';

export default function SongLibraryPage() {
  const [activeTab, setActiveTab] = useState('songs');
  const [view, setView] = useState(() => localStorage.getItem('song-library-view') || 'grid');
  const [addSongOpen, setAddSongOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);

  // ... fetch songs and services from existing data hooks

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <BlurText text="Song Library" animateBy="words" delay={80}
            className="text-2xl font-semibold tracking-tight dark:text-white" />
          <p className="text-sm text-slate-400 mt-0.5">Manage songs, chord sheets, and service setlists</p>
        </div>
        <Magnet strength={0.25}>
          <button onClick={() => activeTab === 'songs' ? setAddSongOpen(true) : setAddServiceOpen(true)}
            className="px-4 py-2 bg-[#7F77DD] hover:bg-[#6b63c9] text-white rounded-lg text-sm font-medium transition-colors">
            {activeTab === 'songs' ? '+ Add Song' : '+ New Service'}
          </button>
        </Magnet>
      </div>

      {/* Stat bar */}
      <div className="px-6">
        <SongStatBar songs={songs} services={services} />
      </div>

      {/* Tabs + view controls */}
      <div className="px-6 mt-4 flex items-center justify-between">
        <SongTabs activeTab={activeTab} onChange={setActiveTab} />
        {activeTab === 'songs' && (
          <div className="flex items-center gap-3">
            <SongSearchBar songs={songs} open={searchOpen} onOpenChange={setSearchOpen} />
            <SongViewToggle view={view} onChange={(v) => { setView(v); localStorage.setItem('song-library-view', v); }} />
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="px-6 mt-6">
        <FadeContent blur duration={350}>
          <AnimatePresence mode="wait">
            {activeTab === 'songs' ? (
              <motion.div key="songs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {songs.length === 0
                  ? <EmptySongState onAddSong={() => setAddSongOpen(true)} />
                  : view === 'grid'
                    ? <SongGrid songs={songs} onSongClick={setSelectedSong} />
                    : <SongList songs={songs} onSongClick={setSelectedSong} />
                }
              </motion.div>
            ) : (
              <motion.div key="services" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ServicePlanningView services={services} songs={songs} />
              </motion.div>
            )}
          </AnimatePresence>
        </FadeContent>
      </div>

      {/* Drawers */}
      <AnimatePresence>
        {addSongOpen && <AddSongDrawer open={addSongOpen} onClose={() => setAddSongOpen(false)} />}
        {addServiceOpen && <AddServiceDrawer open={addServiceOpen} onClose={() => setAddServiceOpen(false)} />}
        {selectedSong && <SongDetailDrawer song={selectedSong} onClose={() => setSelectedSong(null)} />}
      </AnimatePresence>
    </div>
  );
}
```

---

## 19. Behavior & Polish Checklist

| Feature | Expected behavior |
|---|---|
| Page heading | BlurText word-by-word animation on mount |
| Stat numbers | CountUp from 0 on mount, stagger between cards |
| Song cards (grid) | SpotlightCard glow follows cursor, stagger entrance |
| Recently added | TiltedCard 3D parallax on hover |
| Key badges | ShinyText shimmer effect |
| Primary buttons | Magnet attraction on hover |
| Tab switch | layoutId sliding underline + FadeContent blur transition |
| Grid ↔ List | AnimatePresence exit/enter, preference persisted |
| ⌘K search | Opens Command palette, filters live, keyboard navigable |
| Add Song | Sheet drawer slides in from right (not modal) |
| Cover art upload | Drag-and-drop zone, preview, ambient color extracted |
| No cover art | Auto-gradient generated from title + key hash |
| Chord transposition | Slider -6 to +6, live chord sheet re-render |
| Setlist builder | DnD drag-to-reorder with spring snap + DragOverlay ghost |
| Add to service | Dropdown from song card selects target service |
| Dark mode | Full dark theme — Spotify aesthetic on all components |
| Ambient shadow | Cards with real cover art cast extracted color glow |
| Empty states | Scale + BlurText animation, Magnet CTA button |
| Toasts | Sonner for all save/success/error feedback |

---

## 20. Do Not Change

- All existing API calls and data persistence logic
- Sidebar navigation and layout
- Auth/session handling
- The key filter dropdown (keep it, just restyle to match)
- Pagination if present
- Existing data models (only ADD new optional fields, never break existing ones)

---

## 21. Summary — New Dependencies

| Package | Purpose |
|---|---|
| `framer-motion` | All motion: stagger, presence, reorder, spring |
| `motion` | CountUp + AnimatedList (React Bits peer dep) |
| `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` | Setlist drag-and-drop |
| `cmdk` | Command palette (via shadcn Command) |
| `sonner` | Toast notifications |
| shadcn: `sheet`, `tabs`, `badge`, `slider`, `dropdown-menu`, `toggle`, `command`, `sonner` | UI primitives |
| React Bits: `BlurText`, `SpotlightCard`, `TiltedCard`, `ShinyText`, `Magnet`, `FadeContent` | Premium animations |