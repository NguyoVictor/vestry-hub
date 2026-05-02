/**
 * TypeScript declarations for Song Library theme system
 */

declare module 'react' {
  interface CSSProperties {
    // Song Library CSS Custom Properties
    '--song-library-bg-primary'?: string;
    '--song-library-bg-secondary'?: string;
    '--song-library-bg-tertiary'?: string;
    '--song-library-bg-elevated'?: string;
    '--song-library-bg-overlay'?: string;
    
    '--song-library-text-primary'?: string;
    '--song-library-text-secondary'?: string;
    '--song-library-text-tertiary'?: string;
    '--song-library-text-inverse'?: string;
    '--song-library-text-accent'?: string;
    
    '--song-library-border-primary'?: string;
    '--song-library-border-secondary'?: string;
    '--song-library-border-focus'?: string;
    '--song-library-border-hover'?: string;
    
    '--song-library-hover-bg'?: string;
    '--song-library-active-bg'?: string;
    '--song-library-selected-bg'?: string;
    '--song-library-selected-border'?: string;
    
    '--song-library-ambient-primary'?: string;
    '--song-library-ambient-secondary'?: string;
    '--song-library-ambient-glow'?: string;
    
    '--song-library-command-bg'?: string;
    '--song-library-command-border'?: string;
    
    '--song-library-card-bg'?: string;
    '--song-library-card-border'?: string;
    
    '--song-library-shadow-sm'?: string;
    '--song-library-shadow-md'?: string;
    '--song-library-shadow-lg'?: string;
    '--song-library-shadow-xl'?: string;
    '--song-library-command-shadow'?: string;
    '--song-library-card-hover-shadow'?: string;
    '--song-library-card-selected-glow'?: string;
    
    // Dynamic colors (updated by JavaScript)
    '--song-library-dynamic-primary'?: string;
    '--song-library-dynamic-secondary'?: string;
    '--song-library-dynamic-accent'?: string;
  }
}

export interface SongLibraryTheme {
  mode: 'light' | 'dark';
  colors: {
    bg: {
      primary: string;
      secondary: string;
      tertiary: string;
      elevated: string;
      overlay: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
      accent: string;
    };
    border: {
      primary: string;
      secondary: string;
      focus: string;
      hover: string;
    };
    interactive: {
      hover: string;
      active: string;
      selected: string;
      selectedBorder: string;
    };
    ambient: {
      primary: string;
      secondary: string;
      glow: string;
    };
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    command: string;
    cardHover: string;
    cardSelected: string;
  };
}

export interface AmbientColorState {
  primary: string;
  secondary: string;
  accent: string;
  isActive: boolean;
}

export interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  ambientColors: AmbientColorState;
  setAmbientColors: (colors: Partial<AmbientColorState>) => void;
  resetAmbientColors: () => void;
}

export {};