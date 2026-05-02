# Import/Export Components

Comprehensive import and export functionality for the Song Library, supporting CSV, ChordPro, and PDF formats.

## Features

### Import Capabilities

#### CSV Import
- **Bulk song import** from CSV files
- **Field validation** with detailed error reporting
- **Template download** for correct format
- **Automatic data type conversion** (BPM, duration, etc.)
- **Tag parsing** from comma-separated values
- **URL validation** for video links

**Supported Fields:**
- title (required)
- artist
- lyrics
- chords
- key
- bpm
- time_signature
- tags (comma-separated)
- duration_seconds
- video_url

#### ChordPro Import
- **Single or multiple file import**
- **Metadata extraction** from directives
- **Chord parsing** from inline notation
- **Format preservation** option
- **Automatic key detection**

**Supported Directives:**
- `{title: Song Name}`
- `{artist: Artist Name}`
- `{key: G}`
- `{tempo: 80}`
- `{time: 4/4}`

**Chord Format:**
```
[C]Amazing [G]grace how [Am]sweet the [F]sound
```

### Export Capabilities

#### CSV Export
- **Song data backup** with all metadata
- **Usage statistics** included
- **Spreadsheet-compatible** format
- **Batch export** for multiple songs

#### PDF Export (Setlists)
- **Professional formatting** for printing
- **Customizable options:**
  - Include/exclude chords
  - Include/exclude lyrics
  - Include/exclude notes
  - Include/exclude metadata
  - Cover page option
  - Page size (Letter/A4)
  - Orientation (Portrait/Landscape)
  - Font size adjustment
- **Key transition analysis** in summary
- **Service duration** calculation
- **Page numbers** and headers

#### ChordPro Export
- **Single song export** to ChordPro format
- **Metadata preservation**
- **Inline chord notation**
- **Compatible with chord chart software**

## Usage

### Import Dialog

```tsx
import { ImportDialog } from '@/pages/media/SongLibrary/components/ImportExport';

function MyComponent() {
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsImportOpen(true)}>
        Import Songs
      </Button>
      
      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </>
  );
}
```

### Export Dialog

```tsx
import { ExportDialog } from '@/pages/media/SongLibrary/components/ImportExport';

function MyComponent() {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const songs = [...]; // Your songs array
  const setlist = {...}; // Your setlist object

  return (
    <>
      {/* Export songs */}
      <Button onClick={() => setIsExportOpen(true)}>
        Export Songs
      </Button>
      
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        songs={songs}
        mode="songs"
      />

      {/* Export setlist */}
      <Button onClick={() => setIsExportOpen(true)}>
        Export Setlist
      </Button>
      
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        setlist={setlist}
        mode="setlist"
      />
    </>
  );
}
```

## Utility Functions

### CSV Import/Export

```tsx
import {
  parseCSVFile,
  exportSongsToCSV,
  generateCSVTemplate,
  downloadCSV,
} from '@/pages/media/SongLibrary/utils/csvImport';

// Parse CSV file
const result = await parseCSVFile(file, tenantId);
console.log(`Imported: ${result.imported}, Failed: ${result.failed}`);

// Export songs to CSV
const csv = exportSongsToCSV(songs);
downloadCSV(csv, 'songs_export.csv');

// Generate template
const template = generateCSVTemplate();
downloadCSV(template, 'template.csv');
```

### ChordPro Import/Export

```tsx
import {
  parseChordProFile,
  parseMultipleChordProFiles,
  exportSongToChordPro,
  downloadChordPro,
} from '@/pages/media/SongLibrary/utils/chordProImport';

// Parse single file
const result = await parseChordProFile(file, tenantId);

// Parse multiple files
const result = await parseMultipleChordProFiles(files, tenantId);

// Export song
const chordpro = exportSongToChordPro(song);
downloadChordPro(chordpro, song.title);
```

### PDF Export

```tsx
import {
  downloadSetlistPDF,
  generateSetlistPDFBlob,
  exportSetlistToPDF,
} from '@/pages/media/SongLibrary/utils/pdfExport';

// Download PDF with options
await downloadSetlistPDF(setlist, {
  includeChords: true,
  includeLyrics: false,
  includeNotes: true,
  pageSize: 'letter',
  orientation: 'portrait',
});

// Generate blob for custom handling
const blob = await generateSetlistPDFBlob(setlist, options);

// Export using browser print dialog
exportSetlistToPDF(setlist, options);
```

## Validation

### CSV Validation Rules

1. **Required Fields:**
   - `title` must be present and non-empty

2. **BPM Validation:**
   - Must be a number between 20 and 300

3. **Duration Validation:**
   - Must be a positive number (seconds)

4. **URL Validation:**
   - Must be a valid URL format

### ChordPro Validation Rules

1. **Title Required:**
   - Must have `{title: ...}` directive or non-empty title

2. **BPM Range:**
   - If present, must be between 20 and 300

3. **Chord Format:**
   - Chords must be enclosed in square brackets: `[C]`, `[Am7]`, etc.

## Error Handling

### Import Errors

The import system provides detailed error reporting:

```typescript
interface ImportError {
  row: number;        // Row number in file
  field: string;      // Field that caused error
  value: any;         // Invalid value
  message: string;    // Human-readable error message
}
```

### Error Display

- **Success:** Green alert with count of imported songs
- **Partial Success:** Warning with both success and error counts
- **Failure:** Red alert with detailed error list
- **Error Details:** Shows first 10 errors with row numbers and field names

## File Format Examples

### CSV Template

```csv
title,artist,lyrics,chords,key,bpm,time_signature,tags,duration_seconds,video_url
Amazing Grace,John Newton,Amazing grace how sweet the sound...,G C G D,G,80,3/4,"hymn, traditional, worship",240,https://youtube.com/watch?v=example
```

### ChordPro Format

```
{title: Amazing Grace}
{artist: John Newton}
{key: G}
{tempo: 80}
{time: 3/4}

[G]Amazing [C]grace how [G]sweet the [D]sound
That [G]saved a [C]wretch like [G]me
[G]I [C]once was [G]lost but [D]now am [Em]found
Was [G]blind but [D]now I [G]see
```

## Performance Considerations

1. **Large CSV Files:**
   - Parsed in chunks using PapaParse streaming
   - Progress indicator during processing
   - Memory-efficient handling

2. **Multiple ChordPro Files:**
   - Processed sequentially to avoid memory issues
   - Individual error handling per file
   - Batch database insertion

3. **PDF Generation:**
   - Lazy-loaded jsPDF library
   - Efficient page break handling
   - Optimized for large setlists

## Browser Compatibility

- **CSV Import/Export:** All modern browsers
- **ChordPro Import/Export:** All modern browsers
- **PDF Export:** Requires modern browser with Blob support
- **File Download:** Uses HTML5 download attribute

## Dependencies

- `papaparse`: CSV parsing and generation
- `jspdf`: PDF generation (lazy-loaded)
- `framer-motion`: Animations
- `sonner`: Toast notifications
- `@tanstack/react-query`: Data mutations

## Future Enhancements

- [ ] Excel (.xlsx) import/export
- [ ] MusicXML import for advanced notation
- [ ] Batch song editing after import
- [ ] Import preview before saving
- [ ] Custom field mapping for CSV
- [ ] PDF templates with church branding
- [ ] Cloud storage integration for backups
- [ ] Scheduled automatic exports
