

# Prompt 1: Vestry Landing Page

## Overview
Build the full landing page at `/` with Vestry brand colors, Inter font, navbar, hero (with placeholders for BlurText/SplitText), features grid, pricing table, footer. Apply brand theme globally by replacing all default shadcn colors.

## What will be built

### 1. Global Theme Setup
- **`index.css`** — Replace all CSS variables with Vestry HSL equivalents:
  - `--primary`: Vestry Purple `#3D1C8E` → `261 66% 33%`
  - `--accent`/`--destructive` area: Terracotta `#E8734A` → `16 78% 60%`
  - `--background`: `#F7F7F7` → `0 0% 97%`
  - `--foreground`/dark: `#1A1A2E` → `240 28% 14%`
  - Sidebar vars: dark bg `#1A1A2E`
- Add `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');` and set `font-family: 'Inter'` on body
- Add Vestry custom color tokens in Tailwind config: `vestry-purple`, `vestry-terracotta`, `vestry-bg`, `vestry-dark`

### 2. Landing Page Components (all in `src/components/landing/`)
- **Navbar** — Logo text "Vestry", nav links (Features, Pricing, About), "Sign In" + "Get Started Free" CTA button (purple bg, terracotta hover)
- **Hero** — Placeholder comments where BlurText H1 and SplitText tagline will go, with temporary static text so the page renders. CTA buttons: "Get Started Free" (purple) + "Watch Demo" (outline). No GSAP yet — just the layout and placeholders.
- **Features** — 6-card grid: Member Management, Giving & Finance, Service Planning, Attendance Tracking, Communications, Groups & Ministries. Icons from lucide-react. Cards with subtle shadow on `#FFFFFF` bg.
- **Pricing** — Monthly/Annual toggle. 4 tiers (Free, Foundation, Growth with "Most Popular" badge, Enterprise). Vestry purple for popular tier highlight.
- **Footer** — Logo, nav columns (Product, Company, Support), copyright.

### 3. Files created/modified
| File | Action |
|------|--------|
| `src/index.css` | Modify — Vestry colors, Inter font |
| `tailwind.config.ts` | Modify — add vestry color tokens |
| `index.html` | Modify — add `{/* FAVICON_PLACEHOLDER */}` comment |
| `src/pages/Index.tsx` | Rewrite — compose landing sections |
| `src/components/landing/Navbar.tsx` | Create |
| `src/components/landing/Hero.tsx` | Create — with `{/* BLURTEXT_PLACEHOLDER */}` and `{/* SPLITTEXT_PLACEHOLDER */}` comments, static fallback text |
| `src/components/landing/Features.tsx` | Create |
| `src/components/landing/Pricing.tsx` | Create |
| `src/components/landing/Footer.tsx` | Create |

### 4. Hero placeholder approach
```tsx
{/* BLURTEXT_PLACEHOLDER: Replace this h1 with BlurText component from React Bits */}
<h1 className="text-5xl md:text-7xl font-bold text-vestry-dark">
  Church Management,<br />Simplified.
</h1>

{/* SPLITTEXT_PLACEHOLDER: Replace this p with SplitText component from React Bits */}
<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
  The all-in-one platform to manage your congregation, finances, and communications.
</p>
```

No GSAP ScrollTrigger in this prompt either — that will be added after you paste the React Bits components.

### 5. No new dependencies needed
Inter loaded via Google Fonts CDN. All UI built with existing shadcn components + Tailwind. GSAP deferred.

