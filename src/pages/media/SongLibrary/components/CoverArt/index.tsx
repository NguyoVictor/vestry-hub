/**
 * Cover Art Component - Main Export
 * 
 * Provides cover art management functionality including:
 * - Secure file upload with validation
 * - Image optimization and WebP conversion
 * - Gradient fallback generation
 * - Color extraction for ambient effects
 */

export { CoverArt } from './CoverArt';
export { ImageUpload } from './ImageUpload';
export { GradientGenerator } from './GradientGenerator';
export { ColorExtractor } from './ColorExtractor';

export type {
  CoverArtProps,
  ImageUploadProps,
  GradientGeneratorProps,
  ColorExtractorProps,
  CoverArtUploadResult,
  ImageOptimizationOptions,
} from './types';