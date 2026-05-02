/**
 * CoverArt Component
 * 
 * Main cover art display component with upload functionality.
 * Handles image display, fallback gradients, and upload interactions.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { ImageUpload } from './ImageUpload';
import { GradientGenerator } from './GradientGenerator';
import { ColorExtractor } from './ColorExtractor';
import { AdaptiveImage } from '../Performance/AdaptiveImage';
import { useAmbientColors } from '../../hooks/useAmbientColors';
import type { CoverArtProps, CoverArtUploadResult } from './types';
import type { CoverArtColors } from '@/types/song-library';

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24', 
  lg: 'w-32 h-32',
  xl: 'w-48 h-48',
};

const uploadButtonSizes = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10', 
  xl: 'h-12 w-12',
};

export function CoverArt({
  songId,
  songTitle,
  artistName,
  currentImageUrl,
  currentColors,
  size = 'md',
  editable = false,
  showUploadButton = false,
  onImageUpload,
  onImageRemove,
  onColorsExtracted,
  className,
}: CoverArtProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [extractedColors, setExtractedColors] = useState<CoverArtColors | null>(currentColors || null);
  
  const { setColorsFromCoverArt } = useAmbientColors();

  // Handle successful image upload
  const handleUploadSuccess = useCallback((result: CoverArtUploadResult) => {
    setIsUploading(false);
    setUploadProgress(0);
    setShowUploadModal(false);
    setExtractedColors(result.colors);
    
    // Update ambient colors if in dark mode
    setColorsFromCoverArt(result.colors);
    
    // Notify parent component
    onImageUpload?.(result);
    onColorsExtracted?.(result.colors);
    
    toast.success('Cover art uploaded successfully');
  }, [onImageUpload, onColorsExtracted, setColorsFromCoverArt]);

  // Handle upload error
  const handleUploadError = useCallback((error: Error) => {
    setIsUploading(false);
    setUploadProgress(0);
    setShowUploadModal(false);
    
    toast.error(`Upload failed: ${error.message}`);
  }, []);

  // Handle upload progress
  const handleUploadProgress = useCallback((progress: number) => {
    setUploadProgress(progress);
  }, []);

  // Handle image removal
  const handleRemoveImage = useCallback(() => {
    setExtractedColors(null);
    onImageRemove?.();
    toast.success('Cover art removed');
  }, [onImageRemove]);

  // Handle colors extracted from existing image
  const handleColorsExtracted = useCallback((colors: CoverArtColors) => {
    setExtractedColors(colors);
    setColorsFromCoverArt(colors);
    onColorsExtracted?.(colors);
  }, [onColorsExtracted, setColorsFromCoverArt]);

  return (
    <div className={cn('relative group', className)}>
      {/* Main Cover Art Display */}
      <motion.div
        className={cn(
          'relative overflow-hidden rounded-lg sl-cover-art-container',
          sizeClasses[size],
          'bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800'
        )}
        whileHover={editable ? { scale: 1.02 } : undefined}
        transition={{ duration: 0.2 }}
      >
        {currentImageUrl ? (
          <>
            {/* Adaptive Image with Performance Optimization */}
            <AdaptiveImage
              src={currentImageUrl}
              alt={`Cover art for ${songTitle || 'song'}`}
              className="w-full h-full object-cover"
              fallbackGradient="from-orange-400 to-orange-500"
              quality="medium"
              lazy={size === 'sm'} // Lazy load smaller images
              priority={size === 'xl'} // Prioritize large images
              onLoad={() => {
                // Extract colors when image loads if not already extracted
                if (!extractedColors && currentImageUrl) {
                  // ColorExtractor will handle this
                }
              }}
            />
            
            {/* Color Extractor for ambient effects */}
            {currentImageUrl && !extractedColors && (
              <ColorExtractor
                imageUrl={currentImageUrl}
                onColorsExtracted={handleColorsExtracted}
                onError={(error) => console.warn('Color extraction failed:', error)}
              />
            )}
            
            {/* Remove Button */}
            {editable && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleRemoveImage}
                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-colors"
                title="Remove cover art"
              >
                <X className="h-3 w-3" />
              </motion.button>
            )}
          </>
        ) : (
          <>
            {/* Fallback Gradient */}
            <GradientGenerator
              songTitle={songTitle || songId} // Use song title if available, fallback to songId
              artistName={artistName}
              size={size}
              variant="auto" // Use auto variant for theme-aware gradients
              className="w-full h-full"
            />
            
            {/* Placeholder Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className={cn(
                'text-white/70',
                size === 'sm' ? 'h-4 w-4' : 
                size === 'md' ? 'h-6 w-6' :
                size === 'lg' ? 'h-8 w-8' : 'h-12 w-12'
              )} />
            </div>
          </>
        )}

        {/* Upload Overlay */}
        {editable && (
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer"
            onClick={() => setShowUploadModal(true)}
          >
            <div className="text-center text-white">
              <Upload className={cn(
                'mx-auto mb-1',
                size === 'sm' ? 'h-3 w-3' :
                size === 'md' ? 'h-4 w-4' :
                size === 'lg' ? 'h-5 w-5' : 'h-6 w-6'
              )} />
              {size !== 'sm' && (
                <p className="text-xs font-medium">
                  {currentImageUrl ? 'Change' : 'Upload'}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/70 flex items-center justify-center"
          >
            <div className="text-center text-white">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium">{uploadProgress}%</p>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Upload Button */}
      {showUploadButton && editable && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowUploadModal(true)}
          disabled={isUploading}
          className="mt-2 w-full sl-button-secondary"
        >
          <Upload className="h-4 w-4 mr-2" />
          {currentImageUrl ? 'Change Image' : 'Upload Image'}
        </Button>
      )}

      {/* Color Indicator */}
      {extractedColors && size !== 'sm' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-2 -right-2 flex gap-1"
        >
          {extractedColors.dominant.slice(0, 3).map((color, index) => (
            <div
              key={index}
              className="w-3 h-3 rounded-full border border-white/50 shadow-sm"
              style={{ backgroundColor: color }}
              title={`Dominant color ${index + 1}: ${color}`}
            />
          ))}
        </motion.div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold sl-text-primary">
                  Upload Cover Art
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowUploadModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ImageUpload
                songId={songId}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                onUploadProgress={handleUploadProgress}
                disabled={isUploading}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}