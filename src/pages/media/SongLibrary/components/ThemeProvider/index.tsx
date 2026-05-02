/**
 * Theme Provider for Song Library UI Revamp
 * 
 * Provides comprehensive dual-theme system with:
 * - Light mode: Vercel-inspired aesthetic (white surfaces, sharp typography, ultra-thin borders, generous whitespace)
 * - Dark mode: Spotify-inspired aesthetic (deep #0a0a0a background, #111111 cards, #7F77DD purple accents)
 * - Ambient color bleeding from cover art in dark mode
 * - Smooth theme transitions with Framer Motion
 * - Persistent theme selection across browser sessions
 * - System preference detection and respect
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ThemeContextValue, AmbientColorState } from '@/types/song-library';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [ambientColors, setAmbientColors] = useState<AmbientColorState>({
    primary: '#f97316', // Orange-500 default
    secondary: '#fb923c', // Orange-400 default
    accent: '#ea6c0a', // Orange-600 default
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Load theme from localStorage on mount with system preference fallback
  useEffect(() => {
    const savedTheme = localStorage.getItem('song-library-theme') as 'light' | 'dark' | null;
    
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setTheme(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
    
    setIsInitialized(true);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      const savedTheme = localStorage.getItem('song-library-theme');
      if (!savedTheme) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // Apply comprehensive theme variables to document
  useEffect(() => {
    if (!isInitialized) return;

    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.add('song-library-dark');
      root.classList.remove('song-library-light');
      
      // Spotify-inspired dark theme variables
      root.style.setProperty('--sl-bg-app', '#0a0a0a');
      root.style.setProperty('--sl-bg-surface', '#111111');
      root.style.setProperty('--sl-bg-subtle', '#1a1a1a');
      root.style.setProperty('--sl-bg-elevated', '#1f1f1f');
      root.style.setProperty('--sl-bg-overlay', '#2a2a2a');
      
      // Text colors for dark mode
      root.style.setProperty('--sl-text-primary', '#ffffff');
      root.style.setProperty('--sl-text-secondary', '#b3b3b3');
      root.style.setProperty('--sl-text-muted', '#737373');
      root.style.setProperty('--sl-text-disabled', '#525252');
      
      // Spotify purple accent system
      root.style.setProperty('--sl-accent-primary', '#7F77DD');
      root.style.setProperty('--sl-accent-secondary', '#9B93E6');
      root.style.setProperty('--sl-accent-muted', '#5A52B8');
      
      // Dark mode borders (subtle)
      root.style.setProperty('--sl-border-default', '#2a2a2a');
      root.style.setProperty('--sl-border-muted', '#1f1f1f');
      root.style.setProperty('--sl-border-strong', '#404040');
      
      // Dark mode shadows with ambient glow
      root.style.setProperty('--sl-shadow-sm', '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)');
      root.style.setProperty('--sl-shadow-md', '0 4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)');
      root.style.setProperty('--sl-shadow-lg', '0 10px 15px rgba(0,0,0,0.5), 0 4px 6px rgba(0,0,0,0.4)');
      root.style.setProperty('--sl-shadow-xl', '0 20px 25px rgba(0,0,0,0.6), 0 8px 10px rgba(0,0,0,0.5)');
      
    } else {
      root.classList.remove('dark');
      root.classList.add('song-library-light');
      root.classList.remove('song-library-dark');
      
      // Vercel-inspired light theme variables
      root.style.setProperty('--sl-bg-app', '#fafafa');
      root.style.setProperty('--sl-bg-surface', '#ffffff');
      root.style.setProperty('--sl-bg-subtle', '#f4f4f5');
      root.style.setProperty('--sl-bg-elevated', '#ffffff');
      root.style.setProperty('--sl-bg-overlay', '#f8fafc');
      
      // Text colors for light mode (sharp, high contrast)
      root.style.setProperty('--sl-text-primary', '#0a0a0a');
      root.style.setProperty('--sl-text-secondary', '#525252');
      root.style.setProperty('--sl-text-muted', '#737373');
      root.style.setProperty('--sl-text-disabled', '#a3a3a3');
      
      // Orange accent system for light mode
      root.style.setProperty('--sl-accent-primary', '#f97316');
      root.style.setProperty('--sl-accent-secondary', '#fb923c');
      root.style.setProperty('--sl-accent-muted', '#ea6c0a');
      
      // Light mode borders (ultra-thin, Vercel style)
      root.style.setProperty('--sl-border-default', '#e5e5e5');
      root.style.setProperty('--sl-border-muted', '#f0f0f0');
      root.style.setProperty('--sl-border-strong', '#d4d4d4');
      
      // Light mode shadows (subtle, clean)
      root.style.setProperty('--sl-shadow-sm', '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)');
      root.style.setProperty('--sl-shadow-md', '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.03)');
      root.style.setProperty('--sl-shadow-lg', '0 10px 15px rgba(0,0,0,0.06), 0 4px 6px rgba(0,0,0,0.04)');
      root.style.setProperty('--sl-shadow-xl', '0 20px 25px rgba(0,0,0,0.08), 0 8px 10px rgba(0,0,0,0.05)');
    }

    // Save theme preference
    localStorage.setItem('song-library-theme', theme);
  }, [theme, isInitialized]);

  // Apply ambient colors for dark mode bleeding effects
  useEffect(() => {
    if (!isInitialized) return;

    const root = document.documentElement;
    
    if (theme === 'dark') {
      // Apply ambient color bleeding in dark mode
      root.style.setProperty('--sl-ambient-primary', ambientColors.primary);
      root.style.setProperty('--sl-ambient-secondary', ambientColors.secondary);
      root.style.setProperty('--sl-ambient-accent', ambientColors.accent);
      
      // Create subtle glow effects with ambient colors
      root.style.setProperty('--sl-ambient-glow-sm', `0 0 20px ${ambientColors.primary}15`);
      root.style.setProperty('--sl-ambient-glow-md', `0 0 40px ${ambientColors.primary}20`);
      root.style.setProperty('--sl-ambient-glow-lg', `0 0 60px ${ambientColors.primary}25`);
      
      // Gradient overlays for ambient bleeding
      root.style.setProperty('--sl-ambient-gradient', 
        `radial-gradient(circle at center, ${ambientColors.primary}08 0%, transparent 70%)`
      );
    } else {
      // Clear ambient colors in light mode
      root.style.setProperty('--sl-ambient-primary', 'transparent');
      root.style.setProperty('--sl-ambient-secondary', 'transparent');
      root.style.setProperty('--sl-ambient-accent', 'transparent');
      root.style.setProperty('--sl-ambient-glow-sm', 'none');
      root.style.setProperty('--sl-ambient-glow-md', 'none');
      root.style.setProperty('--sl-ambient-glow-lg', 'none');
      root.style.setProperty('--sl-ambient-gradient', 'none');
    }
  }, [theme, ambientColors, isInitialized]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const updateAmbientColors = useCallback((colors: AmbientColorState) => {
    setAmbientColors(colors);
  }, []);

  const contextValue: ThemeContextValue = {
    theme,
    toggleTheme,
    ambientColors,
    setAmbientColors: updateAmbientColors,
  };

  // Don't render until theme is initialized to prevent flash
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 0.4, 
            ease: [0.4, 0.0, 0.2, 1] // Custom easing for smooth transitions
          }}
          className={`min-h-screen transition-all duration-500 ease-out ${
            theme === 'dark' 
              ? 'bg-[var(--sl-bg-app)] text-[var(--sl-text-primary)]' 
              : 'bg-[var(--sl-bg-app)] text-[var(--sl-text-primary)]'
          }`}
          style={{
            // Apply ambient gradient overlay in dark mode
            backgroundImage: theme === 'dark' ? 'var(--sl-ambient-gradient)' : 'none',
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;