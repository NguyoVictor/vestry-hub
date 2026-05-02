/**
 * Chord Transposition Utilities for Song Library UI Revamp
 * 
 * Provides comprehensive chord parsing, transposition, and music theory operations.
 * Handles complex chord notations and preserves formatting during transposition.
 * 
 * Features:
 * - Complex chord notation parsing (sus, add, maj7, etc.)
 * - Semitone-based transposition (-6 to +6)
 * - Format preservation during transposition
 * - Key signature detection and conversion
 * - Chord validation and error handling
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { 
  Chord, 
  Note, 
  Interval, 
  Key, 
  Scale,
  transpose as tonalTranspose,
  distance as tonalDistance 
} from 'tonal';

// Chord pattern regex for parsing complex chord notations
const CHORD_PATTERNS = {
  // Basic chord pattern: Root + Quality + Extensions + Bass
  FULL_CHORD: /^([A-G][#b]?)([^\/\s]*)?(?:\/([A-G][#b]?))?$/,
  
  // Chord line pattern: finds chords in lyrics/chord sheets
  CHORD_LINE: /\b([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|\d|\/)*(?:\/[A-G][#b]?)?)\b/g,
  
  // Word boundary pattern for precise chord matching
  CHORD_WORD: /^([A-G][#b]?)([^\/\s]*)?(?:\/([A-G][#b]?))?$/,
};

// Common chord quality mappings
const CHORD_QUALITIES = {
  // Major variations
  '': 'major',
  'M': 'major',
  'maj': 'major',
  'major': 'major',
  
  // Minor variations
  'm': 'minor',
  'min': 'minor',
  'minor': 'minor',
  '-': 'minor',
  
  // Diminished
  'dim': 'diminished',
  '°': 'diminished',
  'o': 'diminished',
  
  // Augmented
  'aug': 'augmented',
  '+': 'augmented',
  
  // Suspended
  'sus': 'suspended',
  'sus2': 'suspended2',
  'sus4': 'suspended4',
} as const;

// Extension patterns
const EXTENSION_PATTERNS = {
  SEVENTH: /7/,
  NINTH: /9/,
  ELEVENTH: /11/,
  THIRTEENTH: /13/,
  ADDED: /add(\d+)/,
  MAJOR_SEVENTH: /maj7|M7/,
  MINOR_SEVENTH: /m7/,
  DOMINANT_SEVENTH: /^7$|dom7/,
} as const;

export interface ParsedChord {
  /** Original chord string */
  original: string;
  /** Root note (e.g., 'C', 'F#') */
  root: string;
  /** Chord quality (major, minor, etc.) */
  quality: string;
  /** Extensions (7, 9, 11, 13, add9, etc.) */
  extensions: string[];
  /** Bass note if slash chord */
  bass?: string;
  /** Whether this is a valid chord */
  isValid: boolean;
  /** Tonal.js chord object */
  tonalChord?: any;
}

export interface TranspositionResult {
  /** Original chord */
  original: string;
  /** Transposed chord */
  transposed: string;
  /** Semitones transposed */
  semitones: number;
  /** Whether transposition was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

export interface KeyTransposition {
  /** Original key */
  originalKey: string;
  /** Transposed key */
  transposedKey: string;
  /** Semitones difference */
  semitones: number;
  /** Key signature information */
  keySignature: {
    sharps: number;
    flats: number;
    accidentals: string[];
  };
}

/**
 * Parse a chord string into its components
 */
export function parseChord(chordString: string): ParsedChord {
  const trimmed = chordString.trim();
  
  if (!trimmed) {
    return {
      original: chordString,
      root: '',
      quality: '',
      extensions: [],
      isValid: false,
    };
  }
  
  // Normalize case - capitalize first letter, lowercase the rest for root note
  const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  
  // Always use manual parsing first for better slash chord support
  const manualResult = parseChordManually(normalized, chordString);
  
  if (manualResult.isValid) {
    // Try to get Tonal chord for additional validation (but don't require it for slash chords)
    try {
      const rootChord = manualResult.bass ? manualResult.root + manualResult.extensions.join('') : normalized;
      const tonalChord = Chord.get(rootChord);
      
      return {
        ...manualResult,
        tonalChord: tonalChord.empty ? undefined : tonalChord,
      };
    } catch (error) {
      // If Tonal fails, still return the manual result
      return manualResult;
    }
  }
  
  // If manual parsing fails, try Tonal as fallback
  try {
    const tonalChord = Chord.get(normalized);
    
    if (!tonalChord.empty) {
      const match = normalized.match(CHORD_PATTERNS.FULL_CHORD);
      
      if (match) {
        const [, root, qualityAndExtensions = '', bass] = match;
        const { quality, extensions } = parseQualityAndExtensions(qualityAndExtensions);
        
        return {
          original: chordString,
          root: root,
          quality,
          extensions,
          bass,
          isValid: true,
          tonalChord,
        };
      }
    }
  } catch (error) {
    // Tonal parsing failed, return invalid result
  }
  
  return {
    original: chordString,
    root: '',
    quality: '',
    extensions: [],
    isValid: false,
  };
}

/**
 * Manual chord parsing for complex cases
 */
function parseChordManually(normalizedChord: string, originalChord?: string): ParsedChord {
  const match = normalizedChord.match(CHORD_PATTERNS.FULL_CHORD);
  
  if (!match) {
    return {
      original: originalChord || normalizedChord,
      root: '',
      quality: '',
      extensions: [],
      isValid: false,
    };
  }
  
  const [, root, qualityAndExtensions = '', bass] = match;
  
  // Validate root note (be more lenient for slash chords)
  const rootNote = Note.get(root);
  if (!rootNote.name && !rootNote.pc) {
    return {
      original: originalChord || normalizedChord,
      root: '',
      quality: '',
      extensions: [],
      isValid: false,
    };
  }
  
  // Validate bass note if present
  if (bass) {
    const bassNote = Note.get(bass);
    if (!bassNote.name && !bassNote.pc) {
      return {
        original: originalChord || normalizedChord,
        root: '',
        quality: '',
        extensions: [],
        isValid: false,
      };
    }
  }
  
  const { quality, extensions } = parseQualityAndExtensions(qualityAndExtensions);
  
  return {
    original: originalChord || normalizedChord,
    root: root,
    quality,
    extensions,
    bass,
    isValid: true,
  };
}

/**
 * Parse chord quality and extensions
 */
function parseQualityAndExtensions(qualityString: string): { quality: string; extensions: string[] } {
  if (!qualityString) {
    return { quality: 'major', extensions: [] };
  }
  
  const extensions: string[] = [];
  let quality = 'major';
  let remaining = qualityString.toLowerCase();
  
  // Handle major seventh and other major extensions specially
  if (remaining.startsWith('maj')) {
    quality = 'major';
    // Keep the entire "maj7", "maj9", etc. as one extension
    extensions.push(qualityString); // Use original case
    return { quality, extensions };
  }
  // Check for minor (but not maj)
  else if (remaining.startsWith('m')) {
    quality = 'minor';
    remaining = remaining.slice(1);
  }
  // Check for diminished
  else if (remaining.startsWith('dim') || remaining === '°' || remaining === 'o') {
    quality = 'diminished';
    remaining = remaining.replace(/^(dim|°|o)/, '');
  }
  // Check for augmented
  else if (remaining.startsWith('aug') || remaining === '+') {
    quality = 'augmented';
    remaining = remaining.replace(/^(aug|\+)/, '');
  }
  // Check for suspended
  else if (remaining.startsWith('sus')) {
    if (remaining.startsWith('sus2')) {
      quality = 'suspended2';
      remaining = remaining.slice(4);
    } else if (remaining.startsWith('sus4')) {
      quality = 'suspended4';
      remaining = remaining.slice(4);
    } else {
      quality = 'suspended';
      remaining = remaining.slice(3);
    }
  }
  
  // Add any remaining extensions
  if (remaining) {
    extensions.push(remaining);
  }
  
  return { quality, extensions };
}

/**
 * Transpose a single chord by semitones
 */
export function transposeChord(chordString: string, semitones: number): TranspositionResult {
  if (semitones === 0) {
    return {
      original: chordString,
      transposed: chordString,
      semitones: 0,
      success: true,
    };
  }
  
  // Validate semitone range
  if (semitones < -6 || semitones > 6) {
    return {
      original: chordString,
      transposed: chordString,
      semitones,
      success: false,
      error: 'Semitones must be between -6 and +6',
    };
  }
  
  const parsed = parseChord(chordString);
  
  if (!parsed.isValid || !parsed.root) {
    return {
      original: chordString,
      transposed: chordString,
      semitones,
      success: false,
      error: 'Invalid chord format',
    };
  }
  
  try {
    // Transpose root note
    const transposedRoot = tonalTranspose(parsed.root, Interval.fromSemitones(semitones));
    
    if (!transposedRoot) {
      throw new Error('Failed to transpose root note');
    }
    
    // Transpose bass note if present
    let transposedBass = '';
    if (parsed.bass) {
      transposedBass = tonalTranspose(parsed.bass, Interval.fromSemitones(semitones));
      if (!transposedBass) {
        throw new Error('Failed to transpose bass note');
      }
    }
    
    // Reconstruct chord
    let transposedChord = transposedRoot;
    
    // Add quality and extensions
    if (parsed.quality === 'minor') {
      transposedChord += 'm';
    } else if (parsed.quality === 'diminished') {
      transposedChord += 'dim';
    } else if (parsed.quality === 'augmented') {
      transposedChord += 'aug';
    } else if (parsed.quality === 'suspended') {
      transposedChord += 'sus';
    } else if (parsed.quality === 'suspended2') {
      transposedChord += 'sus2';
    } else if (parsed.quality === 'suspended4') {
      transposedChord += 'sus4';
    }
    
    // Add extensions (these may include quality markers like "maj7")
    if (parsed.extensions.length > 0) {
      parsed.extensions.forEach(ext => {
        // Don't add 'm' again if it's already part of the quality
        if (!(ext === 'm' && parsed.quality === 'minor')) {
          transposedChord += ext;
        }
      });
    }
    
    // Add bass note
    if (transposedBass) {
      transposedChord += `/${transposedBass}`;
    }
    
    return {
      original: chordString,
      transposed: transposedChord,
      semitones,
      success: true,
    };
  } catch (error) {
    return {
      original: chordString,
      transposed: chordString,
      semitones,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown transposition error',
    };
  }
}

/**
 * Transpose all chords in a chord sheet or lyrics
 */
export function transposeChordSheet(chordSheet: string, semitones: number): string {
  if (semitones === 0 || !chordSheet) {
    return chordSheet;
  }
  
  return chordSheet.replace(CHORD_PATTERNS.CHORD_LINE, (match) => {
    const result = transposeChord(match, semitones);
    return result.success ? result.transposed : match;
  });
}

/**
 * Detect the key of a song from its chords
 */
export function detectKey(chords: string[]): string | null {
  if (chords.length === 0) return null;
  
  // Parse all chords and extract root notes
  const rootNotes = chords
    .map(chord => parseChord(chord))
    .filter(parsed => parsed.isValid && parsed.root)
    .map(parsed => parsed.root);
  
  if (rootNotes.length === 0) return null;
  
  // Count frequency of each root note
  const noteFrequency = rootNotes.reduce((acc, note) => {
    const normalizedNote = Note.get(note).pc; // Get pitch class
    acc[normalizedNote] = (acc[normalizedNote] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Find most common root note (likely tonic)
  const mostCommonNote = Object.entries(noteFrequency)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  
  if (!mostCommonNote) return null;
  
  // Check for minor chord indicators
  const hasMinorChords = chords.some(chord => {
    const parsed = parseChord(chord);
    return parsed.isValid && parsed.quality === 'minor' && parsed.root === mostCommonNote;
  });
  
  // If the most common note appears as a minor chord, it's likely a minor key
  return hasMinorChords ? `${mostCommonNote}m` : mostCommonNote;
}

/**
 * Transpose a key signature
 */
export function transposeKey(key: string, semitones: number): KeyTransposition {
  if (semitones === 0) {
    return {
      originalKey: key,
      transposedKey: key,
      semitones: 0,
      keySignature: getKeySignature(key),
    };
  }
  
  try {
    // Parse key (handle both major and minor)
    const isMinor = key.toLowerCase().includes('m') && !key.toLowerCase().includes('maj');
    const rootNote = key.replace(/[^A-G#b]/g, '');
    
    // Transpose root note
    const transposedRoot = tonalTranspose(rootNote, Interval.fromSemitones(semitones));
    
    if (!transposedRoot) {
      throw new Error('Failed to transpose key');
    }
    
    const transposedKey = isMinor ? `${transposedRoot}m` : transposedRoot;
    
    return {
      originalKey: key,
      transposedKey,
      semitones,
      keySignature: getKeySignature(transposedKey),
    };
  } catch (error) {
    return {
      originalKey: key,
      transposedKey: key,
      semitones,
      keySignature: getKeySignature(key),
    };
  }
}

/**
 * Get key signature information
 */
function getKeySignature(key: string): KeyTransposition['keySignature'] {
  try {
    const isMinor = key.toLowerCase().includes('m') && !key.toLowerCase().includes('maj');
    const keyObj = isMinor ? Key.minorKey(key) : Key.majorKey(key);
    
    const sharps = keyObj.alteration > 0 ? keyObj.alteration : 0;
    const flats = keyObj.alteration < 0 ? Math.abs(keyObj.alteration) : 0;
    
    return {
      sharps,
      flats,
      accidentals: keyObj.scale,
    };
  } catch (error) {
    return {
      sharps: 0,
      flats: 0,
      accidentals: [],
    };
  }
}

/**
 * Validate chord notation
 */
export function isValidChord(chordString: string): boolean {
  const parsed = parseChord(chordString);
  return parsed.isValid;
}

/**
 * Get chord information for display
 */
export function getChordInfo(chordString: string) {
  const parsed = parseChord(chordString);
  
  if (!parsed.isValid) {
    return null;
  }
  
  const tonalChord = Chord.get(chordString);
  
  return {
    name: chordString,
    root: parsed.root,
    quality: parsed.quality,
    extensions: parsed.extensions,
    bass: parsed.bass,
    intervals: tonalChord.intervals || [],
    notes: tonalChord.notes || [],
    symbol: tonalChord.symbol || chordString,
  };
}

/**
 * Extract all chords from a chord sheet
 */
export function extractChords(chordSheet: string): string[] {
  if (!chordSheet) return [];
  
  const matches = chordSheet.match(CHORD_PATTERNS.CHORD_LINE);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Format chord for display (normalize enharmonics)
 */
export function formatChord(chordString: string, preferSharps = true): string {
  const parsed = parseChord(chordString);
  
  if (!parsed.isValid) return chordString;
  
  try {
    // Keep the original root note as-is for consistency
    let formatted = parsed.root;
    
    if (parsed.quality === 'minor') {
      formatted += 'm';
    } else if (parsed.quality === 'diminished') {
      formatted += 'dim';
    } else if (parsed.quality === 'augmented') {
      formatted += 'aug';
    } else if (parsed.quality === 'suspended') {
      formatted += 'sus';
    } else if (parsed.quality === 'suspended2') {
      formatted += 'sus2';
    } else if (parsed.quality === 'suspended4') {
      formatted += 'sus4';
    }
    
    if (parsed.extensions.length > 0) {
      formatted += parsed.extensions.join('');
    }
    
    if (parsed.bass) {
      formatted += `/${parsed.bass}`;
    }
    
    return formatted;
  } catch (error) {
    return chordString;
  }
}

/**
 * Get semitone distance between two notes
 */
export function getSemitoneDistance(fromNote: string, toNote: string): number {
  try {
    const distance = tonalDistance(fromNote, toNote);
    // Convert interval notation to semitones
    if (typeof distance === 'string') {
      const intervalMap: Record<string, number> = {
        '1P': 0, 'unison': 0,
        '2m': 1, 'minor 2nd': 1,
        '2M': 2, 'major 2nd': 2,
        '3m': 3, 'minor 3rd': 3,
        '3M': 4, 'major 3rd': 4,
        '4P': 5, 'perfect 4th': 5,
        '4A': 6, 'tritone': 6,
        '5P': 7, 'perfect 5th': 7,
        '6m': 8, 'minor 6th': 8,
        '6M': 9, 'major 6th': 9,
        '7m': 10, 'minor 7th': 10,
        '7M': 11, 'major 7th': 11,
        '8P': 12, 'octave': 12,
      };
      return intervalMap[distance] || 0;
    }
    return distance || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Common chord progressions for key detection
 */
export const COMMON_PROGRESSIONS = {
  MAJOR: {
    'I-V-vi-IV': [0, 7, 9, 5], // C-G-Am-F in C major
    'vi-IV-I-V': [9, 5, 0, 7], // Am-F-C-G in C major
    'I-vi-IV-V': [0, 9, 5, 7], // C-Am-F-G in C major
  },
  MINOR: {
    'i-VII-VI-VII': [0, 10, 8, 10], // Am-G-F-G in A minor
    'i-iv-VII-III': [0, 5, 10, 3], // Am-Dm-G-C in A minor
    'i-VI-III-VII': [0, 8, 3, 10], // Am-F-C-G in A minor
  },
} as const;

export default {
  parseChord,
  transposeChord,
  transposeChordSheet,
  transposeKey,
  detectKey,
  isValidChord,
  getChordInfo,
  extractChords,
  formatChord,
  getSemitoneDistance,
};