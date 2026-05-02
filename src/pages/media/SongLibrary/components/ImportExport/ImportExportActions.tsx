/**
 * Import/Export Actions Component
 * Provides action buttons for import and export functionality
 * Can be integrated into the main Song Library toolbar
 */

import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImportDialog } from './ImportDialog';
import { ExportDialog } from './ExportDialog';
import type { Song, Setlist } from '@/types/song-library';

interface ImportExportActionsProps {
  // For song export
  selectedSongs?: Song[];
  allSongs?: Song[];
  
  // For setlist export
  activeSetlist?: Setlist;
  
  // UI customization
  variant?: 'toolbar' | 'menu' | 'split';
  showLabels?: boolean;
  className?: string;
}

export function ImportExportActions({
  selectedSongs = [],
  allSongs = [],
  activeSetlist,
  variant = 'toolbar',
  showLabels = true,
  className = '',
}: ImportExportActionsProps) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'songs' | 'setlist'>('songs');
  const [exportSongs, setExportSongs] = useState<Song[]>([]);

  const handleExportSelected = () => {
    setExportSongs(selectedSongs);
    setExportMode('songs');
    setIsExportOpen(true);
  };

  const handleExportAll = () => {
    setExportSongs(allSongs);
    setExportMode('songs');
    setIsExportOpen(true);
  };

  const handleExportSetlist = () => {
    setExportMode('setlist');
    setIsExportOpen(true);
  };

  // Toolbar variant - separate buttons
  if (variant === 'toolbar') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsImportOpen(true)}
          className="font-jakarta"
        >
          <Upload className="h-4 w-4 mr-2" />
          {showLabels && 'Import'}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="font-jakarta"
            >
              <Download className="h-4 w-4 mr-2" />
              {showLabels && 'Export'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {selectedSongs.length > 0 && (
              <>
                <DropdownMenuItem onClick={handleExportSelected}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Selected ({selectedSongs.length})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            
            <DropdownMenuItem onClick={handleExportAll}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export All Songs ({allSongs.length})
            </DropdownMenuItem>
            
            {activeSetlist && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportSetlist}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export Setlist (PDF)
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <ImportDialog
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
        />

        <ExportDialog
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          songs={exportSongs}
          setlist={activeSetlist}
          mode={exportMode}
        />
      </div>
    );
  }

  // Menu variant - single dropdown with all options
  if (variant === 'menu') {
    return (
      <div className={className}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="font-jakarta">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {showLabels && 'Import/Export'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Songs
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            {selectedSongs.length > 0 && (
              <DropdownMenuItem onClick={handleExportSelected}>
                <Download className="h-4 w-4 mr-2" />
                Export Selected ({selectedSongs.length})
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem onClick={handleExportAll}>
              <Download className="h-4 w-4 mr-2" />
              Export All Songs ({allSongs.length})
            </DropdownMenuItem>
            
            {activeSetlist && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportSetlist}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export Setlist (PDF)
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <ImportDialog
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
        />

        <ExportDialog
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          songs={exportSongs}
          setlist={activeSetlist}
          mode={exportMode}
        />
      </div>
    );
  }

  // Split variant - import and export as separate dropdowns
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="font-jakarta">
            <Upload className="h-4 w-4 mr-2" />
            {showLabels && 'Import'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import from CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Import from ChordPro
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="font-jakarta">
            <Download className="h-4 w-4 mr-2" />
            {showLabels && 'Export'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {selectedSongs.length > 0 && (
            <>
              <DropdownMenuItem onClick={handleExportSelected}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Selected ({selectedSongs.length})
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          <DropdownMenuItem onClick={handleExportAll}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export All Songs
          </DropdownMenuItem>
          
          {activeSetlist && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportSetlist}>
                <FileText className="h-4 w-4 mr-2" />
                Export Setlist (PDF)
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        songs={exportSongs}
        setlist={activeSetlist}
        mode={exportMode}
      />
    </div>
  );
}
