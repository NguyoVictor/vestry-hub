/**
 * Ambient Colors Hook for Song Library
 * 
 * Manages ambient color extraction from cover art and applies
 * bleeding effects in dark mode for enhanced visual experience
 */

import { useState, useCallback, useEffect } from 'react';
import { useTheme } from '../components/ThemeProvider';
import type { AmbientColorState, CoverArtColors } from '@/types/song-library';

interface UseAmbientColorsReturn {
  currentColors: AmbientColorState;
  extractColorsFromImage: (imageUrl: string) => Promise<AmbientColorState>;
  setColorsFromCoverArt: (colors: CoverArtColors) => void;
  resetToDefault: () => void;
  isExtracting: boolean;
}

const DEFAULT_COLORS: AmbientColorState = {
  primary: '#f97316', // Orange-500
  secondary: '#fb923c', // Orange-400
  accent: '#ea6c0a', // Orange-600
};

/**
 * Hook for managing ambient colors in the song library
 * Extracts colors from cover art and applies them as ambient effects in dark mode
 */
export function useAmbientColors(): UseAmbientColorsReturn {
  const { theme, ambientColors, setAmbientColors } = useTheme();
  const [isExtracting, setIsExtracting] = useState(false);

  /**
   * Extract colors from an image URL using Canvas API
   */
  const extractColorsFromImage = useCallback(async (imageUrl: string): Promise<AmbientColorState> => {
    setIsExtracting(true);
    
    try {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              throw new Error('Could not get canvas context');
            }

            // Set canvas size to a smaller version for performance
            const size = 100;
            canvas.width = size;
            canvas.height = size;
            
            // Draw image to canvas
            ctx.drawImage(img, 0, 0, size, size);
            
            // Get image data
            const imageData = ctx.getImageData(0, 0, size, size);
            const data = imageData.data;
            
            // Extract dominant colors using simple color quantization
            const colorCounts: { [key: string]: number } = {};
            const colorSamples: { r: number; g: number; b: number }[] = [];
            
            // Sample every 4th pixel for performance
            for (let i = 0; i < data.length; i += 16) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];
              
              // Skip transparent pixels
              if (a < 128) continue;
              
              // Quantize colors to reduce noise
              const qR = Math.floor(r / 32) * 32;
              const qG = Math.floor(g / 32) * 32;
              const qB = Math.floor(b / 32) * 32;
              
              const colorKey = `${qR},${qG},${qB}`;
              colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
              colorSamples.push({ r: qR, g: qG, b: qB });
            }
            
            // Find the most common colors
            const sortedColors = Object.entries(colorCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([color]) => {
                const [r, g, b] = color.split(',').map(Number);
                return { r, g, b };
              });
            
            if (sortedColors.length === 0) {
              resolve(DEFAULT_COLORS);
              return;
            }
            
            // Convert to hex and create ambient color palette
            const toHex = (r: number, g: number, b: number) => 
              `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
            
            const primary = toHex(sortedColors[0].r, sortedColors[0].g, sortedColors[0].b);
            const secondary = sortedColors[1] 
              ? toHex(sortedColors[1].r, sortedColors[1].g, sortedColors[1].b)
              : primary;
            const accent = sortedColors[2] 
              ? toHex(sortedColors[2].r, sortedColors[2].g, sortedColors[2].b)
              : primary;
            
            resolve({ primary, secondary, accent });
          } catch (error) {
            console.warn('Error extracting colors from image:', error);
            resolve(DEFAULT_COLORS);
          }
        };
        
        img.onerror = () => {
          console.warn('Failed to load image for color extraction');
          resolve(DEFAULT_COLORS);
        };
        
        img.src = imageUrl;
      });
    } catch (error) {
      console.warn('Error in color extraction:', error);
      return DEFAULT_COLORS;
    } finally {
      setIsExtracting(false);
    }
  }, []);

  /**
   * Set colors from pre-extracted cover art colors
   */
  const setColorsFromCoverArt = useCallback((colors: CoverArtColors) => {
    const ambientColors: AmbientColorState = {
      primary: colors.primary || colors.dominant[0] || DEFAULT_COLORS.primary,
      secondary: colors.secondary || colors.dominant[1] || DEFAULT_COLORS.secondary,
      accent: colors.accent || colors.dominant[2] || DEFAULT_COLORS.accent,
    };
    
    setAmbientColors(ambientColors);
  }, [setAmbientColors]);

  /**
   * Reset to default theme colors
   */
  const resetToDefault = useCallback(() => {
    setAmbientColors(DEFAULT_COLORS);
  }, [setAmbientColors]);

  // Reset to default colors when switching to light mode
  useEffect(() => {
    if (theme === 'light') {
      resetToDefault();
    }
  }, [theme, resetToDefault]);

  return {
    currentColors: ambientColors,
    extractColorsFromImage,
    setColorsFromCoverArt,
    resetToDefault,
    isExtracting,
  };
}

/**
 * Utility function to validate and sanitize hex colors
 */
export function sanitizeHexColor(color: string): string {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color) ? color : DEFAULT_COLORS.primary;
}

/**
 * Utility function to generate a gradient from ambient colors
 */
export function createAmbientGradient(colors: AmbientColorState, opacity = 0.1): string {
  return `radial-gradient(circle at center, ${colors.primary}${Math.floor(opacity * 255).toString(16).padStart(2, '0')} 0%, ${colors.secondary}${Math.floor(opacity * 0.5 * 255).toString(16).padStart(2, '0')} 50%, transparent 100%)`;
}

/**
 * Utility function to create CSS custom properties for ambient colors
 */
export function createAmbientCSSProperties(colors: AmbientColorState): Record<string, string> {
  return {
    '--sl-ambient-primary': colors.primary,
    '--sl-ambient-secondary': colors.secondary,
    '--sl-ambient-accent': colors.accent,
    '--sl-ambient-glow-sm': `0 0 20px ${colors.primary}15`,
    '--sl-ambient-glow-md': `0 0 40px ${colors.primary}20`,
    '--sl-ambient-glow-lg': `0 0 60px ${colors.primary}25`,
    '--sl-ambient-gradient': createAmbientGradient(colors, 0.08),
  };
}

export default useAmbientColors;