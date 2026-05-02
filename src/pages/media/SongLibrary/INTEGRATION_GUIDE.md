# Import/Export Integration Guide

Quick guide to integrate import/export functionality into the Song Library.

## Step 1: Add to Main Song Library Component

```tsx
// src/pages/media/SongLibrary/index.tsx

import { ImportExportActions } from './components/ImportExport';

export function SongLibrary() {
  const { songs, selectedSongs } = useSongs();
  const { activeSetlist } = useSetlists();

  return (
    <div className="song-library">
      {/* Header with Import/Export */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Song Library</h1>
          <p className="text-sm text-slate-500">
            {songs.length} songs
          </p>
        </div>

        <ImportExportActions
          selectedSongs={selectedSongs}
          allSongs={songs}
          activeSetlist={activeSetlist}
          variant="toolbar"
          showLabels={true}
        />
      </div>

      {/* Rest of your component */}
    </div>
  );
}
```

## Step 2: Add to Setlist Builder

```tsx
// src/pages/media/SongLibrary/components/SetlistBuilder/index.tsx

import { ExportDialog } from '../ImportExport';

export function SetlistBuilder({ setlist }: SetlistBuilderProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <div className="setlist-builder">
      <div className="flex items-center justify-between mb-4">
        <h2>{setlist.name}</h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExportOpen(true)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Setlist content */}

      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        setlist={setlist}
        mode="setlist"
      />
    </div>
  );
}
```

## Step 3: Add to Song Grid/List Actions

```tsx
// src/pages/media/SongLibrary/components/SongGrid/index.tsx

import { ExportDialog } from '../ImportExport';

export function SongGrid({ songs, selectedSongs }: SongGridProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <div>
      {/* Selection toolbar */}
      {selectedSongs.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedSongs.length} selected
            </span>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExportOpen(true)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Selected
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Grid content */}

      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        songs={selectedSongs}
        mode="songs"
      />
    </div>
  );
}
```

## Step 4: Add Keyboard Shortcuts (Optional)

```tsx
// src/pages/media/SongLibrary/index.tsx

import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';

export function SongLibrary() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Ctrl/Cmd + I for Import
  useKeyboardShortcut(['ctrl+i', 'meta+i'], () => {
    setIsImportOpen(true);
  });

  // Ctrl/Cmd + E for Export
  useKeyboardShortcut(['ctrl+e', 'meta+e'], () => {
    setIsExportOpen(true);
  });

  return (
    <div>
      {/* Your component */}
      
      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
      
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        songs={songs}
        mode="songs"
      />
    </div>
  );
}
```

## Step 5: Add to Context Menu (Optional)

```tsx
// src/pages/media/SongLibrary/components/SongCard/index.tsx

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { exportSongToChordPro, downloadChordPro } from '../../utils/chordProImport';

export function SongCard({ song }: SongCardProps) {
  const handleExportChordPro = () => {
    const chordpro = exportSongToChordPro(song);
    downloadChordPro(chordpro, song.title);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        {/* Song card content */}
      </ContextMenuTrigger>
      
      <ContextMenuContent>
        <ContextMenuItem onClick={handleExportChordPro}>
          <FileText className="h-4 w-4 mr-2" />
          Export as ChordPro
        </ContextMenuItem>
        {/* Other menu items */}
      </ContextMenuContent>
    </ContextMenu>
  );
}
```

## Step 6: Add to Empty State

```tsx
// src/pages/media/SongLibrary/components/EmptyState.tsx

import { ImportDialog } from '../ImportExport';

export function EmptyState() {
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Music className="h-16 w-16 text-slate-300 mb-4" />
      <h3 className="text-lg font-semibold text-slate-700 mb-2">
        No songs yet
      </h3>
      <p className="text-sm text-slate-500 mb-6">
        Get started by adding your first song or importing from a file
      </p>
      
      <div className="flex gap-3">
        <Button onClick={() => setIsImportOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import Songs
        </Button>
        
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Song
        </Button>
      </div>

      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </div>
  );
}
```

## Styling Customization

### Match Your Theme

```tsx
// Custom button styling
<ImportExportActions
  className="custom-toolbar"
  // ... other props
/>

// In your CSS
.custom-toolbar button {
  /* Your custom styles */
}
```

### Variant Selection

```tsx
// Toolbar variant (default)
<ImportExportActions variant="toolbar" />

// Menu variant (compact)
<ImportExportActions variant="menu" />

// Split variant (separate dropdowns)
<ImportExportActions variant="split" />
```

## Testing Integration

```tsx
// Test import functionality
describe('Import Integration', () => {
  it('opens import dialog from toolbar', () => {
    render(<SongLibrary />);
    const importButton = screen.getByText('Import');
    fireEvent.click(importButton);
    expect(screen.getByText('Import Songs')).toBeInTheDocument();
  });
});

// Test export functionality
describe('Export Integration', () => {
  it('exports selected songs', async () => {
    const songs = [mockSong1, mockSong2];
    render(<SongLibrary songs={songs} selectedSongs={songs} />);
    
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    const exportSelected = screen.getByText(/Export Selected/);
    fireEvent.click(exportSelected);
    
    // Verify export dialog opens
    expect(screen.getByText('Export Songs')).toBeInTheDocument();
  });
});
```

## Common Issues & Solutions

### Issue: Import dialog not opening
**Solution:** Ensure state is properly managed and dialog component is rendered

### Issue: Export downloads not working
**Solution:** Check browser popup blocker settings

### Issue: PDF generation fails
**Solution:** Ensure jsPDF is properly installed and imported

### Issue: CSV parsing errors
**Solution:** Verify CSV format matches template structure

## Performance Tips

1. **Lazy load dialogs:**
```tsx
const ImportDialog = lazy(() => import('./components/ImportExport/ImportDialog'));
```

2. **Debounce file selection:**
```tsx
const debouncedFileSelect = useMemo(
  () => debounce(handleFileSelect, 300),
  []
);
```

3. **Optimize large exports:**
```tsx
// Export in chunks for large datasets
const exportInChunks = async (songs: Song[], chunkSize = 100) => {
  for (let i = 0; i < songs.length; i += chunkSize) {
    const chunk = songs.slice(i, i + chunkSize);
    await exportChunk(chunk);
  }
};
```

## Accessibility

Ensure keyboard navigation works:

```tsx
// Add aria labels
<Button aria-label="Import songs from file">
  Import
</Button>

// Add keyboard shortcuts
useKeyboardShortcut(['ctrl+i'], openImport);
useKeyboardShortcut(['ctrl+e'], openExport);

// Announce actions to screen readers
<div role="status" aria-live="polite">
  {importResult && `Imported ${importResult.imported} songs`}
</div>
```

## Complete Example

See `src/pages/media/SongLibrary/components/ImportExport/README.md` for complete usage examples and API documentation.
