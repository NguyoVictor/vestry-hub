/**
 * Vestry Hub — Design System Tokens
 *
 * Single source of truth for all design decisions.
 * Import these constants instead of hardcoding values in components.
 *
 * See docs/UI_DESIGN_SYSTEM.md for full documentation.
 */

// ─── Typography ───────────────────────────────────────────────────────────────

export const FONT = {
  primary: "'Plus Jakarta Sans', Inter, system-ui, sans-serif",
  mono: "ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace",
} as const;

export const FONT_SIZE = {
  display: "text-4xl",   // 36px
  h1:      "text-3xl",   // 30px
  h2:      "text-2xl",   // 24px
  h3:      "text-xl",    // 20px
  h4:      "text-base",  // 16px
  bodyLg:  "text-base",  // 16px
  body:    "text-sm",    // 14px
  bodySm:  "text-[13px]",// 13px
  caption: "text-xs",    // 12px
  label:   "text-xs",    // 12px
} as const;

export const FONT_WEIGHT = {
  regular:   "font-normal",   // 400
  medium:    "font-medium",   // 500
  semibold:  "font-semibold", // 600
  bold:      "font-bold",     // 700
} as const;

// ─── Colors ───────────────────────────────────────────────────────────────────

/** Primary orange palette */
export const COLOR_PRIMARY = {
  50:  "#fff7ed",
  100: "#ffedd5",
  200: "#fed7aa",
  300: "#fdba74",
  400: "#fb923c",
  500: "#f97316",  // Main primary
  600: "#ea6c0a",  // Hover
  700: "#c2570a",
  800: "#9a3f0b",
  900: "#7c330c",
} as const;

/** Neutral cool-gray palette */
export const COLOR_NEUTRAL = {
  0:   "#ffffff",
  50:  "#f8fafc",
  100: "#f1f5f9",
  200: "#e2e8f0",
  300: "#cbd5e1",
  400: "#94a3b8",
  500: "#64748b",
  600: "#475569",
  700: "#334155",
  800: "#1e293b",
  900: "#0f172a",
} as const;

/** Semantic colors */
export const COLOR_SEMANTIC = {
  successLight: "#f0fdf4",
  success:      "#22c55e",
  successDark:  "#16a34a",
  warningLight: "#fffbeb",
  warning:      "#f59e0b",
  warningDark:  "#d97706",
  errorLight:   "#fef2f2",
  error:        "#ef4444",
  errorDark:    "#dc2626",
  infoLight:    "#eff6ff",
  info:         "#3b82f6",
  infoDark:     "#2563eb",
} as const;

/** Background hierarchy */
export const BG = {
  app:     "#f8fafc",  // Main app background
  surface: "#ffffff",  // Cards, panels
  subtle:  "#f1f5f9",  // Subtle sections
  muted:   "#e2e8f0",  // Disabled, placeholder
} as const;

/** Border colors */
export const BORDER = {
  default: "#e2e8f0",
  muted:   "#f1f5f9",
  strong:  "#cbd5e1",
} as const;

/** Text colors */
export const TEXT = {
  primary:   "#0f172a",
  secondary: "#475569",
  muted:     "#94a3b8",
  disabled:  "#cbd5e1",
  inverse:   "#ffffff",
  brand:     "#f97316",
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

/** Spacing scale in pixels (base unit: 4px) */
export const SPACING = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** Common layout spacing as Tailwind classes */
export const LAYOUT = {
  pagePadding:  "px-6 py-6",
  pagePaddingMobile: "px-4 py-4",
  cardPadding:  "p-6",
  cardPaddingCompact: "p-5",
  sectionGap:   "gap-6",
  itemGap:      "gap-3",
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const RADIUS = {
  sm:   "rounded-md",    // 6px — badges, tags
  md:   "rounded-lg",    // 8px — buttons, inputs
  lg:   "rounded-xl",    // 12px — cards (default)
  xl:   "rounded-2xl",   // 16px — large cards
  "2xl":"rounded-[20px]",// 20px — hero cards
  full: "rounded-full",  // pills, avatars
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const SHADOW = {
  xs: "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
  sm: "shadow-sm",   // card default
  md: "shadow-md",   // card hover
  lg: "shadow-lg",   // floating elements
  xl: "shadow-xl",   // modals
} as const;

// ─── Component Class Recipes ──────────────────────────────────────────────────

/**
 * Pre-composed Tailwind class strings for common component patterns.
 * Use these to keep components consistent without repeating long class strings.
 */
export const CLASSES = {
  // Cards
  card:         "bg-white rounded-xl border border-slate-200 shadow-sm p-6 font-jakarta",
  cardCompact:  "bg-white rounded-xl border border-slate-200 shadow-sm p-5 font-jakarta",
  cardHover:    "bg-white rounded-xl border border-slate-200 shadow-sm p-6 font-jakarta transition-shadow duration-200 hover:shadow-md cursor-pointer",

  // Buttons
  btnPrimary:   "bg-orange-500 hover:bg-orange-600 text-white font-semibold font-jakarta",
  btnOutline:   "border-slate-300 hover:border-orange-500 hover:text-orange-500 font-jakarta",
  btnGhost:     "text-slate-500 hover:text-slate-900 hover:bg-slate-100 font-jakarta",
  btnDestructive: "bg-red-500 hover:bg-red-600 text-white font-jakarta",

  // Inputs
  input:        "h-10 border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 font-jakarta text-sm",
  inputLabel:   "text-xs font-medium text-slate-600 mb-1.5 block font-jakarta",

  // Badges
  badgeSuccess: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700",
  badgeWarning: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700",
  badgeError:   "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-600",
  badgeInfo:    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700",
  badgePrimary: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700",
  badgeNeutral: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600",
  badgePurple:  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700",

  // Table
  tableHeader:  "bg-slate-50 border-b border-slate-200",
  tableHeaderCell: "px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide",
  tableRow:     "border-b border-slate-100 hover:bg-slate-50/60 transition-colors",
  tableCell:    "px-4 py-3.5 text-sm text-slate-700",

  // Page
  pageHeader:   "flex items-start justify-between gap-4 mb-6",
  pageTitle:    "text-2xl font-bold text-slate-900 font-jakarta",
  pageSubtitle: "text-sm text-slate-500 mt-0.5 font-jakarta",

  // Section label
  sectionLabel: "text-xs font-semibold uppercase tracking-widest text-slate-500 font-jakarta",
} as const;

// ─── Avatar Gradients ─────────────────────────────────────────────────────────

/**
 * Returns a Tailwind gradient class based on the first letter of a name.
 * Consistent assignment — same name always gets same gradient.
 */
export const AVATAR_GRADIENTS: Record<string, string> = {
  "A": "from-orange-400 to-orange-500",
  "B": "from-orange-400 to-orange-500",
  "C": "from-orange-400 to-orange-500",
  "D": "from-orange-400 to-orange-500",
  "E": "from-violet-500 to-purple-600",
  "F": "from-violet-500 to-purple-600",
  "G": "from-violet-500 to-purple-600",
  "H": "from-violet-500 to-purple-600",
  "I": "from-blue-400 to-blue-600",
  "J": "from-blue-400 to-blue-600",
  "K": "from-blue-400 to-blue-600",
  "L": "from-blue-400 to-blue-600",
  "M": "from-emerald-400 to-green-500",
  "N": "from-emerald-400 to-green-500",
  "O": "from-emerald-400 to-green-500",
  "P": "from-emerald-400 to-green-500",
  "Q": "from-pink-400 to-rose-500",
  "R": "from-pink-400 to-rose-500",
  "S": "from-pink-400 to-rose-500",
  "T": "from-pink-400 to-rose-500",
  "U": "from-amber-400 to-yellow-500",
  "V": "from-amber-400 to-yellow-500",
  "W": "from-amber-400 to-yellow-500",
  "X": "from-amber-400 to-yellow-500",
  "Y": "from-amber-400 to-yellow-500",
  "Z": "from-amber-400 to-yellow-500",
};

export function getAvatarGradient(name: string): string {
  const letter = (name?.[0] ?? "A").toUpperCase();
  return AVATAR_GRADIENTS[letter] ?? "from-slate-400 to-slate-500";
}

export function getInitials(firstName: string, lastName?: string): string {
  const f = (firstName?.[0] ?? "").toUpperCase();
  const l = (lastName?.[0] ?? "").toUpperCase();
  return l ? `${f}${l}` : f;
}

// ─── Framer Motion Variants ───────────────────────────────────────────────────

/** Reusable Framer Motion animation variants */
export const MOTION = {
  /** Fade + slide up — use for page transitions */
  pageTransition: {
    initial:   { opacity: 0, y: 8 },
    animate:   { opacity: 1, y: 0 },
    exit:      { opacity: 0, y: -8 },
    transition: { duration: 0.2, ease: "easeOut" },
  },

  /** Stagger container for lists */
  listContainer: {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
  },

  /** Stagger child item */
  listItem: {
    hidden: { opacity: 0, y: 10 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.2 } },
  },

  /** Modal scale-in */
  modal: {
    initial:    { opacity: 0, scale: 0.95 },
    animate:    { opacity: 1, scale: 1 },
    exit:       { opacity: 0, scale: 0.95 },
    transition: { duration: 0.15, ease: "easeOut" },
  },

  /** Card hover */
  cardHover: {
    whileHover: { y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.1)" },
    transition: { duration: 0.2 },
  },

  /** Button press */
  buttonTap: {
    whileTap: { scale: 0.97 },
  },

  /** Sidebar nav item hover */
  navItem: {
    whileHover: { x: 2 },
    transition: { duration: 0.1 },
  },
} as const;

// ─── Status Badge Mapping ─────────────────────────────────────────────────────

/** Maps status strings to badge class names */
export const STATUS_BADGE_CLASSES: Record<string, string> = {
  // Member statuses
  active:            "bg-emerald-100 text-emerald-700",
  member:            "bg-emerald-100 text-emerald-700",
  inactive:          "bg-slate-100 text-slate-500",
  "pending approval":"bg-amber-100 text-amber-700",
  pending:           "bg-amber-100 text-amber-700",
  visitor:           "bg-blue-100 text-blue-700",
  "new convert":     "bg-purple-100 text-purple-700",
  worker:            "bg-indigo-100 text-indigo-700",
  pastor:            "bg-orange-100 text-orange-700",
  "senior pastor":   "bg-orange-100 text-orange-700",

  // Task / event statuses
  completed:         "bg-emerald-100 text-emerald-700",
  in_progress:       "bg-blue-100 text-blue-700",
  todo:              "bg-slate-100 text-slate-500",
  overdue:           "bg-red-100 text-red-600",
  cancelled:         "bg-slate-100 text-slate-500",
  draft:             "bg-slate-100 text-slate-500",
  published:         "bg-emerald-100 text-emerald-700",
  scheduled:         "bg-amber-100 text-amber-700",

  // Finance
  paid:              "bg-emerald-100 text-emerald-700",
  unpaid:            "bg-red-100 text-red-600",
  partial:           "bg-amber-100 text-amber-700",
  refunded:          "bg-purple-100 text-purple-700",

  // Priority
  low:               "bg-slate-100 text-slate-500",
  medium:            "bg-amber-100 text-amber-700",
  high:              "bg-orange-100 text-orange-700",
  urgent:            "bg-red-100 text-red-600",
};

export function getStatusBadgeClass(status: string): string {
  const key = (status ?? "").toLowerCase();
  return STATUS_BADGE_CLASSES[key] ?? "bg-slate-100 text-slate-500";
}
