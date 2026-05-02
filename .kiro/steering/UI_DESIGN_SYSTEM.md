# Vestry Hub — UI Design System

> **Single source of truth** for all UI decisions. Every new component, page, and feature must follow these specifications. When in doubt, check here first.

---

## Table of Contents

1. [Typography](#typography)
2. [Color System](#color-system)
3. [Spacing](#spacing)
4. [Border Radius](#border-radius)
5. [Shadows](#shadows)
6. [Components](#components)
7. [Animation (Framer Motion)](#animation)
8. [Icons](#icons)
9. [Shared Components](#shared-components)
10. [Global Rules](#global-rules)

---

## Typography

**Primary Font:** Plus Jakarta Sans  
**Fallback:** Inter, system-ui, sans-serif  
**Already imported** via Google Fonts in `src/index.css`. Use `font-jakarta` Tailwind class.

### Font Scale

| Token     | Size  | Weight | Tracking   | Line Height | Usage                        |
|-----------|-------|--------|------------|-------------|------------------------------|
| Display   | 36px  | 700    | -0.02em    | —           | Hero headings                |
| H1        | 30px  | 700    | -0.01em    | —           | Page titles                  |
| H2        | 24px  | 600    | -0.01em    | —           | Section headings             |
| H3        | 20px  | 600    | 0          | —           | Card headings                |
| H4        | 16px  | 600    | 0          | —           | Sub-headings                 |
| Body LG   | 16px  | 400    | 0          | 1.6         | Lead paragraphs              |
| Body      | 14px  | 400    | 0          | 1.5         | Default body text            |
| Body SM   | 13px  | 400    | 0          | 1.5         | Secondary text               |
| Caption   | 12px  | 400    | 0          | 1.4         | Timestamps, metadata         |
| Label     | 12px  | 500    | 0.05em     | —           | Form labels, section headers |

### Tailwind Usage

```tsx
// Page title
<h1 className="text-3xl font-bold tracking-tight font-jakarta">

// Section heading
<h2 className="text-2xl font-semibold tracking-tight font-jakarta">

// Body
<p className="text-sm text-slate-600 font-jakarta">

// Label / section header
<p className="text-xs font-semibold uppercase tracking-widest text-slate-500 font-jakarta">
```

---

## Color System

### CSS Variables

Add to `src/index.css` inside `:root {}`:

```css
/* Primary — Orange */
--color-primary-50:  #fff7ed;
--color-primary-100: #ffedd5;
--color-primary-200: #fed7aa;
--color-primary-300: #fdba74;
--color-primary-400: #fb923c;
--color-primary-500: #f97316;   /* Main primary */
--color-primary-600: #ea6c0a;   /* Hover state */
--color-primary-700: #c2570a;
--color-primary-800: #9a3f0b;
--color-primary-900: #7c330c;

/* Neutral — Cool Grays */
--color-neutral-0:   #ffffff;
--color-neutral-50:  #f8fafc;
--color-neutral-100: #f1f5f9;
--color-neutral-200: #e2e8f0;
--color-neutral-300: #cbd5e1;
--color-neutral-400: #94a3b8;
--color-neutral-500: #64748b;
--color-neutral-600: #475569;
--color-neutral-700: #334155;
--color-neutral-800: #1e293b;
--color-neutral-900: #0f172a;

/* Semantic */
--color-success-light: #f0fdf4;
--color-success:       #22c55e;
--color-success-dark:  #16a34a;
--color-warning-light: #fffbeb;
--color-warning:       #f59e0b;
--color-warning-dark:  #d97706;
--color-error-light:   #fef2f2;
--color-error:         #ef4444;
--color-error-dark:    #dc2626;
--color-info-light:    #eff6ff;
--color-info:          #3b82f6;
--color-info-dark:     #2563eb;

/* Background Hierarchy */
--bg-app:     #f8fafc;   /* Main app background */
--bg-surface: #ffffff;   /* Cards, panels */
--bg-subtle:  #f1f5f9;   /* Subtle sections */
--bg-muted:   #e2e8f0;   /* Disabled, placeholder */

/* Borders */
--border-default: #e2e8f0;
--border-muted:   #f1f5f9;
--border-strong:  #cbd5e1;

/* Text */
--text-primary:   #0f172a;
--text-secondary: #475569;
--text-muted:     #94a3b8;
--text-disabled:  #cbd5e1;
--text-inverse:   #ffffff;
--text-brand:     #f97316;
```

### Quick Reference (Tailwind)

| Intent          | Class                                    |
|-----------------|------------------------------------------|
| Primary action  | `bg-orange-500 hover:bg-orange-600`      |
| Success         | `bg-emerald-100 text-emerald-700`        |
| Warning         | `bg-amber-100 text-amber-700`            |
| Error           | `bg-red-100 text-red-600`                |
| Info            | `bg-blue-100 text-blue-700`              |
| Page background | `bg-[#F8FAFC]` or `bg-slate-50`          |
| Card background | `bg-white`                               |
| Border          | `border-slate-200`                       |
| Text primary    | `text-slate-900`                         |
| Text secondary  | `text-slate-500`                         |
| Text muted      | `text-slate-400`                         |

---

## Spacing

Base unit: **4px**

| Token       | Value | Tailwind  |
|-------------|-------|-----------|
| spacing-1   | 4px   | `p-1`     |
| spacing-2   | 8px   | `p-2`     |
| spacing-3   | 12px  | `p-3`     |
| spacing-4   | 16px  | `p-4`     |
| spacing-5   | 20px  | `p-5`     |
| spacing-6   | 24px  | `p-6`     |
| spacing-8   | 32px  | `p-8`     |
| spacing-10  | 40px  | `p-10`    |
| spacing-12  | 48px  | `p-12`    |
| spacing-16  | 64px  | `p-16`    |

**Page padding:** `px-6 py-6` (desktop), `px-4 py-4` (mobile)  
**Card padding:** `p-6` (default), `p-5` (compact)  
**Section gap:** `gap-6` between cards  
**Item gap:** `gap-3` between list items  

---

## Border Radius

| Token       | Value  | Usage                    |
|-------------|--------|--------------------------|
| radius-sm   | 6px    | Badges, tags             |
| radius-md   | 8px    | Buttons, inputs          |
| radius-lg   | 12px   | Cards (default)          |
| radius-xl   | 16px   | Large cards              |
| radius-2xl  | 20px   | Hero cards               |
| radius-full | 9999px | Pills, avatars           |

Tailwind: `rounded-md` (8px), `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-full`

---

## Shadows

```css
--shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
--shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
--shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.05);
--shadow-xl: 0 20px 25px rgba(0,0,0,0.08), 0 8px 10px rgba(0,0,0,0.04);
```

| Context              | Shadow         |
|----------------------|----------------|
| Card (default)       | `shadow-sm`    |
| Card (hover)         | `shadow-md`    |
| Modal / Dropdown     | `shadow-xl`    |
| Floating button      | `shadow-lg`    |

---

## Components

### Cards

```tsx
// Base card
<div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 transition-shadow duration-200">

// Interactive card (hover effect)
<motion.div
  whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.1)" }}
  transition={{ duration: 0.2 }}
  className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 cursor-pointer"
>

// Stat card
<div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
  {/* icon + metric + label */}
</div>
```

### Buttons

```tsx
// Primary
<Button className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta font-semibold">

// Secondary / Outlined
<Button variant="outline" className="border-slate-300 hover:border-orange-500 hover:text-orange-500 font-jakarta">

// Ghost
<Button variant="ghost" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 font-jakarta">

// Destructive
<Button variant="destructive" className="font-jakarta">

// Sizes
<Button size="sm">   {/* 13px, px-3 py-1.5 */}
<Button>             {/* 14px, px-5 py-2.5 — default */}
<Button size="lg">   {/* 15px, px-6 py-3 */}
```

### Inputs

```tsx
<Input
  className="h-10 border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 font-jakarta text-sm"
  placeholder="..."
/>

// Label
<label className="text-xs font-medium text-slate-600 mb-1.5 block font-jakarta">
  Field Name
</label>
```

### Badges / Pills

```tsx
// Success
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">

// Warning
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">

// Error
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-600">

// Info
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">

// Primary (orange)
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">

// Neutral
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
```

### Avatars

Sizes: XS=24px, SM=32px, MD=40px, LG=48px, XL=64px

Gradient assignment by first letter of name:
- A–D: `from-orange-400 to-orange-500`
- E–H: `from-violet-500 to-purple-600`
- I–L: `from-blue-400 to-blue-600`
- M–P: `from-emerald-400 to-green-500`
- Q–T: `from-pink-400 to-rose-500`
- U–Z: `from-amber-400 to-yellow-500`

```tsx
// Gradient initials avatar
<div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
  JD
</div>
```

### Tables

```tsx
<table className="w-full text-sm font-jakarta">
  <thead>
    <tr className="bg-slate-50 border-b border-slate-200">
      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Column
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
      <td className="px-4 py-3.5 text-sm text-slate-700">Value</td>
    </tr>
  </tbody>
</table>
```

### Modals

```tsx
<Dialog>
  <DialogContent className="max-w-[560px] rounded-2xl p-0 font-jakarta">
    {/* Header */}
    <div className="px-6 pt-6 pb-5 border-b border-slate-100">
      <DialogTitle className="text-lg font-semibold text-slate-900">Title</DialogTitle>
    </div>
    {/* Body */}
    <div className="px-6 py-5">
      {/* content */}
    </div>
    {/* Footer */}
    <div className="px-6 pb-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
      <Button variant="outline">Cancel</Button>
      <Button className="bg-orange-500 hover:bg-orange-600 text-white">Confirm</Button>
    </div>
  </DialogContent>
</Dialog>
```

### Page Headers

```tsx
<div className="flex items-start justify-between gap-4 mb-6">
  <div>
    <h1 className="text-2xl font-bold text-slate-900 font-jakarta">Page Title</h1>
    <p className="text-sm text-slate-500 mt-0.5 font-jakarta">Subtitle or description</p>
  </div>
  <div className="flex items-center gap-2 shrink-0">
    {/* Action buttons */}
  </div>
</div>
```

### Empty States

```tsx
<div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
  <Icon className="h-12 w-12 text-slate-300" />
  <p className="text-base font-semibold text-slate-600 font-jakarta">Nothing here yet</p>
  <p className="text-sm text-slate-400 max-w-sm font-jakarta">Helpful description of what to do next.</p>
  <Button size="sm" className="mt-2 bg-orange-500 hover:bg-orange-600 text-white">
    <Plus className="h-4 w-4 mr-1.5" />Add First Item
  </Button>
</div>
```

### Loading Skeletons

Always use `<Skeleton>` from shadcn — never blank white space.

```tsx
// Card skeleton
<div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
  <Skeleton className="h-4 w-1/3" />
  <Skeleton className="h-8 w-1/2" />
  <Skeleton className="h-3 w-2/3" />
</div>

// Table row skeleton
{Array.from({ length: 5 }).map((_, i) => (
  <tr key={i}>
    <td className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
  </tr>
))}
```

---

## Animation

### Page Transition

Wrap every page's root element:

```tsx
import { motion } from "framer-motion";

// Or use the PageTransition shared component:
import { PageTransition } from "@/components/ui/PageTransition";

<PageTransition>
  {/* page content */}
</PageTransition>
```

### Card Hover

```tsx
<motion.div
  whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.1)" }}
  transition={{ duration: 0.2 }}
>
```

### List Stagger

```tsx
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(i => (
    <motion.li key={i.id} variants={item}>{/* ... */}</motion.li>
  ))}
</motion.ul>
```

### Modal

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.15, ease: "easeOut" }}
>
```

### Sliding Tab Indicator

```tsx
// Active tab underline that slides between tabs
<motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
```

### Button Press

```tsx
<motion.button whileTap={{ scale: 0.97 }}>
```

### Number Counter (Stats)

Use `useMotionValue` + `useTransform` + `useEffect` to animate numbers counting up on mount. See `StatCard` component.

---

## Icons

**Library:** Lucide React (already installed — do not use any other icon library)

| Context              | Size  | Class        |
|----------------------|-------|--------------|
| Inline text          | 14px  | `h-3.5 w-3.5`|
| Badge / small button | 16px  | `h-4 w-4`    |
| Nav items (default)  | 20px  | `h-5 w-5`    |
| Page headers         | 24px  | `h-6 w-6`    |
| Empty states         | 48px  | `h-12 w-12`  |
| Feature icons        | 32px  | `h-8 w-8`    |

Icon color inherits from parent text color. Use `text-orange-500` for brand-colored icons.

---

## Shared Components

All located in `src/components/ui/` (design system primitives) or `src/components/shared/` (app-specific).

### `PageTransition`
`src/components/ui/PageTransition.tsx`  
Wraps page content with fade + slide-up animation.

### `PageHeader`  
`src/components/layout/PageHeader.tsx`  
Props: `title`, `subtitle`, `action`

### `StatCard`
`src/components/ui/StatCard.tsx`  
Props: `icon`, `label`, `value`, `trend`, `trendValue`, `color`  
Animated number counter on mount.

### `EmptyState`
`src/components/ui/EmptyState.tsx`  
Props: `icon`, `title`, `description`, `action`

### `DataTable`
`src/components/shared/DataTable.tsx`  
Props: `columns`, `data`, `loading`, `searchable`, `filterable`, `pagination`  
Built on shadcn Table.

### `StatusBadge`
`src/components/shared/StatusBadge.tsx`  
Props: `status`, `variant`  
Maps status strings to badge colors.

### `MemberAvatar` / `Avatar`
`src/components/shared/MemberAvatar.tsx`  
Props: `name`, `src`, `size`  
Gradient initials fallback.

### `ConfirmDialog`
`src/components/ui/ConfirmDialog.tsx`  
Props: `title`, `description`, `onConfirm`, `onCancel`, `destructive`

### `LoadingSkeleton`
`src/components/ui/LoadingSkeleton.tsx`  
Props: `variant` — `card | table | list | stat`

---

## Global Rules

### Every new page MUST:
1. Use `font-jakarta` class on the root element
2. Wrap content in `<PageTransition>`
3. Have a `<PageHeader>` or equivalent header structure
4. Use the card/shadow/spacing specs above
5. Import icons from `lucide-react` only

### Every new component MUST:
1. Use CSS variables or Tailwind classes for colors — no hardcoded hex
2. Have hover and focus states
3. Be mobile responsive
4. Use Framer Motion for meaningful animations (not gratuitous)
5. Have a loading skeleton state
6. Have an empty state with icon + message + CTA

### NEVER:
- Use hardcoded hex colors in component JSX (use Tailwind classes or CSS vars)
- Use arbitrary Tailwind values like `w-[347px]` — use the spacing scale
- Create new shadow values outside the spec
- Use a different font
- Use `useEffect + useState` for data fetching — always TanStack Query

### ALWAYS:
- Check if a shadcn component exists before building custom
- Add `staleTime: 300_000` to all `useQuery` hooks
- Add `toast.success()` / `toast.error()` on all mutations
- Filter every Supabase query by `tenant_id` from `useChurch()`
- Use `TABLES` and `COLS` constants from `src/lib/schema.ts` — never hardcode table/column names

# VestryHub Design System Rules

## Protected Files — NEVER MODIFY
- src/index.css
- tailwind.config.ts
- src/components/ui/button.tsx
- src/components/ui/card.tsx
- src/components/ui/input.tsx
- src/components/ui/textarea.tsx
- src/components/ui/select.tsx
- src/components/ui/tabs.tsx
- src/components/ui/dialog.tsx
- src/components/ui/dropdown-menu.tsx
- src/components/ui/checkbox.tsx
- src/components/ui/switch.tsx
- src/components/ui/slider.tsx
- src/components/ui/popover.tsx
- src/components/layout/AppLayout.tsx

These files define the global design system.
Modifying them breaks every page in the app.

## For New Features
- Create new components in src/components/shared/
- Create new pages in src/pages/
- Use existing Tailwind classes only
- Use existing shadcn components as-is
- Reuse BlurFadeIn and GradientText from
  their existing locations in the project

## Package Rules
- Do NOT upgrade lucide-react (locked at 0.383.0)
- Do NOT install new UI component libraries
- Do NOT install new CSS frameworks
- Do NOT modify package.json for UI purposes

## Color System
- Primary color: violet (#7c3aed)
- Do NOT add orange as primary anywhere
- Category accent colors are per-feature only
- Always include dark: variant for every color

## Animation Rules
- Use motion/react for all animations
- Reuse BlurFadeIn for page entrances
- Reuse GradientText for gradient headings
- Spring transitions: stiffness 400, damping 25