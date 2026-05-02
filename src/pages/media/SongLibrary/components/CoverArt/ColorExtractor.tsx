/**
 * ColorExtractor Component
 * 
 * Extracts dominant colors from images for ambient effects.
 * Uses canvas-based color analysis for accurate color extraction.
 */

import React, { useEffect, useRef } from 'react';
import type { ColorExtractorProps } from './types';
import type { CoverArtColors } from '@/types/song-library';

/**
 * Extract colors from an image using canvas analysis
 */
function extractColorsFromCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): CoverArtColors {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Color frequency map
  const colorMap = new Map<string, number>();
  const sampleRate = 4; // Sample every 4th pixel for performance
  
  // Sample pixels and count colors
  for (let i = 0; i < data.length; i += 4 * sampleRate) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    // Skip transparent pixels
    if (a < 128) continue;
    
    // Quantize colors to reduce noise (group similar colors)
    const quantizedR = Math.round(r / 32) * 32;
    const quantizedG = Math.round(g / 32) * 32;
    const quantizedB = Math.round(b / 32) * 32;
    
    const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
    colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
  }
  
  // Sort colors by frequency
  const sortedColors = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10) // Top 10 colors
    .map(([color]) => {
      const [r, g, b] = color.split(',').map(Number);
      return `rgb(${r}, ${g}, ${b})`;
    });
  
  // Convert to hex and filter out very dark/light colors for better ambient effects
  const hexColors = sortedColors
    .map(rgbToHex)
    .filter(color => {
      const brightness = getBrightness(color);
      return brightness > 0.1 && brightness < 0.9; // Exclude very dark/light colors
    });
  
  // Ensure we have at least some colors
  const dominantColors = hexColors.length > 0 ? hexColors : ['#f97316', '#ea580c', '#fb923c'];
  
  // Calculate primary, secondary, and accent colors
  const primary = dominantColors[0] || '#f97316';
  const secondary = dominantColors[1] || '#ea580c';
  const accent = dominantColors[2] || '#fb923c';
  
  return {
    primary,
    secondary,
    accent,
    dominant: dominantColors.slice(0, 8) // Up to 8 dominant colors
  };
}

/**
 * Convert RGB string to hex
 */
function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return '#000000';
  
  const [, r, g, b] = match;
  return '#' + [r, g, b]
    .map(x => parseInt(x).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculate brightness of a hex color (0-1)
 */
function getBrightness(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  // Use relative luminance formula
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * ColorExtractor Component
 * 
 * This component loads an image and extracts its dominant colors.
 * It's designed to be invisible and only performs the color extraction.
 */
export function ColorExtractor({
  imageUrl,
  onColorsExtracted,
  onError
}: ColorExtractorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    if (!imageUrl) return;
    
    const canvas = canvasRef.current;
    
    // Check if canvas is available (not available in test environment)
    if (!canvas) {
      onError?.(new Error('Canvas not available'));
      return;
    }
    
    let ctx: CanvasRenderingContext2D | null = null;
    
    try {
      ctx = canvas.getContext('2d');
    } catch (error) {
      console.warn('Canvas context not available:', error);
      onError?.(new Error('Canvas not available'));
      return;
    }
    
    if (!ctx) {
      onError?.(new Error('Canvas not available'));
      return;
    }
    
    // Create image element
    const img = new Image();
    imageRef.current = img;
    
    img.onload = () => {
      try {
        // Set canvas size (use smaller size for performance)
        const maxSize = 200;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);
        const width = Math.round(img.width * ratio);
        const height = Math.round(img.height * ratio);
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Extract colors
        const colors = extractColorsFromCanvas(canvas, ctx);
        onColorsExtracted(colors);
        
      } catch (error) {
        console.error('Color extraction error:', error);
        onError?.(error instanceof Error ? error : new Error('Color extraction failed'));
      }
    };
    
    img.onerror = () => {
      onError?.(new Error('Failed to load image for color extraction'));
    };
    
    // Handle CORS for external images
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    
    // Cleanup
    return () => {
      if (imageRef.current) {
        imageRef.current.onload = null;
        imageRef.current.onerror = null;
      }
    };
  }, [imageUrl, onColorsExtracted, onError]);
  
  // Hidden canvas for color extraction
  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  );
}