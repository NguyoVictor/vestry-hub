/**
 * Song Library Theme Utilities
 * 
 * Provides utility functions for the dual theme system (Vercel light + Spotify dark)
 * with ambient color bleeding effects and dynamic color management.
 */

export interface AmbientColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  tertiary: string;
  accent: string;
}

/**
 * Updates CSS custom properties for dynamic ambient colors
 * Used when cover art colors are extracted and need to influence the UI
 */
export function updateAmbientColors(colors: AmbientColors): void {
  const root = document.documentElement;
  
  // Convert hex colors to rgba for ambient effects
  const primaryRgba = hexToRgba(colors.primary, 0.15);
  const secondaryRgba = hexToRgba(colors.secondary, 0.08);
  
  root.style.setProperty('--song-library-dynamic-primary', primaryRgba);
  root.style.setProperty('--song-library-dynamic-secondary', secondaryRgba);
  root.style.setProperty('--song-library-dynamic-accent', colors.accent);
}

/**
 * Resets ambient colors to default theme values
 */
export function resetAmbientColors(): void {
  const root = document.documentElement;
  const isDark = document.documentElement.classList.contains('dark');
  
  if (isDark) {
    root.style.setProperty('--song-library-dynamic-primary', 'rgba(127, 119, 221, 0.15)');
    root.style.setProperty('--song-library-dynamic-secondary', 'rgba(127, 119, 221, 0.08)');
    root.style.setProperty('--song-library-dynamic-accent', '#7F77DD');
  } else {
    root.style.setProperty('--song-library-dynamic-primary', 'rgba(249, 115, 22, 0.05)');
    root.style.setProperty('--song-library-dynamic-secondary', 'rgba(249, 115, 22, 0.02)');
    root.style.setProperty('--song-library-dynamic-accent', '#f97316');
  }
}

/**
 * Generates a consistent gradient for songs without cover art
 * Based on song title and artist for deterministic results
 */
export function generateSongGradient(title: string, artist?: string): string {
  const seed = `${title}${artist || ''}`;
  const hash = simpleHash(seed);
  
  // Generate two complementary colors based on hash
  const hue1 = hash % 360;
  const hue2 = (hue1 + 60) % 360; // 60 degrees apart for harmony
  
  const isDark = document.documentElement.classList.contains('dark');
  
  if (isDark) {
    // Dark mode: deeper, more saturated gradients
    return `linear-gradient(135deg, hsl(${hue1}, 70%, 25%) 0%, hsl(${hue2}, 60%, 20%) 100%)`;
  } else {
    // Light mode: softer, lighter gradients
    return `linear-gradient(135deg, hsl(${hue1}, 60%, 85%) 0%, hsl(${hue2}, 50%, 90%) 100%)`;
  }
}

/**
 * Gets theme-appropriate colors for a given context
 */
export function getThemeColors(): ThemeColors {
  const isDark = document.documentElement.classList.contains('dark');
  
  if (isDark) {
    return {
      primary: '#ffffff',
      secondary: '#b3b3b3',
      tertiary: '#6a6a6a',
      accent: '#7F77DD',
    };
  } else {
    return {
      primary: '#171717',
      secondary: '#525252',
      tertiary: '#a3a3a3',
      accent: '#f97316',
    };
  }
}

/**
 * Applies theme-aware focus styles to an element
 */
export function applyFocusStyles(element: HTMLElement): void {
  const isDark = document.documentElement.classList.contains('dark');
  const focusColor = isDark ? '#7F77DD' : '#f97316';
  
  element.style.outline = 'none';
  element.style.boxShadow = `0 0 0 2px ${focusColor}20, 0 0 0 4px ${focusColor}10`;
}

/**
 * Removes focus styles from an element
 */
export function removeFocusStyles(element: HTMLElement): void {
  element.style.outline = '';
  element.style.boxShadow = '';
}

/**
 * Gets the appropriate shadow class for the current theme
 */
export function getThemeShadow(size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
  return `shadow-song-library-${size}`;
}

/**
 * Checks if the current theme is dark mode
 */
export function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

/**
 * Toggles between light and dark themes
 */
export function toggleTheme(): void {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  
  if (isDark) {
    root.classList.remove('dark');
    localStorage.setItem('song-library-theme', 'light');
  } else {
    root.classList.add('dark');
    localStorage.setItem('song-library-theme', 'dark');
  }
  
  // Reset ambient colors to match new theme
  resetAmbientColors();
}

/**
 * Initializes theme from localStorage or system preference
 */
export function initializeTheme(): void {
  const savedTheme = localStorage.getItem('song-library-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const shouldUseDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
  
  if (shouldUseDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  resetAmbientColors();
}

// Helper functions

/**
 * Converts hex color to rgba with specified alpha
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Simple hash function for generating consistent colors
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * CSS class name generators for theme-aware components
 */
export const themeClasses = {
  container: 'song-library-container',
  card: 'song-library-card',
  cardElevated: 'song-library-card-elevated',
  commandPalette: 'song-library-command-palette',
  button: 'song-library-button',
  buttonSecondary: 'song-library-button-secondary',
  input: 'song-library-input',
  listItem: 'song-library-list-item',
  dropZone: 'song-library-drop-zone',
  dragItem: 'song-library-drag-item',
  slider: 'song-library-slider',
  skeleton: 'song-library-skeleton',
  scrollbar: 'song-library-scrollbar',
  ambientGlow: 'song-library-ambient-glow',
  dynamicAmbient: 'song-library-dynamic-ambient',
} as const;

/**
 * Tailwind color class generators
 */
export const themeColors = {
  bg: {
    primary: 'bg-song-library-bg-primary',
    secondary: 'bg-song-library-bg-secondary',
    tertiary: 'bg-song-library-bg-tertiary',
    elevated: 'bg-song-library-bg-elevated',
    hover: 'bg-song-library-hover-bg',
    selected: 'bg-song-library-selected-bg',
  },
  text: {
    primary: 'text-song-library-text-primary',
    secondary: 'text-song-library-text-secondary',
    tertiary: 'text-song-library-text-tertiary',
    accent: 'text-song-library-text-accent',
  },
  border: {
    primary: 'border-song-library-border-primary',
    secondary: 'border-song-library-border-secondary',
    focus: 'border-song-library-border-focus',
    hover: 'border-song-library-border-hover',
    selected: 'border-song-library-selected-border',
  },
} as const;