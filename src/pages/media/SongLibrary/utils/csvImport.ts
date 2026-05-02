/**
 * CSV Import Utility for Song Library
 * Handles bulk song data import with validation
 */

import Papa from 'papaparse';
import type { Song, ImportResult, ImportError, CSVImportConfig } from '@/types/song-library';

export interface CSVRow {
  title?: string;
  artist?: string;
  lyrics?: string;
  chords?: string;
  key?: string;
  bpm?: string;
  time_signature?: string;
  tags?: string;
  duration_seconds?: string;
  video_url?: string;
  [key: string]: string | undefined;
}

const DEFAULT_CONFIG: CSVImportConfig = {
  delimiter: ',',
  hasHeader: true,
  fieldMapping: {
    'title': 'title',
    'artist': 'artist',
    'lyrics': 'lyrics',
    'chords': 'chords',
    'key': 'key',
    'bpm': 'bpm',
    'time_signature': 'time_signature',
    'tags': 'tags',
    'duration_seconds': 'duration_seconds',
    'video_url': 'video_url',
  },
  validation: {
    required: ['title'],
    optional: ['artist', 'lyrics', 'chords', 'key', 'bpm', 'time_signature', 'tags', 'duration_seconds', 'video_url'],
  },
};

/**
 * Parse CSV file and convert to Song objects
 */
export async function parseCSVFile(
  file: File,
  tenantId: string,
  config: Partial<CSVImportConfig> = {}
): Promise<ImportResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: ImportError[] = [];
  const songs: Partial<Song>[] = [];

  return new Promise((resolve) => {
    Papa.parse<CSVRow>(file, {
      header: mergedConfig.hasHeader,
      delimiter: mergedConfig.delimiter,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => {
        results.data.forEach((row, index) => {
          const rowNumber = index + (mergedConfig.hasHeader ? 2 : 1); // Account for header row
          
          // Validate required fields
          const validationErrors = validateRow(row, rowNumber, mergedConfig);
          if (validationErrors.length > 0) {
            errors.push(...validationErrors);
            return;
          }

          // Convert row to Song object
          try {
            const song = convertRowToSong(row, tenantId, mergedConfig);
            songs.push(song);
          } catch (error) {
            errors.push({
              row: rowNumber,
              field: 'general',
              value: row,
              message: error instanceof Error ? error.message : 'Failed to convert row to song',
            });
          }
        });

        resolve({
          success: errors.length === 0,
          imported: songs.length,
          failed: errors.length,
          errors,
          songs: songs as Song[],
        });
      },
      error: (error) => {
        resolve({
          success: false,
          imported: 0,
          failed: 1,
          errors: [{
            row: 0,
            field: 'file',
            value: file.name,
            message: `Failed to parse CSV: ${error.message}`,
          }],
          songs: [],
        });
      },
    });
  });
}

/**
 * Validate a CSV row
 */
function validateRow(
  row: CSVRow,
  rowNumber: number,
  config: CSVImportConfig
): ImportError[] {
  const errors: ImportError[] = [];

  // Check required fields
  config.validation.required.forEach((field) => {
    const mappedField = config.fieldMapping[field] || field;
    const value = row[mappedField];
    
    if (!value || value.trim() === '') {
      errors.push({
        row: rowNumber,
        field: mappedField,
        value: value || '',
        message: `Required field '${field}' is missing or empty`,
      });
    }
  });

  // Validate BPM if present
  if (row.bpm) {
    const bpm = parseInt(row.bpm, 10);
    if (isNaN(bpm) || bpm < 20 || bpm > 300) {
      errors.push({
        row: rowNumber,
        field: 'bpm',
        value: row.bpm,
        message: 'BPM must be a number between 20 and 300',
      });
    }
  }

  // Validate duration if present
  if (row.duration_seconds) {
    const duration = parseInt(row.duration_seconds, 10);
    if (isNaN(duration) || duration < 0) {
      errors.push({
        row: rowNumber,
        field: 'duration_seconds',
        value: row.duration_seconds,
        message: 'Duration must be a positive number',
      });
    }
  }

  // Validate video URL if present
  if (row.video_url && !isValidUrl(row.video_url)) {
    errors.push({
      row: rowNumber,
      field: 'video_url',
      value: row.video_url,
      message: 'Invalid video URL format',
    });
  }

  return errors;
}

/**
 * Convert CSV row to Song object
 */
function convertRowToSong(
  row: CSVRow,
  tenantId: string,
  config: CSVImportConfig
): Partial<Song> {
  const now = new Date().toISOString();

  return {
    tenant_id: tenantId,
    title: row.title?.trim() || '',
    artist: row.artist?.trim() || undefined,
    lyrics: row.lyrics?.trim() || undefined,
    chords: row.chords?.trim() || undefined,
    key: row.key?.trim()?.toUpperCase() || undefined,
    bpm: row.bpm ? parseInt(row.bpm, 10) : undefined,
    time_signature: row.time_signature?.trim() || undefined,
    tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    duration_seconds: row.duration_seconds ? parseInt(row.duration_seconds, 10) : undefined,
    video_url: row.video_url?.trim() || undefined,
    usage_count: 0,
    is_trending: false,
    custom_fields: {},
    created_at: now,
    updated_at: now,
  };
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate CSV template for download
 */
export function generateCSVTemplate(): string {
  const headers = [
    'title',
    'artist',
    'lyrics',
    'chords',
    'key',
    'bpm',
    'time_signature',
    'tags',
    'duration_seconds',
    'video_url',
  ];

  const exampleRow = [
    'Amazing Grace',
    'John Newton',
    'Amazing grace how sweet the sound...',
    'G C G D',
    'G',
    '80',
    '3/4',
    'hymn, traditional, worship',
    '240',
    'https://youtube.com/watch?v=example',
  ];

  return Papa.unparse({
    fields: headers,
    data: [exampleRow],
  });
}

/**
 * Export songs to CSV format
 */
export function exportSongsToCSV(songs: Song[]): string {
  const data = songs.map(song => ({
    title: song.title,
    artist: song.artist || '',
    lyrics: song.lyrics || '',
    chords: song.chords || '',
    key: song.key || '',
    bpm: song.bpm || '',
    time_signature: song.time_signature || '',
    tags: song.tags.join(', '),
    duration_seconds: song.duration_seconds || '',
    video_url: song.video_url || '',
    usage_count: song.usage_count,
    last_played_at: song.last_played_at || '',
    created_at: song.created_at,
  }));

  return Papa.unparse(data);
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
