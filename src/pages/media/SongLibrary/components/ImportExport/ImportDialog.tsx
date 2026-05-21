/**
 * Import Dialog Component
 * Handles CSV and ChordPro file imports with validation
 */

import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChurch } from '@/contexts/ChurchContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ImportResult, Song } from '@/types/song-library';
import { parseCSVFile, generateCSVTemplate, downloadCSV } from '../../utils/csvImport';
import { parseChordProFile, parseMultipleChordProFiles } from '../../utils/chordProImport';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportType = 'csv' | 'chordpro';

export function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const church = useChurch();
  const queryClient = useQueryClient();
  
  const [importType, setImportType] = useState<ImportType>('csv');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Mutation to save imported songs
  const saveSongsMutation = useMutation({
    mutationFn: async (songs: Partial<Song>[]) => {
      const { data, error } = await supabase
        .from('songs')
        .insert(songs)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs', church?.id] });
      toast.success('Songs imported successfully!');
    },
    onError: (error) => {
      console.error('Failed to save songs:', error);
      toast.error('Failed to save imported songs');
    },
  });

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    setImportResult(null);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles(files);
    setImportResult(null);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleImport = async () => {
    if (!church || selectedFiles.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      let result: ImportResult;

      if (importType === 'csv') {
        // CSV import (single file)
        result = await parseCSVFile(selectedFiles[0], church.tenantId);
      } else {
        // ChordPro import (multiple files)
        result = await parseMultipleChordProFiles(selectedFiles, church.tenantId);
      }

      setProgress(50);
      setImportResult(result);

      if (result.success && result.songs.length > 0) {
        // Save songs to database
        await saveSongsMutation.mutateAsync(result.songs);
        setProgress(100);
      } else {
        setProgress(100);
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Import failed. Please check your file format.');
      setImportResult({
        success: false,
        imported: 0,
        failed: 1,
        errors: [{
          row: 0,
          field: 'file',
          value: '',
          message: error instanceof Error ? error.message : 'Unknown error',
        }],
        songs: [],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    downloadCSV(template, 'song_import_template.csv');
    toast.success('Template downloaded');
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setImportResult(null);
    setProgress(0);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto font-jakarta">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Import Songs</DialogTitle>
          <DialogDescription>
            Import songs from CSV or ChordPro files
          </DialogDescription>
        </DialogHeader>

        <Tabs value={importType} onValueChange={(v) => setImportType(v as ImportType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv">CSV Import</TabsTrigger>
            <TabsTrigger value="chordpro">ChordPro Import</TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Import multiple songs from a CSV file. Download the template to see the required format.
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </TabsContent>

          <TabsContent value="chordpro" className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Import songs from ChordPro (.cho) files. You can select multiple files at once.
              </AlertDescription>
            </Alert>

            <div className="text-sm text-slate-600 space-y-2">
              <p className="font-semibold">ChordPro Format Example:</p>
              <pre className="bg-slate-100 p-3 rounded text-xs overflow-x-auto">
{`{title: Amazing Grace}
{artist: John Newton}
{key: G}
{tempo: 80}

[G]Amazing [C]grace how [G]sweet the [D]sound
That [G]saved a [C]wretch like [G]me`}
              </pre>
            </div>
          </TabsContent>
        </Tabs>

        {/* File Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-orange-500 transition-colors cursor-pointer"
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept={importType === 'csv' ? '.csv' : '.cho,.chordpro,.txt'}
            multiple={importType === 'chordpro'}
            onChange={handleFileSelect}
          />
          
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <p className="text-sm font-medium text-slate-700 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-slate-500">
              {importType === 'csv' 
                ? 'CSV file only' 
                : 'ChordPro files (.cho, .chordpro, .txt)'}
            </p>
          </label>
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Selected Files ({selectedFiles.length})
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-slate-50 p-2 rounded text-sm"
                >
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="text-xs text-slate-500 ml-2">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-center text-slate-600">
              {progress < 50 ? 'Parsing files...' : 'Saving to database...'}
            </p>
          </div>
        )}

        {/* Import Result */}
        <AnimatePresence>
          {importResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {importResult.success ? (
                <Alert className="border-emerald-200 bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-800">
                    Successfully imported {importResult.imported} song{importResult.imported !== 1 ? 's' : ''}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Import completed with {importResult.failed} error{importResult.failed !== 1 ? 's' : ''}
                    {importResult.imported > 0 && ` (${importResult.imported} songs imported successfully)`}
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Details */}
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <p className="text-sm font-semibold text-red-800 mb-2">
                    Errors ({importResult.errors.length})
                  </p>
                  <div className="space-y-2">
                    {importResult.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-xs text-red-700">
                        <span className="font-medium">Row {error.row}:</span> {error.message}
                        {error.field !== 'general' && error.field !== 'file' && (
                          <span className="text-red-600"> (Field: {error.field})</span>
                        )}
                      </div>
                    ))}
                    {importResult.errors.length > 10 && (
                      <p className="text-xs text-red-600 italic">
                        ... and {importResult.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {importResult ? (
            <>
              <Button variant="outline" onClick={handleReset}>
                Import More
              </Button>
              <Button onClick={handleClose}>
                Done
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedFiles.length === 0 || isProcessing}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isProcessing ? 'Importing...' : 'Import Songs'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
