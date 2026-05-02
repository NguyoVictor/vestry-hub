/**
 * Key Display Component
 * 
 * Shows original and transposed keys prominently with visual indicators.
 * Displays key signature information and transposition direction.
 * 
 * Requirements: 6.5
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KeyDisplayProps {
  /** Original key */
  originalKey: string;
  /** Transposed key */
  transposedKey: string;
  /** Whether transposition is active */
  isActive: boolean;
  /** Display size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show key signature info */
  showKeySignature?: boolean;
  /** Custom class name */
  className?: string;
}

// Key color mapping for visual distinction
const getKeyColor = (key: string): string => {
  const isMinor = key.toLowerCase().includes('m') && !key.toLowerCase().includes('maj');
  const hasAccidentals = key.includes('#') || key.includes('b');
  
  if (isMinor) {
    return hasAccidentals 
      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
  }
  
  return hasAccidentals
    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
};

// Get key signature information
const getKeySignatureInfo = (key: string) => {
  const keyMap: Record<string, { sharps: number; flats: number; description: string }> = {
    // Major keys
    'C': { sharps: 0, flats: 0, description: 'No accidentals' },
    'G': { sharps: 1, flats: 0, description: '1 sharp (F#)' },
    'D': { sharps: 2, flats: 0, description: '2 sharps (F#, C#)' },
    'A': { sharps: 3, flats: 0, description: '3 sharps (F#, C#, G#)' },
    'E': { sharps: 4, flats: 0, description: '4 sharps (F#, C#, G#, D#)' },
    'B': { sharps: 5, flats: 0, description: '5 sharps (F#, C#, G#, D#, A#)' },
    'F#': { sharps: 6, flats: 0, description: '6 sharps (F#, C#, G#, D#, A#, E#)' },
    'F': { sharps: 0, flats: 1, description: '1 flat (Bb)' },
    'Bb': { sharps: 0, flats: 2, description: '2 flats (Bb, Eb)' },
    'Eb': { sharps: 0, flats: 3, description: '3 flats (Bb, Eb, Ab)' },
    'Ab': { sharps: 0, flats: 4, description: '4 flats (Bb, Eb, Ab, Db)' },
    'Db': { sharps: 0, flats: 5, description: '5 flats (Bb, Eb, Ab, Db, Gb)' },
    'Gb': { sharps: 0, flats: 6, description: '6 flats (Bb, Eb, Ab, Db, Gb, Cb)' },
    
    // Minor keys
    'Am': { sharps: 0, flats: 0, description: 'No accidentals (relative to C major)' },
    'Em': { sharps: 1, flats: 0, description: '1 sharp (F#, relative to G major)' },
    'Bm': { sharps: 2, flats: 0, description: '2 sharps (F#, C#, relative to D major)' },
    'F#m': { sharps: 3, flats: 0, description: '3 sharps (F#, C#, G#, relative to A major)' },
    'C#m': { sharps: 4, flats: 0, description: '4 sharps (F#, C#, G#, D#, relative to E major)' },
    'G#m': { sharps: 5, flats: 0, description: '5 sharps (F#, C#, G#, D#, A#, relative to B major)' },
    'D#m': { sharps: 6, flats: 0, description: '6 sharps (F#, C#, G#, D#, A#, E#, relative to F# major)' },
    'Dm': { sharps: 0, flats: 1, description: '1 flat (Bb, relative to F major)' },
    'Gm': { sharps: 0, flats: 2, description: '2 flats (Bb, Eb, relative to Bb major)' },
    'Cm': { sharps: 0, flats: 3, description: '3 flats (Bb, Eb, Ab, relative to Eb major)' },
    'Fm': { sharps: 0, flats: 4, description: '4 flats (Bb, Eb, Ab, Db, relative to Ab major)' },
    'Bbm': { sharps: 0, flats: 5, description: '5 flats (Bb, Eb, Ab, Db, Gb, relative to Db major)' },
    'Ebm': { sharps: 0, flats: 6, description: '6 flats (Bb, Eb, Ab, Db, Gb, Cb, relative to Gb major)' },
  };
  
  return keyMap[key] || { sharps: 0, flats: 0, description: 'Unknown key signature' };
};

// Size configurations
const sizeConfig = {
  sm: {
    keyBadge: 'text-xs px-2 py-1',
    arrow: 'h-3 w-3',
    container: 'gap-1',
  },
  md: {
    keyBadge: 'text-sm px-2.5 py-1.5',
    arrow: 'h-4 w-4',
    container: 'gap-2',
  },
  lg: {
    keyBadge: 'text-base px-3 py-2',
    arrow: 'h-5 w-5',
    container: 'gap-3',
  },
};

/**
 * Key Display Component
 */
export function KeyDisplay({
  originalKey,
  transposedKey,
  isActive,
  size = 'md',
  showKeySignature = false,
  className = '',
}: KeyDisplayProps) {
  const config = sizeConfig[size];
  const originalKeyInfo = getKeySignatureInfo(originalKey);
  const transposedKeyInfo = getKeySignatureInfo(transposedKey);
  
  return (
    <TooltipProvider>
      <div className={cn('flex items-center', config.container, className)}>
        {/* Original Key */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ scale: 1 }}
              animate={{ 
                scale: isActive ? 0.95 : 1,
                opacity: isActive ? 0.7 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              <Badge 
                variant="outline" 
                className={cn(
                  config.keyBadge,
                  'font-mono font-semibold transition-all',
                  isActive ? 'opacity-70' : getKeyColor(originalKey)
                )}
              >
                {originalKey}
              </Badge>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <div className="font-medium">Original Key: {originalKey}</div>
              {showKeySignature && (
                <div className="text-xs opacity-75 mt-1">
                  {originalKeyInfo.description}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
        
        {/* Arrow (only when transposed) */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <ArrowRight className={cn(config.arrow, 'sl-text-muted')} />
          </motion.div>
        )}
        
        {/* Transposed Key (only when active) */}
        {isActive && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, x: 10, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.8 }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
              >
                <Badge 
                  className={cn(
                    config.keyBadge,
                    'font-mono font-semibold',
                    getKeyColor(transposedKey)
                  )}
                >
                  {transposedKey}
                </Badge>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <div className="font-medium">Transposed Key: {transposedKey}</div>
                {showKeySignature && (
                  <div className="text-xs opacity-75 mt-1">
                    {transposedKeyInfo.description}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Key Signature Indicators */}
        {showKeySignature && isActive && (
          <div className="flex items-center gap-1 ml-2">
            {transposedKeyInfo.sharps > 0 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                {transposedKeyInfo.sharps}♯
              </Badge>
            )}
            {transposedKeyInfo.flats > 0 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                {transposedKeyInfo.flats}♭
              </Badge>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default KeyDisplay;