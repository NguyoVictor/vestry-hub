/**
 * Chord Transposition Tests
 * 
 * Tests for the chord parsing and transposition engine.
 * Validates complex chord handling, transposition accuracy, and format preservation.
 */

import { describe, it, expect } from 'vitest';
import {
  parseChord,
  transposeChord,
  transposeChordSheet,
  transposeKey,
  detectKey,
  isValidChord,
  extractChords,
  formatChord,
  getSemitoneDistance,
} from '../chordTransposition';

describe('Chord Parsing', () => {
  it('should parse basic major chords', () => {
    const result = parseChord('C');
    expect(result.isValid).toBe(true);
    expect(result.root).toBe('C');
    expect(result.quality).toBe('major');
    expect(result.extensions).toEqual([]);
  });

  it('should parse minor chords', () => {
    const result = parseChord('Am');
    expect(result.isValid).toBe(true);
    expect(result.root).toBe('A');
    expect(result.quality).toBe('minor');
  });

  it('should parse complex chords', () => {
    const result = parseChord('Cmaj7');
    expect(result.isValid).toBe(true);
    expect(result.root).toBe('C');
    // The extension should contain the full "maj7" string
    expect(result.extensions).toEqual(['maj7']);
  });

  it('should parse slash chords', () => {
    const result = parseChord('C/E');
    expect(result.isValid).toBe(true);
    expect(result.root).toBe('C');
    expect(result.bass).toBe('E');
  });

  it('should handle invalid chords', () => {
    const result = parseChord('X123');
    expect(result.isValid).toBe(false);
  });
});

describe('Chord Transposition', () => {
  it('should transpose basic chords correctly', () => {
    const result = transposeChord('C', 2);
    expect(result.success).toBe(true);
    expect(result.transposed).toBe('D');
    expect(result.semitones).toBe(2);
  });

  it('should transpose minor chords', () => {
    const result = transposeChord('Am', 3);
    expect(result.success).toBe(true);
    expect(result.transposed).toBe('Cm');
  });

  it('should transpose complex chords', () => {
    const result = transposeChord('Cmaj7', 2);
    expect(result.success).toBe(true);
    expect(result.transposed).toBe('Dmaj7');
  });

  it('should transpose slash chords', () => {
    const result = transposeChord('C/E', 2);
    expect(result.success).toBe(true);
    expect(result.transposed).toBe('D/F#');
  });

  it('should handle negative transposition', () => {
    const result = transposeChord('C', -2);
    expect(result.success).toBe(true);
    expect(result.transposed).toBe('Bb');
  });

  it('should reject out-of-range transposition', () => {
    const result = transposeChord('C', 8);
    expect(result.success).toBe(false);
    expect(result.error).toContain('between -6 and +6');
  });

  it('should return original for zero transposition', () => {
    const result = transposeChord('C', 0);
    expect(result.success).toBe(true);
    expect(result.transposed).toBe('C');
  });
});

describe('Chord Sheet Transposition', () => {
  it('should transpose all chords in a chord sheet', () => {
    const chordSheet = `
      C       Am      F       G
      Verse 1 lyrics here
      Dm      G       C       Am
      More lyrics
    `;
    
    const result = transposeChordSheet(chordSheet, 2);
    expect(result).toContain('D');
    expect(result).toContain('Bm');
    expect(result).toContain('G');
    expect(result).toContain('A');
    expect(result).toContain('Em');
  });

  it('should preserve formatting and spacing', () => {
    const chordSheet = 'C    Am    F    G';
    const result = transposeChordSheet(chordSheet, 2);
    
    // Should maintain relative spacing
    expect(result.indexOf('D')).toBe(0);
    expect(result).toMatch(/D\s+Bm\s+G\s+A/);
  });

  it('should handle mixed content (chords and lyrics)', () => {
    const chordSheet = `
      C              Am
      Amazing grace, how sweet the sound
      F              G              C
      That saved a wretch like me
    `;
    
    const result = transposeChordSheet(chordSheet, 2);
    expect(result).toContain('D');
    expect(result).toContain('Bm');
    expect(result).toContain('G');
    expect(result).toContain('A');
    expect(result).toContain('Amazing grace'); // Lyrics preserved
  });
});

describe('Key Detection and Transposition', () => {
  it('should detect major keys', () => {
    const chords = ['C', 'Am', 'F', 'G'];
    const key = detectKey(chords);
    expect(key).toBe('C');
  });

  it('should detect minor keys', () => {
    const chords = ['Am', 'F', 'C', 'G'];
    const key = detectKey(chords);
    expect(key).toBe('Am');
  });

  it('should transpose keys correctly', () => {
    const result = transposeKey('C', 2);
    expect(result.transposedKey).toBe('D');
    expect(result.semitones).toBe(2);
  });

  it('should transpose minor keys', () => {
    const result = transposeKey('Am', 3);
    expect(result.transposedKey).toBe('Cm');
  });

  it('should handle key signature information', () => {
    const result = transposeKey('C', 2); // C to D
    expect(result.keySignature.sharps).toBe(2); // D major has 2 sharps
    expect(result.keySignature.flats).toBe(0);
  });
});

describe('Chord Validation and Utilities', () => {
  it('should validate correct chords', () => {
    expect(isValidChord('C')).toBe(true);
    expect(isValidChord('Am')).toBe(true);
    expect(isValidChord('Cmaj7')).toBe(true);
    expect(isValidChord('C/E')).toBe(true);
  });

  it('should reject invalid chords', () => {
    expect(isValidChord('X')).toBe(false);
    expect(isValidChord('123')).toBe(false);
    expect(isValidChord('')).toBe(false);
  });

  it('should extract chords from text', () => {
    const text = 'C Am F G some lyrics Dm G7';
    const chords = extractChords(text);
    expect(chords).toContain('C');
    expect(chords).toContain('Am');
    expect(chords).toContain('F');
    expect(chords).toContain('G');
    expect(chords).toContain('Dm');
    expect(chords).toContain('G7');
    expect(chords).not.toContain('some');
    expect(chords).not.toContain('lyrics');
  });

  it('should format chords consistently', () => {
    expect(formatChord('C')).toBe('C');
    expect(formatChord('Db')).toBe('Db');
    expect(formatChord('C#')).toBe('C#');
  });

  it('should calculate semitone distances', () => {
    expect(getSemitoneDistance('C', 'D')).toBe(2);
    expect(getSemitoneDistance('C', 'G')).toBe(7);
    expect(getSemitoneDistance('G', 'C')).toBe(5); // Going up from G to C
  });
});

describe('Complex Chord Handling', () => {
  it('should handle suspended chords', () => {
    const result = transposeChord('Csus4', 2);
    expect(result.success).toBe(true);
    expect(result.transposed).toBe('Dsus4');
  });

  it('should handle added tone chords', () => {
    const result = transposeChord('Cadd9', 2);
    expect(result.success).toBe(true);
    expect(result.transposed).toBe('Dadd9');
  });

  it('should handle diminished chords', () => {
    const result = transposeChord('Cdim', 2);
    expect(result.success).toBe(true);
    expect(result.transposed).toBe('Ddim');
  });

  it('should handle augmented chords', () => {
    const result = transposeChord('Caug', 2);
    expect(result.success).toBe(true);
    expect(result.transposed).toBe('Daug');
  });

  it('should handle extended chords', () => {
    const result = transposeChord('C13', 2);
    expect(result.success).toBe(true);
    expect(result.transposed).toBe('D13');
  });

  it('should handle complex slash chords', () => {
    const result = transposeChord('Cmaj7/E', 2);
    expect(result.success).toBe(true);
    expect(result.transposed).toBe('Dmaj7/F#');
  });
});

describe('Edge Cases', () => {
  it('should handle empty input', () => {
    expect(parseChord('').isValid).toBe(false);
    expect(transposeChordSheet('', 2)).toBe('');
    expect(extractChords('')).toEqual([]);
  });

  it('should handle whitespace', () => {
    const result = parseChord('  C  ');
    expect(result.isValid).toBe(true);
    expect(result.root).toBe('C');
  });

  it('should handle case variations', () => {
    const result = parseChord('c');
    expect(result.isValid).toBe(true);
    expect(result.root).toBe('C');
  });

  it('should preserve original chord on transposition failure', () => {
    const result = transposeChord('InvalidChord', 2);
    expect(result.success).toBe(false);
    expect(result.transposed).toBe('InvalidChord');
  });
});