/**
 * ImageUpload Component
 * 
 * Secure file upload component with validation, optimization, and WebP conversion.
 * Integrates with Supabase Storage for image management.
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileImage, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useChurch } from '@/contexts/ChurchContext';
import { useSubscription } from '@/hooks/useSubscription';
import { showPaywallToast } from '@/components/PaywallToast';
import { TABLES } from '@/lib/schema';

import { validateImageFile, optimizeImage, generateImageSizes } from './utils/imageProcessing';
import { ColorExtractor } from './ColorExtractor';
import type { ImageUploadProps, CoverArtUploadResult, UploadProgress, FileValidationResult } from './types';
import type { CoverArtColors } from '@/types/song-library';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function ImageUpload({
  songId,
  onUploadSuccess,
  onUploadError,
  onUploadProgress,
  maxFileSize = MAX_FILE_SIZE,
  acceptedTypes = ACCEPTED_TYPES,
  disabled = false,
  className,
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<CoverArtColors | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tenantId } = useChurch();
  const { limits, usage } = useSubscription();

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    setValidationError(null);
    setPreviewUrl(null);
    setExtractedColors(null);

    // Pre-upload storage check
    const fileSizeGB = file.size / (1024 * 1024 * 1024);
    if ((usage.storage_gb + fileSizeGB) > limits.storage_gb) {
      showPaywallToast('storage', 'storage');
      return;
    }

    // Validate file
    const validation = await validateImageFile(file, maxFileSize, acceptedTypes);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid file');
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    // Start upload process
    await uploadImage(file);
  }, [maxFileSize, acceptedTypes, songId, tenantId, limits, usage]);

  // Upload image to Supabase Storage
  const uploadImage = useCallback(async (file: File) => {
    try {
      setUploadProgress({
        loaded: 0,
        total: 100,
        percentage: 0,
        stage: 'validating'
      });

      // Generate unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const fileName = `${songId}-${timestamp}`;
      
      // Update progress
      setUploadProgress(prev => prev ? { ...prev, percentage: 10, stage: 'optimizing' } : null);
      onUploadProgress?.(10);

      // Optimize and convert to WebP
      const optimizedFile = await optimizeImage(file, {
        quality: 85,
        format: 'webp',
        sizes: [64, 128, 256, 512], // thumbnail, small, medium, large
        progressive: true
      });

      setUploadProgress(prev => prev ? { ...prev, percentage: 30, stage: 'uploading' } : null);
      onUploadProgress?.(30);

      // Upload original optimized image
      const originalPath = `${tenantId}/originals/${fileName}.webp`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('song-cover-art')
        .upload(originalPath, optimizedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setUploadProgress(prev => prev ? { ...prev, percentage: 60, stage: 'optimizing' } : null);
      onUploadProgress?.(60);

      // Generate multiple sizes
      const sizes = await generateImageSizes(optimizedFile, [64, 128, 256, 512]);
      const sizeUrls: Record<string, string> = {};

      // Upload each size
      for (const [size, blob] of Object.entries(sizes)) {
        const sizePath = `${tenantId}/sizes/${fileName}-${size}.webp`;
        const { error: sizeUploadError } = await supabase.storage
          .from('song-cover-art')
          .upload(sizePath, blob, {
            cacheControl: '3600',
            upsert: false
          });

        if (sizeUploadError) {
          console.warn(`Failed to upload ${size}px version:`, sizeUploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('song-cover-art')
            .getPublicUrl(sizePath);
          sizeUrls[size] = urlData.publicUrl;
        }
      }

      setUploadProgress(prev => prev ? { ...prev, percentage: 80, stage: 'extracting-colors' } : null);
      onUploadProgress?.(80);

      // Get public URL for original
      const { data: originalUrlData } = supabase.storage
        .from('song-cover-art')
        .getPublicUrl(originalPath);

      // Wait for color extraction if available
      let colors: CoverArtColors = {
        primary: '#f97316',
        secondary: '#ea580c',
        accent: '#fb923c',
        dominant: ['#f97316', '#ea580c', '#fb923c']
      };

      if (extractedColors) {
        colors = extractedColors;
      }

      setUploadProgress(prev => prev ? { ...prev, percentage: 100, stage: 'complete' } : null);
      onUploadProgress?.(100);

      // Create result object
      const result: CoverArtUploadResult = {
        originalUrl: originalUrlData.publicUrl,
        optimizedSizes: {
          thumbnail: sizeUrls['64'] || originalUrlData.publicUrl,
          small: sizeUrls['128'] || originalUrlData.publicUrl,
          medium: sizeUrls['256'] || originalUrlData.publicUrl,
          large: sizeUrls['512'] || originalUrlData.publicUrl,
        },
        colors,
        fileSize: optimizedFile.size,
        dimensions: {
          width: 512, // Will be updated by image processing
          height: 512
        }
      };

      // Post-upload increment storage
      const fileSizeGB = optimizedFile.size / (1024 * 1024 * 1024);
      await supabase
        .from(TABLES.TENANT_SUBSCRIPTIONS)
        .update({ storage_used_gb: usage.storage_gb + fileSizeGB })
        .eq('tenant_id', tenantId);

      // Clean up preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      onUploadSuccess(result);
      setUploadProgress(null);

    } catch (error) {
      console.error('Upload error:', error);
      onUploadError(error instanceof Error ? error : new Error('Upload failed'));
      setUploadProgress(null);
      
      // Clean up preview on error
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  }, [songId, tenantId, onUploadSuccess, onUploadError, onUploadProgress, previewUrl, extractedColors]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [disabled, handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle colors extracted from preview
  const handleColorsExtracted = useCallback((colors: CoverArtColors) => {
    setExtractedColors(colors);
  }, []);

  const isUploading = uploadProgress !== null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <motion.div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragOver 
            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' 
            : 'border-slate-300 dark:border-slate-600',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer hover:border-orange-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        whileHover={!disabled ? { scale: 1.01 } : undefined}
        whileTap={!disabled ? { scale: 0.99 } : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        {isUploading ? (
          <div className="space-y-3">
            <div className="w-12 h-12 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
            <div>
              <p className="text-sm font-medium sl-text-primary">
                {uploadProgress?.stage === 'validating' && 'Validating file...'}
                {uploadProgress?.stage === 'optimizing' && 'Optimizing image...'}
                {uploadProgress?.stage === 'uploading' && 'Uploading to storage...'}
                {uploadProgress?.stage === 'extracting-colors' && 'Extracting colors...'}
                {uploadProgress?.stage === 'complete' && 'Complete!'}
              </p>
              <Progress value={uploadProgress?.percentage || 0} className="mt-2" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <FileImage className="w-12 h-12 mx-auto sl-text-muted" />
            <div>
              <p className="text-sm font-medium sl-text-primary">
                Drop an image here or click to browse
              </p>
              <p className="text-xs sl-text-muted mt-1">
                Supports JPEG, PNG, WebP, GIF up to {Math.round(maxFileSize / 1024 / 1024)}MB
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Validation Error */}
      {validationError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{validationError}</p>
        </motion.div>
      )}

      {/* Preview */}
      {previewUrl && !isUploading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-medium sl-text-primary">Preview</p>
          </div>
          
          <div className="relative w-32 h-32 mx-auto">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover rounded-lg border border-slate-200 dark:border-slate-700"
            />
            
            {/* Color Extractor */}
            <ColorExtractor
              imageUrl={previewUrl}
              onColorsExtracted={handleColorsExtracted}
              onError={(error) => console.warn('Preview color extraction failed:', error)}
            />
          </div>

          {/* Extracted Colors Preview */}
          {extractedColors && (
            <div className="flex justify-center gap-2">
              {extractedColors.dominant.slice(0, 5).map((color, index) => (
                <div
                  key={index}
                  className="w-6 h-6 rounded-full border border-white/50 shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Upload Button */}
      {previewUrl && !isUploading && (
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-full sl-button-primary"
        >
          <Upload className="h-4 w-4 mr-2" />
          Choose Different Image
        </Button>
      )}
    </div>
  );
}