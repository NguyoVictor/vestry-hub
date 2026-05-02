/**
 * Chord Transposition Component for Song Library UI Revamp
 * 
 * Provides real-time chord transposition with slider interface.
 * Handles complex chord notations and preserves formatting.
 * 
 * Features:
 * - Slider interface with -6 to +6 semitone range
 * - Real-time chord updates as slider moves
 * - Double-click reset to original key
 * - Key display (original and transposed)
 * - User preference persistence per song
 * 
 * Requirements: 6.1, 6.2, 6.5, 6.6, 6.7
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, RotateCcw, Settings, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { TranspositionSlider } from './TranspositionSlider';
import { ChordDisplay } from './ChordDisplay';
import { KeyDisplay } from './KeyDisplay';
import { 
  transposeChordSheet, 
  transposeKey, 
  detectKey, 
  extractChords,
  type KeyTransposition 
} from '../../utils/chordTransposition';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import type { Song } from '@/types/song-library';

export interface ChordTranspositionProps {
  /** Song to transpose */
  song: Song;
  /** Whether the component is expanded */
  isExpanded?: boolean;
  /** Expansion toggle handler */
  onToggleExpanded?: (expanded: boolean) => void;
  /** Transposition change handler */
  onTranspositionChange?: (semitones: number, transposedChords: string) => void;
  /** Custom class name */
  className?: string;
}

export interface TranspositionState {
  /** Current semitone offset (-6 to +6) */
  semitones: number;
  /** Original chord sheet */
  originalChords: string;
  /** Transposed chord sheet */
  transposedChords: string;
  /** Original key */
  originalKey: string;
  /** Transposed key */
  transposedKey: string;
  /** Key signature information */
  keySignature: KeyTransposition['keySignature'];
  /** Whether transposition is active */
  isActive: boolean;
}

/**
 * Main Chord Transposition component
 */
export function ChordTransposition({
  song,
  isExpanded = false,
  onToggleExpanded,
  onTranspositionChange,
  className = '',
}: ChordTranspositionProps) {
  const { preferences, updateTranspositionPreference } = useUserPreferences();
  
  // Initialize transposition state
  const [state, setState] = useState<TranspositionState>(() => {
    const originalChords = song.chords || '';
    const originalKey = song.key || detectKey(extractChords(originalChords)) || 'C';
    const savedSemitones = preferences.transposition_preferences?.[song.id] || 0;
    
    return {
      semitones: savedSemitones,
      originalChords,
      transposedChords: savedSemitones !== 0 ? transposeChordSheet(originalChords, savedSemitones) : originalChords,
      originalKey,
      transposedKey: savedSemitones !== 0 ? transposeKey(originalKey, savedSemitones).transposedKey : originalKey,
      keySignature: transposeKey(originalKey, savedSemitones).keySignature,
      isActive: savedSemitones !== 0,
    };
  });
  
  // Update state when song changes
  useEffect(() => {
    const originalChords = song.chords || '';
    const originalKey = song.key || detectKey(extractChords(originalChords)) || 'C';
    const savedSemitones = preferences.transposition_preferences?.[song.id] || 0;
    
    setState({
      semitones: savedSemitones,
      originalChords,
      transposedChords: savedSemitones !== 0 ? transposeChordSheet(originalChords, savedSemitones) : originalChords,
      originalKey,
      transposedKey: savedSemitones !== 0 ? transposeKey(originalKey, savedSemitones).transposedKey : originalKey,
      keySignature: transposeKey(originalKey, savedSemitones).keySignature,
      isActive: savedSemitones !== 0,
    });
  }, [song.id, song.chords, song.key, preferences.transposition_preferences]);
  
  // Handle transposition change
  const handleTranspositionChange = useCallback((semitones: number) => {
    const transposedChords = semitones !== 0 
      ? transposeChordSheet(state.originalChords, semitones)
      : state.originalChords;
    
    const keyTransposition = transposeKey(state.originalKey, semitones);
    
    const newState = {
      ...state,
      semitones,
      transposedChords,
      transposedKey: keyTransposition.transposedKey,
      keySignature: keyTransposition.keySignature,
      isActive: semitones !== 0,
    };
    
    setState(newState);
    
    // Save preference
    updateTranspositionPreference(song.id, semitones);
    
    // Notify parent
    onTranspositionChange?.(semitones, transposedChords);
  }, [state, song.id, updateTranspositionPreference, onTranspositionChange]);
  
  // Reset to original key
  const handleReset = useCallback(() => {
    handleTranspositionChange(0);
  }, [handleTranspositionChange]);
  
  // Toggle expanded state
  const handleToggleExpanded = useCallback(() => {
    onToggleExpanded?.(!isExpanded);
  }, [isExpanded, onToggleExpanded]);
  
  // Memoized chord analysis
  const chordAnalysis = useMemo(() => {
    const originalChords = extractChords(state.originalChords);
    const transposedChords = extractChords(state.transposedChords);
    
    return {
      originalChords,
      transposedChords,
      chordCount: originalChords.length,
      uniqueChords: new Set(originalChords).size,
    };
  }, [state.originalChords, state.transposedChords]);
  
  // Animation variants
  const cardVariants = {
    collapsed: { height: 'auto', opacity: 1 },
    expanded: { height: 'auto', opacity: 1 },
  };
  
  const contentVariants = {
    collapsed: { opacity: 0, height: 0, overflow: 'hidden' },
    expanded: { opacity: 1, height: 'auto', overflow: 'visible' },
  };
  
  return (
    <TooltipProvider>
      <motion.div
        className={`sl-card ${className}`}
        variants={cardVariants}
        animate={isExpanded ? 'expanded' : 'collapsed'}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <Music className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sl-text-primary">Chord Transposition</h3>
              <p className="text-xs sl-text-muted">
                {state.isActive ? `Transposed ${state.semitones > 0 ? '+' : ''}${state.semitones} semitones` : 'Original key'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Key Display */}
            <KeyDisplay
              originalKey={state.originalKey}
              transposedKey={state.transposedKey}
              isActive={state.isActive}
            />
            
            {/* Reset Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                  disabled={!state.isActive}
                  className="h-8 w-8 p-0"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset to original key</TooltipContent>
            </Tooltip>
            
            {/* Expand Toggle */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleToggleExpanded}
              className="h-8 w-8 p-0"
            >
              <Settings className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* Quick Transposition Slider (Always Visible) */}
        <div className="mb-4">
          <TranspositionSlider
            value={state.semitones}
            onChange={handleTranspositionChange}
            onReset={handleReset}
            disabled={!state.originalChords}
            compact={!isExpanded}
          />
        </div>
        
        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              variants={contentVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <Separator className="mb-4" />
              
              {/* Chord Analysis */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-medium sl-text-secondary uppercase tracking-wide">
                    Chord Analysis
                  </h4>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="sl-text-muted">Total: </span>
                      <span className="font-medium sl-text-primary">{chordAnalysis.chordCount}</span>
                    </div>
                    <div>
                      <span className="sl-text-muted">Unique: </span>
                      <span className="font-medium sl-text-primary">{chordAnalysis.uniqueChords}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-xs font-medium sl-text-secondary uppercase tracking-wide">
                    Key Signature
                  </h4>
                  <div className="flex items-center gap-2 text-sm">
                    {state.keySignature.sharps > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {state.keySignature.sharps}♯
                      </Badge>
                    )}
                    {state.keySignature.flats > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {state.keySignature.flats}♭
                      </Badge>
                    )}
                    {state.keySignature.sharps === 0 && state.keySignature.flats === 0 && (
                      <Badge variant="outline" className="text-xs">
                        Natural
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Chord Display */}
              {state.originalChords && (
                <div className="space-y-3">
                  <h4 className="text-xs font-medium sl-text-secondary uppercase tracking-wide">
                    Chord Preview
                  </h4>
                  <ChordDisplay
                    originalChords={state.originalChords}
                    transposedChords={state.transposedChords}
                    isActive={state.isActive}
                    maxLines={3}
                  />
                </div>
              )}
              
              {/* Quick Transpose Buttons */}
              <div className="mt-4">
                <h4 className="text-xs font-medium sl-text-secondary uppercase tracking-wide mb-2">
                  Quick Transpose
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {[-5, -3, -2, -1, 1, 2, 3, 5].map((semitones) => (
                    <Button
                      key={semitones}
                      size="sm"
                      variant={state.semitones === semitones ? "default" : "outline"}
                      onClick={() => handleTranspositionChange(semitones)}
                      className="h-7 px-2 text-xs"
                    >
                      {semitones > 0 ? '+' : ''}{semitones}
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </TooltipProvider>
  );
}

export default ChordTransposition;