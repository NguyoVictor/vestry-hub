/**
 * Transposition Slider Component
 * 
 * Interactive slider for chord transposition with -6 to +6 semitone range.
 * Features double-click reset and real-time updates.
 * 
 * Requirements: 6.1, 6.2, 6.6
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RotateCcw, Music } from 'lucide-react';

export interface TranspositionSliderProps {
  /** Current semitone value (-6 to +6) */
  value: number;
  /** Change handler */
  onChange: (value: number) => void;
  /** Reset handler */
  onReset: () => void;
  /** Whether the slider is disabled */
  disabled?: boolean;
  /** Compact mode (smaller size) */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

// Semitone labels for display
const SEMITONE_LABELS = {
  '-6': '-6 (Tritone down)',
  '-5': '-5 (Perfect 4th down)',
  '-4': '-4 (Major 3rd down)',
  '-3': '-3 (Minor 3rd down)',
  '-2': '-2 (Whole step down)',
  '-1': '-1 (Half step down)',
  '0': 'Original Key',
  '1': '+1 (Half step up)',
  '2': '+2 (Whole step up)',
  '3': '+3 (Minor 3rd up)',
  '4': '+4 (Major 3rd up)',
  '5': '+5 (Perfect 4th up)',
  '6': '+6 (Tritone up)',
} as const;

// Key color mapping for visual feedback
const getKeyColor = (semitones: number): string => {
  if (semitones === 0) return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  if (semitones > 0) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
};

/**
 * Transposition Slider Component
 */
export function TranspositionSlider({
  value,
  onChange,
  onReset,
  disabled = false,
  compact = false,
  className = '',
}: TranspositionSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const lastClickTime = useRef<number>(0);
  
  // Handle slider change
  const handleSliderChange = useCallback((values: number[]) => {
    const newValue = values[0];
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [value, onChange]);
  
  // Handle double-click reset
  const handleSliderClick = useCallback((event: React.MouseEvent) => {
    const now = Date.now();
    const timeDiff = now - lastClickTime.current;
    
    if (timeDiff < 300) { // Double-click detected
      event.preventDefault();
      onReset();
    }
    
    lastClickTime.current = now;
  }, [onReset]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      
      // Only handle if slider is focused or no other input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                           activeElement?.tagName === 'TEXTAREA' ||
                           activeElement?.contentEditable === 'true';
      
      if (isInputFocused && activeElement !== sliderRef.current) return;
      
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          event.preventDefault();
          onChange(Math.max(-6, value - 1));
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          event.preventDefault();
          onChange(Math.min(6, value + 1));
          break;
        case 'Home':
          event.preventDefault();
          onChange(-6);
          break;
        case 'End':
          event.preventDefault();
          onChange(6);
          break;
        case 'Escape':
        case '0':
          event.preventDefault();
          onReset();
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [value, onChange, onReset, disabled]);
  
  return (
    <TooltipProvider>
      <div className={`space-y-3 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 sl-text-muted" />
            <span className="text-sm font-medium sl-text-primary">
              Transpose
            </span>
            {!compact && (
              <Badge 
                variant="outline" 
                className={`text-xs ${getKeyColor(value)}`}
              >
                {value === 0 ? 'Original' : `${value > 0 ? '+' : ''}${value}`}
              </Badge>
            )}
          </div>
          
          {compact && (
            <Badge 
              variant="outline" 
              className={`text-xs ${getKeyColor(value)}`}
            >
              {value === 0 ? 'Original' : `${value > 0 ? '+' : ''}${value}`}
            </Badge>
          )}
        </div>
        
        {/* Slider Container */}
        <div className="relative">
          {/* Slider Track Labels */}
          {!compact && (
            <div className="flex justify-between text-xs sl-text-muted mb-2">
              <span>-6</span>
              <span>-3</span>
              <span className="font-medium">0</span>
              <span>+3</span>
              <span>+6</span>
            </div>
          )}
          
          {/* Main Slider */}
          <div 
            ref={sliderRef}
            className="relative px-2"
            onClick={handleSliderClick}
          >
            <Slider
              value={[value]}
              onValueChange={handleSliderChange}
              min={-6}
              max={6}
              step={1}
              disabled={disabled}
              className="w-full"
            />
            
            {/* Center Marker */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-slate-300 dark:bg-slate-600 rounded-full pointer-events-none"
              initial={{ opacity: 0.3 }}
              animate={{ 
                opacity: value === 0 ? 0.8 : 0.3,
                scale: value === 0 ? 1.2 : 1,
              }}
              transition={{ duration: 0.2 }}
            />
          </div>
          
          {/* Semitone Indicators */}
          {!compact && (
            <div className="flex justify-between mt-1">
              {[-6, -3, 0, 3, 6].map((semitone) => (
                <motion.div
                  key={semitone}
                  className={`w-1 h-1 rounded-full transition-colors ${
                    value === semitone 
                      ? 'bg-orange-500' 
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                  animate={{
                    scale: value === semitone ? 1.5 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Current Value Display */}
        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs sl-text-muted cursor-help">
                {SEMITONE_LABELS[value.toString() as keyof typeof SEMITONE_LABELS]}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <div className="font-medium">Double-click slider to reset</div>
                <div className="text-xs opacity-75 mt-1">
                  Use arrow keys for fine control
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
          
          {value !== 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onReset}
                  className="h-6 px-2 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset to original key</TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {/* Quick Transpose Buttons (Compact Mode) */}
        {compact && value !== 0 && (
          <div className="flex items-center gap-1 justify-center">
            {[-2, -1, 0, 1, 2].map((semitone) => (
              <Button
                key={semitone}
                size="sm"
                variant={value === semitone ? "default" : "outline"}
                onClick={() => onChange(semitone)}
                className="h-6 w-8 p-0 text-xs"
                disabled={disabled}
              >
                {semitone === 0 ? '0' : `${semitone > 0 ? '+' : ''}${semitone}`}
              </Button>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default TranspositionSlider;