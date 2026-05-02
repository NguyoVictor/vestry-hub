/**
 * Chord Display Component
 * 
 * Shows original and transposed chords with formatting preservation.
 * Highlights changes and provides chord-by-chord comparison.
 * 
 * Requirements: 6.2, 6.3, 6.4
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

import { 
  extractChords, 
  parseChord, 
  getChordInfo,
  type ParsedChord 
} from '../../utils/chordTransposition';

export interface ChordDisplayProps {
  /** Original chord sheet */
  originalChords: string;
  /** Transposed chord sheet */
  transposedChords: string;
  /** Whether transposition is active */
  isActive: boolean;
  /** Maximum lines to display */
  maxLines?: number;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Whether to highlight changes */
  highlightChanges?: boolean;
  /** Custom class name */
  className?: string;
}

interface ChordLine {
  original: string;
  transposed: string;
  lineNumber: number;
  hasChords: boolean;
  chords: Array<{
    original: string;
    transposed: string;
    position: number;
    isChanged: boolean;
  }>;
}

/**
 * Parse chord sheet into lines with chord information
 */
function parseChordSheet(originalChords: string, transposedChords: string): ChordLine[] {
  const originalLines = originalChords.split('\n');
  const transposedLines = transposedChords.split('\n');
  
  return originalLines.map((originalLine, index) => {
    const transposedLine = transposedLines[index] || originalLine;
    
    // Extract chords from both lines
    const originalChordMatches = [...originalLine.matchAll(/\b([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|\d|\/)*(?:\/[A-G][#b]?)?)\b/g)];
    const transposedChordMatches = [...transposedLine.matchAll(/\b([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|\d|\/)*(?:\/[A-G][#b]?)?)\b/g)];
    
    const chords = originalChordMatches.map((match, chordIndex) => {
      const originalChord = match[1];
      const transposedMatch = transposedChordMatches[chordIndex];
      const transposedChord = transposedMatch ? transposedMatch[1] : originalChord;
      
      return {
        original: originalChord,
        transposed: transposedChord,
        position: match.index || 0,
        isChanged: originalChord !== transposedChord,
      };
    });
    
    return {
      original: originalLine,
      transposed: transposedLine,
      lineNumber: index + 1,
      hasChords: chords.length > 0,
      chords,
    };
  });
}

/**
 * Chord Display Component
 */
export function ChordDisplay({
  originalChords,
  transposedChords,
  isActive,
  maxLines,
  showLineNumbers = false,
  highlightChanges = true,
  className = '',
}: ChordDisplayProps) {
  const [showOriginal, setShowOriginal] = React.useState(false);
  const [copiedLine, setCopiedLine] = React.useState<number | null>(null);
  
  // Parse chord sheets
  const parsedLines = useMemo(() => {
    const lines = parseChordSheet(originalChords, transposedChords);
    return maxLines ? lines.slice(0, maxLines) : lines;
  }, [originalChords, transposedChords, maxLines]);
  
  // Get unique chords for analysis
  const chordAnalysis = useMemo(() => {
    const originalSet = new Set<string>();
    const transposedSet = new Set<string>();
    const changedChords: Array<{ original: string; transposed: string }> = [];
    
    parsedLines.forEach(line => {
      line.chords.forEach(chord => {
        originalSet.add(chord.original);
        transposedSet.add(chord.transposed);
        
        if (chord.isChanged) {
          changedChords.push({
            original: chord.original,
            transposed: chord.transposed,
          });
        }
      });
    });
    
    return {
      originalChords: Array.from(originalSet),
      transposedChords: Array.from(transposedSet),
      changedChords: changedChords.filter((chord, index, arr) => 
        arr.findIndex(c => c.original === chord.original && c.transposed === chord.transposed) === index
      ),
    };
  }, [parsedLines]);
  
  // Copy line to clipboard
  const copyLine = async (line: ChordLine, lineIndex: number) => {
    try {
      const textToCopy = showOriginal ? line.original : line.transposed;
      await navigator.clipboard.writeText(textToCopy);
      setCopiedLine(lineIndex);
      setTimeout(() => setCopiedLine(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };
  
  // Render chord with highlighting
  const renderChordInLine = (line: string, chords: ChordLine['chords'], isOriginal: boolean) => {
    if (chords.length === 0) return line;
    
    let result: React.ReactNode[] = [];
    let lastIndex = 0;
    
    chords.forEach((chord, index) => {
      const chordText = isOriginal ? chord.original : chord.transposed;
      const position = chord.position;
      
      // Add text before chord
      if (position > lastIndex) {
        result.push(line.slice(lastIndex, position));
      }
      
      // Add chord with highlighting
      result.push(
        <motion.span
          key={`chord-${index}`}
          className={cn(
            'inline-block px-1 py-0.5 rounded text-xs font-medium transition-colors',
            chord.isChanged && highlightChanges && !isOriginal
              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          )}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.1 }}
        >
          {chordText}
        </motion.span>
      );
      
      lastIndex = position + chord.original.length;
    });
    
    // Add remaining text
    if (lastIndex < line.length) {
      result.push(line.slice(lastIndex));
    }
    
    return result;
  };
  
  return (
    <TooltipProvider>
      <div className={`space-y-4 ${className}`}>
        {/* Header Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium sl-text-primary">
              {showOriginal ? 'Original Chords' : 'Transposed Chords'}
            </h4>
            {isActive && (
              <Badge variant="outline" className="text-xs">
                {chordAnalysis.changedChords.length} changed
              </Badge>
            )}
          </div>
          
          {isActive && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="h-7 px-2 text-xs"
                >
                  {showOriginal ? (
                    <>
                      <EyeOff className="h-3 w-3 mr-1" />
                      Show Transposed
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Show Original
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Toggle between original and transposed chords
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {/* Chord Sheet Display */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 font-mono text-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={showOriginal ? 'original' : 'transposed'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {parsedLines.map((line, index) => (
                <motion.div
                  key={`line-${index}`}
                  className="group flex items-start gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded px-2 py-1 -mx-2 transition-colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {/* Line Number */}
                  {showLineNumbers && (
                    <span className="text-xs sl-text-muted w-6 text-right shrink-0 mt-0.5">
                      {line.lineNumber}
                    </span>
                  )}
                  
                  {/* Line Content */}
                  <div className="flex-1 min-w-0">
                    {line.hasChords ? (
                      <div className="leading-relaxed">
                        {renderChordInLine(
                          showOriginal ? line.original : line.transposed,
                          line.chords,
                          showOriginal
                        )}
                      </div>
                    ) : (
                      <div className="sl-text-muted leading-relaxed">
                        {showOriginal ? line.original : line.transposed}
                      </div>
                    )}
                  </div>
                  
                  {/* Copy Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyLine(line, index)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copiedLine === index ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy line</TooltipContent>
                  </Tooltip>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
          
          {/* Truncation Indicator */}
          {maxLines && originalChords.split('\n').length > maxLines && (
            <div className="text-center mt-4 pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-xs sl-text-muted">
                Showing {maxLines} of {originalChords.split('\n').length} lines
              </span>
            </div>
          )}
        </div>
        
        {/* Chord Changes Summary */}
        {isActive && chordAnalysis.changedChords.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-medium sl-text-secondary uppercase tracking-wide">
              Chord Changes
            </h5>
            <div className="flex flex-wrap gap-2">
              {chordAnalysis.changedChords.slice(0, 8).map((change, index) => (
                <motion.div
                  key={`change-${index}`}
                  className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-1"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <span className="sl-text-muted">{change.original}</span>
                  <span className="sl-text-muted">→</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    {change.transposed}
                  </span>
                </motion.div>
              ))}
              {chordAnalysis.changedChords.length > 8 && (
                <Badge variant="outline" className="text-xs">
                  +{chordAnalysis.changedChords.length - 8} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default ChordDisplay;