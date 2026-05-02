/**
 * Export Dialog Component
 * Handles CSV and PDF exports for songs and setlists
 */

import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { Song, Setlist } from '@/types/song-library';
import { exportSongsToCSV, downloadCSV } from '../../utils/csvImport';
import { exportSongToChordPro, downloadChordPro } from '../../utils/chordProImport';
import { downloadSetlistPDF, type PDFExportOptions } from '../../utils/pdfExport';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  songs?: Song[];
  setlist?: Setlist;
  mode: 'songs' | 'setlist';
}

export function ExportDialog({ isOpen, onClose, songs = [], setlist, mode }: ExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'chordpro'>('csv');
  
  // PDF export options
  const [pdfOptions, setPdfOptions] = useState<PDFExportOptions>({
    includeChords: true,
    includeLyrics: false,
    includeNotes: true,
    includeMetadata: true,
    pageSize: 'letter',
    orientation: 'portrait',
    fontSize: 12,
    includePageNumbers: true,
    includeCoverPage: true,
  });

  const handleExport = async () => {
    try {
      if (mode === 'songs') {
        // Export songs
        if (exportFormat === 'csv') {
          const csv = exportSongsToCSV(songs);
          downloadCSV(csv, `songs_export_${new Date().toISOString().split('T')[0]}.csv`);
          toast.success(`Exported ${songs.length} songs to CSV`);
        } else if (exportFormat === 'chordpro' && songs.length === 1) {
          const chordpro = exportSongToChordPro(songs[0]);
          downloadChordPro(chordpro, songs[0].title);
          toast.success('Exported song to ChordPro format');
        }
      } else if (mode === 'setlist' && setlist) {
        // Export setlist
        if (exportFormat === 'pdf') {
          await downloadSetlistPDF(setlist, pdfOptions);
          toast.success('Setlist exported to PDF');
        } else if (exportFormat === 'csv') {
          // Export setlist as CSV (song list)
          const setlistSongs = setlist.items
            .map(item => item.song)
            .filter((song): song is Song => song !== undefined);
          const csv = exportSongsToCSV(setlistSongs);
          downloadCSV(csv, `setlist_${setlist.name.replace(/[^a-z0-9]/gi, '_')}.csv`);
          toast.success('Setlist exported to CSV');
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    }
  };

  const updatePdfOption = <K extends keyof PDFExportOptions>(
    key: K,
    value: PDFExportOptions[K]
  ) => {
    setPdfOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl font-jakarta">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Export {mode === 'songs' ? 'Songs' : 'Setlist'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'songs' 
              ? `Export ${songs.length} song${songs.length !== 1 ? 's' : ''} to various formats`
              : `Export "${setlist?.name}" setlist`
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={exportFormat} onValueChange={(v) => setExportFormat(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="csv">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              CSV
            </TabsTrigger>
            <TabsTrigger value="pdf" disabled={mode === 'songs'}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="chordpro" disabled={mode === 'setlist' || songs.length !== 1}>
              <FileText className="h-4 w-4 mr-2" />
              ChordPro
            </TabsTrigger>
          </TabsList>

          {/* CSV Export */}
          <TabsContent value="csv" className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-700">
                Export data in CSV format for use in spreadsheet applications or backup purposes.
              </p>
              {mode === 'songs' && (
                <p className="text-xs text-slate-500 mt-2">
                  Includes: title, artist, lyrics, chords, key, BPM, time signature, tags, duration, and usage data
                </p>
              )}
            </div>
          </TabsContent>

          {/* PDF Export */}
          <TabsContent value="pdf" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Content Options</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-chords"
                      checked={pdfOptions.includeChords}
                      onCheckedChange={(checked) => updatePdfOption('includeChords', !!checked)}
                    />
                    <label
                      htmlFor="include-chords"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Include Chords
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-lyrics"
                      checked={pdfOptions.includeLyrics}
                      onCheckedChange={(checked) => updatePdfOption('includeLyrics', !!checked)}
                    />
                    <label
                      htmlFor="include-lyrics"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Include Lyrics
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-notes"
                      checked={pdfOptions.includeNotes}
                      onCheckedChange={(checked) => updatePdfOption('includeNotes', !!checked)}
                    />
                    <label
                      htmlFor="include-notes"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Include Notes
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-metadata"
                      checked={pdfOptions.includeMetadata}
                      onCheckedChange={(checked) => updatePdfOption('includeMetadata', !!checked)}
                    />
                    <label
                      htmlFor="include-metadata"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Include Metadata (Key, BPM, Duration)
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-cover"
                      checked={pdfOptions.includeCoverPage}
                      onCheckedChange={(checked) => updatePdfOption('includeCoverPage', !!checked)}
                    />
                    <label
                      htmlFor="include-cover"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Include Cover Page
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Page Settings</Label>
                
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">Page Size</Label>
                  <RadioGroup
                    value={pdfOptions.pageSize}
                    onValueChange={(value) => updatePdfOption('pageSize', value as 'a4' | 'letter')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="letter" id="letter" />
                      <Label htmlFor="letter" className="font-normal">Letter (8.5" × 11")</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="a4" id="a4" />
                      <Label htmlFor="a4" className="font-normal">A4 (210mm × 297mm)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">Orientation</Label>
                  <RadioGroup
                    value={pdfOptions.orientation}
                    onValueChange={(value) => updatePdfOption('orientation', value as 'portrait' | 'landscape')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="portrait" id="portrait" />
                      <Label htmlFor="portrait" className="font-normal">Portrait</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="landscape" id="landscape" />
                      <Label htmlFor="landscape" className="font-normal">Landscape</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ChordPro Export */}
          <TabsContent value="chordpro" className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-700 mb-3">
                Export song in ChordPro format for use with chord chart applications.
              </p>
              <p className="text-xs text-slate-500">
                ChordPro format is widely supported by music software and can be easily edited in any text editor.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
