/**
 * Image Processing Utilities
 * 
 * Handles image validation, optimization, resizing, and WebP conversion
 */

import type { FileValidationResult, ImageOptimizationOptions } from '../types';

/**
 * Validate an image file for upload
 */
export async function validateImageFile(
  file: File,
  maxSize: number,
  acceptedTypes: string[]
): Promise<FileValidationResult> {
  // Check file type
  if (!acceptedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not supported. Please use JPEG, PNG, WebP, or GIF.`
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / 1024 / 1024);
    const fileSizeMB = Math.round(file.size / 1024 / 1024 * 100) / 100;
    return {
      isValid: false,
      error: `File size ${fileSizeMB}MB exceeds the ${maxSizeMB}MB limit.`
    };
  }

  // Check if it's actually an image by trying to load it
  try {
    const dimensions = await getImageDimensions(file);
    
    // Check minimum dimensions
    if (dimensions.width < 64 || dimensions.height < 64) {
      return {
        isValid: false,
        error: 'Image must be at least 64x64 pixels.'
      };
    }

    // Check maximum dimensions
    if (dimensions.width > 4096 || dimensions.height > 4096) {
      return {
        isValid: false,
        error: 'Image must be smaller than 4096x4096 pixels.'
      };
    }

    return {
      isValid: true,
      fileInfo: {
        size: file.size,
        type: file.type,
        dimensions
      }
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid image file or corrupted data.'
    };
  }
}

/**
 * Get image dimensions from a file
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Optimize an image file
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculate optimal size (max 1024x1024 for original)
      const maxSize = 1024;
      let { width, height } = img;
      
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and optimize
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to optimize image'));
          }
        },
        `image/${options.format}`,
        options.quality / 100
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for optimization'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Generate multiple sizes of an image
 */
export async function generateImageSizes(
  file: Blob,
  sizes: number[]
): Promise<Record<string, Blob>> {
  const results: Record<string, Blob> = {};
  
  for (const size of sizes) {
    try {
      const resizedBlob = await resizeImage(file, size, size);
      results[size.toString()] = resizedBlob;
    } catch (error) {
      console.warn(`Failed to generate ${size}px version:`, error);
    }
  }
  
  return results;
}

/**
 * Resize an image to specific dimensions
 */
export function resizeImage(
  file: Blob,
  targetWidth: number,
  targetHeight: number,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Calculate crop/fit
      const sourceRatio = img.width / img.height;
      const targetRatio = targetWidth / targetHeight;
      
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = img.width;
      let sourceHeight = img.height;

      // Center crop to maintain aspect ratio
      if (sourceRatio > targetRatio) {
        // Source is wider, crop width
        sourceWidth = img.height * targetRatio;
        sourceX = (img.width - sourceWidth) / 2;
      } else if (sourceRatio < targetRatio) {
        // Source is taller, crop height
        sourceHeight = img.width / targetRatio;
        sourceY = (img.height - sourceHeight) / 2;
      }

      // Draw with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, targetWidth, targetHeight
      );

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to resize image'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for resizing'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert image to WebP format
 */
export function convertToWebP(
  file: File,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert to WebP'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for WebP conversion'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if WebP is supported
 */
export function isWebPSupported(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Get optimal image format based on browser support
 */
export function getOptimalFormat(): 'webp' | 'jpeg' {
  return isWebPSupported() ? 'webp' : 'jpeg';
}