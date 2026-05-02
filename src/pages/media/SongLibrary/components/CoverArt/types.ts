/**
 * Cover Art Component Types
 * 
 * TypeScript interfaces for cover art management components
 */

import { CoverArtColors } from '@/types/song-library';

export interface CoverArtProps {
  songId: string;
  songTitle?: string;
  artistName?: string;
  currentImageUrl?: string;
  currentColors?: CoverArtColors;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  showUploadButton?: boolean;
  onImageUpload?: (result: CoverArtUploadResult) => void;
  onImageRemove?: () => void;
  onColorsExtracted?: (colors: CoverArtColors) => void;
  className?: string;
}

export interface ImageUploadProps {
  songId: string;
  onUploadSuccess: (result: CoverArtUploadResult) => void;
  onUploadError: (error: Error) => void;
  onUploadProgress?: (progress: number) => void;
  maxFileSize?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  className?: string;
}

export interface GradientGeneratorProps {
  songTitle: string;
  artistName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'linear' | 'radial' | 'conic' | 'auto';
  showControls?: boolean;
  showVariations?: boolean;
  onGradientChange?: (gradient: any) => void;
  className?: string;
  // Advanced customization options
  mood?: 'energetic' | 'calm' | 'worship' | 'celebration' | 'reflective';
  intensity?: 'subtle' | 'moderate' | 'vibrant';
  complexity?: 'simple' | 'complex';
}

export interface ColorExtractorProps {
  imageUrl: string;
  onColorsExtracted: (colors: CoverArtColors) => void;
  onError?: (error: Error) => void;
}

export interface CoverArtUploadResult {
  originalUrl: string;
  optimizedSizes: {
    thumbnail: string;    // 64x64
    small: string;        // 128x128
    medium: string;       // 256x256
    large: string;        // 512x512
  };
  colors: CoverArtColors;
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface ImageOptimizationOptions {
  quality: number;
  format: 'webp' | 'jpeg' | 'png';
  sizes: number[];
  progressive?: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileInfo?: {
    size: number;
    type: string;
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: 'validating' | 'uploading' | 'optimizing' | 'extracting-colors' | 'complete';
}