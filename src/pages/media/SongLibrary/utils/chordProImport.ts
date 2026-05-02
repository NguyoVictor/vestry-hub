/**
 * ChordPro Import Utility for Song Library
 * Handles ChordPro format parsing and conversion
 */

import type { Song, ImportResult, ImportError, ChordProImportConfig } from '@/types/song-library';

interface ChordProMetadata {
  title?: string;
  artist?: string;
  key?: string;
  tempo?: number;
  time?: string;
  [key: string]: string | number | undefined;
}

const DEFAULT_CONFIG: ChordProImportConfig = {
  preserveFormatting: true,
  extractMetadata: true,
  defaultKey: undefined,
  defaultBpm: undefined,
};

/**
 * Parse ChordPro file and convert to Song object
 */
export async function parseChordProFile(
  file: File,
  tenantId: string,
  config: Partial<ChordProImportConfig> = {}
): Promise<ImportResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: ImportError[] = [];

  try {
    const content = await file.text();
    const song = parseChordProContent(content, tenantId, mergedConfig);
    
    // Validate the parsed song
    const validationErrors = validateSong(song);
    if (validationErrors.length > 0) {
      return {
        success: false,
        imported: 0,
        failed: 1,
        errors: validationErrors,
        songs: [],
      };
    }

    return {
      success: true,
      imported: 1,
      failed: 0,
      errors: [],
      songs: [song as Song],
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      failed: 1,
      errors: [{
        row: 0,
        field: 'file',
        value: file.name,
        message: error instanceof Error ? error.message : 'Failed to parse ChordPro file',
      }],
      songs: [],
    };
  }
}

/**
 * Parse ChordPro content string
 */
function parseChordProContent(
  content: string,
  tenantId: string,
  config: ChordProImportConfig
): Partial<Song> {
  const lines = content.split('\n');
  const metadata: ChordProMetadata = {};
  const lyricsLines: string[] = [];
  const chordsLines: string[] = [];
  
  let currentSection = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) {
      if (config.preserveFormatting) {
        lyricsLines.push('');
        chordsLines.push('');
      }
      continue;
    }
    
    // Parse directives (metadata)
    if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
      const directive = trimmedLine.slice(1, -1);
      parseDirective(directive, metadata);
      continue;
    }
    
    // Parse comment lines
    if (trimmedLine.startsWith('#')) {
      if (config.preserveFormatting) {
        lyricsLines.push(trimmedLine.slice(1).trim());
        chordsLines.push('');
      }
      continue;
    }
    
    // Parse chord and lyric lines
    const { lyrics, chords } = parseChordLine(trimmedLine);
    lyricsLines.push(lyrics);
    chordsLines.push(chords);
  }
  
  const now = new Date().toISOString();
  
  return {
    tenant_id: tenantId,
    title: metadata.title || 'Untitled',
    artist: metadata.artist,
    lyrics: lyricsLines.join('\n').trim(),
    chords: chordsLines.filter(Boolean).join('\n').trim(),
    key: metadata.key || config.defaultKey,
    bpm: metadata.tempo || config.defaultBpm,
    time_signature: metadata.time,
    tags: [],
    usage_count: 0,
    is_trending: false,
    custom_fields: {},
    created_at: now,
    updated_at: now,
  };
}

/**
 * Parse ChordPro directive
 */
function parseDirective(directive: string, metadata: ChordProMetadata): void {
  const colonIndex = directive.indexOf(':');
  if (colonIndex === -1) return;
  
  const key = directive.slice(0, colonIndex).trim().toLowerCase();
  const value = directive.slice(colonIndex + 1).trim();
  
  // Map common directives
  switch (key) {
    case 't':
    case 'title':
      metadata.title = value;
      break;
    case 'st':
    case 'subtitle':
    case 'artist':
      metadata.artist = value;
      break;
    case 'key':
      metadata.key = value.toUpperCase();
      break;
    case 'tempo':
      metadata.tempo = parseInt(value, 10);
      break;
    case 'time':
      metadata.time = value;
      break;
    default:
      metadata[key] = value;
  }
}

/**
 * Parse a line containing chords and lyrics
 * ChordPro format: [C]Amazing [G]grace how [Am]sweet the [F]sound
 */
function parseChordLine(line: string): { lyrics: string; chords: string } {
  const chordRegex = /\[([^\]]+)\]/g;
  const chords: string[] = [];
  let lyrics = line;
  let match;
  
  // Extract chords
  while ((match = chordRegex.exec(line)) !== null) {
    chords.push(match[1]);
  }
  
  // Remove chord markers from lyrics
  lyrics = line.replace(chordRegex, '').trim();
  
  return {
    lyrics,
    chords: chords.join(' '),
  };
}

/**
 * Validate parsed song
 */
function validateSong(song: Partial<Song>): ImportError[] {
  const errors: ImportError[] = [];
  
  if (!song.title || song.title.trim() === '' || song.title === 'Untitled') {
    errors.push({
      row: 0,
      field: 'title',
      value: song.title || '',
      message: 'Song title is required. Add {title: Song Name} directive.',
    });
  }
  
  if (song.bpm && (song.bpm < 20 || song.bpm > 300)) {
    errors.push({
      row: 0,
      field: 'bpm',
      value: song.bpm,
      message: 'BPM must be between 20 and 300',
    });
  }
  
  return errors;
}

/**
 * Export song to ChordPro format
 */
export function exportSongToChordPro(song: Song): string {
  const lines: string[] = [];
  
  // Add metadata directives
  lines.push(`{title: ${song.title}}`);
  if (song.artist) lines.push(`{artist: ${song.artist}}`);
  if (song.key) lines.push(`{key: ${song.key}}`);
  if (song.bpm) lines.push(`{tempo: ${song.bpm}}`);
  if (song.time_signature) lines.push(`{time: ${song.time_signature}}`);
  
  lines.push(''); // Empty line after metadata
  
  // Add lyrics with chords
  if (song.lyrics && song.chords) {
    const lyricsLines = song.lyrics.split('\n');
    const chordsLines = song.chords.split('\n');
    
    for (let i = 0; i < lyricsLines.length; i++) {
      const lyricLine = lyricsLines[i] || '';
      const chordLine = chordsLines[i] || '';
      
      if (chordLine) {
        // Insert chords inline with lyrics
        const chords = chordLine.split(/\s+/).filter(Boolean);
        let result = lyricLine;
        
        // Simple chord insertion (at the beginning of words)
        chords.forEach((chord, index) => {
          const words = result.split(/\s+/);
          if (words[index]) {
            words[index] = `[${chord}]${words[index]}`;
          } else {
            words.push(`[${chord}]`);
          }
          result = words.join(' ');
        });
        
        lines.push(result);
      } else {
        lines.push(lyricLine);
      }
    }
  } else if (song.lyrics) {
    lines.push(song.lyrics);
  }
  
  return lines.join('\n');
}

/**
 * Parse multiple ChordPro files
 */
export async function parseMultipleChordProFiles(
  files: File[],
  tenantId: string,
  config: Partial<ChordProImportConfig> = {}
): Promise<ImportResult> {
  const allSongs: Song[] = [];
  const allErrors: ImportError[] = [];
  let successCount = 0;
  let failCount = 0;
  
  for (const file of files) {
    const result = await parseChordProFile(file, tenantId, config);
    
    if (result.success) {
      allSongs.push(...result.songs);
      successCount++;
    } else {
      allErrors.push(...result.errors);
      failCount++;
    }
  }
  
  return {
    success: failCount === 0,
    imported: successCount,
    failed: failCount,
    errors: allErrors,
    songs: allSongs,
  };
}

/**
 * Download ChordPro file
 */
export function downloadChordPro(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.cho') ? filename : `${filename}.cho`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
