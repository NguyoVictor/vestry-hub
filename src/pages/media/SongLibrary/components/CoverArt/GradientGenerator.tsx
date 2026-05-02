/**
 * Enhanced GradientGenerator Component
 * 
 * Generates consistent gradient patterns for songs without cover art.
 * Creates deterministic gradients based on song title and artist with
 * advanced algorithms, caching, and customization options.
 * 
 * Requirements: 5.2, 5.5, 5.7
 */

import React, { useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, RefreshCw, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { GradientGeneratorProps } from './types';
import {
  generateSongGradient,
  generateAdvancedGradient,
  generateGradientVariations,
  generateThemeGradient,
  getFallbackGradient,
  gradientToCss,
  createGradientStyle,
  extractGradientColors,
  validateGradient,
} from '../../utils/gradientGeneration';

// Size configuration with responsive classes
const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-48 h-48',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
};

export function GradientGenerator({
  songTitle,
  artistName,
  size = 'md',
  variant = 'linear',
  showControls = false,
  showVariations = false,
  onGradientChange,
  className,
  // New advanced customization props
  mood,
  intensity,
  complexity,
}: GradientGeneratorProps) {
  const [currentVariationIndex, setCurrentVariationIndex] = useState(0);
  const [copiedGradient, setCopiedGradient] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Generate gradient configuration with enhanced algorithm
  const gradientConfig = useMemo(() => {
    try {
      // Detect theme for appropriate gradient generation
      const isDarkMode = document.documentElement.classList.contains('dark');
      const theme = isDarkMode ? 'dark' : 'light';
      
      let config;
      
      // Use advanced generation if customization options are provided
      if (mood || intensity || complexity) {
        config = generateAdvancedGradient(songTitle, artistName, {
          mood,
          intensity,
          complexity,
          seasonalAdjustment: true,
        });
      } else if (variant === 'auto') {
        // Use theme-aware generation
        config = generateThemeGradient(songTitle, artistName, theme);
      } else {
        // Use standard generation with variant override
        config = generateSongGradient(songTitle, artistName);
        if (variant !== 'linear') {
          config = { ...config, type: variant };
        }
      }
      
      // Validate the generated gradient
      if (!validateGradient(config)) {
        console.warn('Invalid gradient generated, using fallback');
        return getFallbackGradient('default', { songTitle, artistName });
      }
      
      return config;
    } catch (error) {
      console.error('Error generating gradient:', error);
      return getFallbackGradient('error', { songTitle, artistName });
    }
  }, [songTitle, artistName, variant, mood, intensity, complexity]);

  // Generate variations for customization
  const gradientVariations = useMemo(() => {
    if (!showVariations) return [gradientConfig];
    
    try {
      const variations = generateGradientVariations(songTitle, artistName);
      return variations.filter(validateGradient);
    } catch (error) {
      console.error('Error generating variations:', error);
      return [getFallbackGradient('default', { songTitle, artistName })];
    }
  }, [songTitle, artistName, showVariations, gradientConfig]);

  // Current gradient (base or variation)
  const currentGradient = gradientVariations[currentVariationIndex] || gradientConfig;

  // Create CSS gradient style
  const gradientStyle = useMemo(() => {
    try {
      return createGradientStyle(currentGradient);
    } catch (error) {
      console.error('Error creating gradient style:', error);
      return createGradientStyle(getFallbackGradient('error', { songTitle, artistName }));
    }
  }, [currentGradient]);

  // Handle variation change
  const handleVariationChange = useCallback(() => {
    if (gradientVariations.length <= 1) return;
    
    setIsAnimating(true);
    const nextIndex = (currentVariationIndex + 1) % gradientVariations.length;
    setCurrentVariationIndex(nextIndex);
    
    // Notify parent of gradient change
    onGradientChange?.(gradientVariations[nextIndex]);
    
    // Reset animation state
    setTimeout(() => setIsAnimating(false), 300);
  }, [currentVariationIndex, gradientVariations, onGradientChange]);

  // Copy gradient CSS to clipboard
  const handleCopyGradient = useCallback(async () => {
    try {
      const cssGradient = gradientToCss(currentGradient);
      await navigator.clipboard.writeText(cssGradient);
      setCopiedGradient(true);
      toast.success('Gradient CSS copied to clipboard');
      
      setTimeout(() => setCopiedGradient(false), 2000);
    } catch (error) {
      console.error('Failed to copy gradient:', error);
      toast.error('Failed to copy gradient CSS');
    }
  }, [currentGradient]);

  // Extract colors for ambient effects
  const gradientColors = useMemo(() => {
    return extractGradientColors(currentGradient);
  }, [currentGradient]);

  return (
    <div className={cn('relative group', className)}>
      {/* Main Gradient Display */}
      <motion.div
        className={cn(
          'relative overflow-hidden rounded-lg sl-gradient-container',
          sizeClasses[size],
          'border border-slate-200/50 dark:border-slate-700/50'
        )}
        style={gradientStyle}
        animate={isAnimating ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        title={`Generated gradient for "${songTitle}"${artistName ? ` by ${artistName}` : ''}`}
      >
        {/* Subtle overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        
        {/* Pattern overlay for visual interest */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px),
                             radial-gradient(circle at 75% 75%, white 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 8px 8px'
          }}
        />

        {/* Gradient Type Indicator */}
        {size !== 'sm' && (
          <div className="absolute top-1 left-1">
            <div className="bg-black/20 backdrop-blur-sm rounded px-1.5 py-0.5">
              <span className="text-xs font-medium text-white/90 uppercase tracking-wide">
                {currentGradient.type}
              </span>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center gap-2"
          >
            {/* Variation Toggle */}
            {gradientVariations.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleVariationChange}
                className="text-white hover:bg-white/20 border-white/30"
                title="Try different variation"
              >
                <RefreshCw className={cn(iconSizes[size], isAnimating && 'animate-spin')} />
              </Button>
            )}

            {/* Copy Gradient */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyGradient}
              className="text-white hover:bg-white/20 border-white/30"
              title="Copy CSS gradient"
            >
              {copiedGradient ? (
                <Check className={iconSizes[size]} />
              ) : (
                <Copy className={iconSizes[size]} />
              )}
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Gradient Variations Preview */}
      {showVariations && gradientVariations.length > 1 && size !== 'sm' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex gap-1 justify-center"
        >
          {gradientVariations.map((variation, index) => (
            <motion.button
              key={index}
              className={cn(
                'w-6 h-6 rounded border-2 transition-all duration-200',
                index === currentVariationIndex
                  ? 'border-orange-500 scale-110'
                  : 'border-slate-300 dark:border-slate-600 hover:border-orange-400'
              )}
              style={createGradientStyle(variation)}
              onClick={() => {
                setCurrentVariationIndex(index);
                onGradientChange?.(variation);
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title={`Variation ${index + 1} (${variation.type})`}
            />
          ))}
        </motion.div>
      )}

      {/* Color Palette Display */}
      {size === 'xl' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2"
        >
          <Palette className="h-4 w-4 text-slate-500" />
          <div className="flex gap-1">
            {gradientColors.dominant.map((color, index) => (
              <div
                key={index}
                className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm"
                style={{ backgroundColor: color }}
                title={`Color ${index + 1}: ${color}`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-500 ml-2">
            {currentGradient.colors.length} colors
          </span>
        </motion.div>
      )}

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && size === 'xl' && (
        <details className="mt-2 text-xs text-slate-500">
          <summary className="cursor-pointer hover:text-slate-700">Debug Info</summary>
          <pre className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-auto">
            {JSON.stringify(currentGradient, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

/**
 * Get gradient colors for external use (enhanced version)
 */
export function getGradientColors(songTitle: string, artistName?: string): string[] {
  try {
    const config = generateSongGradient(songTitle, artistName);
    return config.colors;
  } catch (error) {
    console.error('Error getting gradient colors:', error);
    return getFallbackGradient('default', { songTitle, artistName }).colors;
  }
}

/**
 * Get gradient CSS for external styling (enhanced version)
 */
export function getGradientCSS(
  songTitle: string, 
  artistName?: string, 
  variant: 'linear' | 'radial' | 'conic' | 'auto' = 'linear'
): string {
  try {
    let config;
    if (variant === 'auto') {
      const isDarkMode = document.documentElement.classList.contains('dark');
      config = generateThemeGradient(songTitle, artistName, isDarkMode ? 'dark' : 'light');
    } else {
      config = generateSongGradient(songTitle, artistName);
      if (variant !== 'linear') {
        config = { ...config, type: variant };
      }
    }
    
    return gradientToCss(config);
  } catch (error) {
    console.error('Error getting gradient CSS:', error);
    return gradientToCss(getFallbackGradient('error', { songTitle, artistName }));
  }
}

/**
 * Preload gradients for a list of songs (performance optimization)
 */
export function preloadGradients(songs: Array<{ title: string; artist?: string }>): void {
  // Generate gradients in background to populate cache
  songs.forEach(song => {
    try {
      generateSongGradient(song.title, song.artist);
    } catch (error) {
      console.warn('Failed to preload gradient for:', song.title, error);
    }
  });
}