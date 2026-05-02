/**
 * Adaptive Image Component for Mobile Performance
 * 
 * Optimizes image loading based on:
 * - Device capabilities (screen size, pixel density)
 * - Network conditions (connection speed)
 * - User preferences (data saver mode)
 * - Viewport visibility (intersection observer)
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Wifi, WifiOff } from 'lucide-react';
import { useResponsive, useNetworkSpeed, getOptimalImageSize } from '../../utils/mobileUtils';

interface AdaptiveImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackGradient?: string;
  sizes?: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  quality?: 'low' | 'medium' | 'high';
  priority?: boolean;
  lazy?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

interface ImageState {
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  currentSrc: string | null;
  retryCount: number;
}

export function AdaptiveImage({
  src,
  alt,
  className = '',
  fallbackGradient = 'from-orange-400 to-orange-500',
  sizes = {
    sm: '200w',
    md: '400w', 
    lg: '600w',
    xl: '800w'
  },
  quality = 'medium',
  priority = false,
  lazy = true,
  onLoad,
  onError
}: AdaptiveImageProps) {
  const [imageState, setImageState] = useState<ImageState>({
    isLoading: false,
    isLoaded: false,
    hasError: false,
    currentSrc: null,
    retryCount: 0
  });

  const [isInView, setIsInView] = useState(!lazy || priority);
  const [dataSaverMode, setDataSaverMode] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const responsive = useResponsive();
  const connectionSpeed = useNetworkSpeed();

  // Detect data saver mode
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setDataSaverMode(connection.saveData || false);
    }
  }, []);

  // Determine optimal image size and quality
  const optimalConfig = useMemo(() => {
    const optimalSize = getOptimalImageSize(
      responsive.screenSize, 
      responsive.isMobile, 
      connectionSpeed
    );

    // Adjust quality based on connection and data saver mode
    let adjustedQuality = quality;
    if (dataSaverMode || connectionSpeed === 'slow') {
      adjustedQuality = 'low';
    } else if (connectionSpeed === 'fast' && !responsive.isMobile) {
      adjustedQuality = 'high';
    }

    return {
      size: optimalSize,
      quality: adjustedQuality
    };
  }, [responsive.screenSize, responsive.isMobile, connectionSpeed, dataSaverMode, quality]);

  // Generate optimized image URL
  const optimizedSrc = useMemo(() => {
    if (!src) return null;

    // If it's already a data URL or blob, return as-is
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      return src;
    }

    // For Supabase storage URLs, add transformation parameters
    if (src.includes('supabase')) {
      const url = new URL(src);
      
      // Add size transformation
      const sizeMap = {
        sm: '200x200',
        md: '400x400',
        lg: '600x600',
        xl: '800x800'
      };
      
      url.searchParams.set('width', sizeMap[optimalConfig.size].split('x')[0]);
      url.searchParams.set('height', sizeMap[optimalConfig.size].split('x')[1]);
      
      // Add quality parameter
      const qualityMap = {
        low: '60',
        medium: '80',
        high: '95'
      };
      url.searchParams.set('quality', qualityMap[optimalConfig.quality]);
      
      // Add format optimization
      if (responsive.isMobile) {
        url.searchParams.set('format', 'webp');
      }
      
      return url.toString();
    }

    // For other URLs, return as-is (could be enhanced with image proxy)
    return src;
  }, [src, optimalConfig]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || !containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1
      }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, priority]);

  // Handle image loading
  const handleImageLoad = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      isLoading: false,
      isLoaded: true,
      hasError: false
    }));
    onLoad?.();
  }, [onLoad]);

  // Handle image error with retry logic
  const handleImageError = useCallback(() => {
    setImageState(prev => {
      const newRetryCount = prev.retryCount + 1;
      
      // Retry up to 2 times with degraded quality
      if (newRetryCount <= 2) {
        return {
          ...prev,
          isLoading: true,
          retryCount: newRetryCount
        };
      }
      
      return {
        ...prev,
        isLoading: false,
        hasError: true
      };
    });
    onError?.();
  }, [onError]);

  // Start loading when in view
  useEffect(() => {
    if (isInView && optimizedSrc && !imageState.isLoaded && !imageState.isLoading) {
      setImageState(prev => ({
        ...prev,
        isLoading: true,
        currentSrc: optimizedSrc
      }));
    }
  }, [isInView, optimizedSrc, imageState.isLoaded, imageState.isLoading]);

  // Preload image
  useEffect(() => {
    if (imageState.isLoading && imageState.currentSrc) {
      const img = new Image();
      img.onload = handleImageLoad;
      img.onerror = handleImageError;
      img.src = imageState.currentSrc;
    }
  }, [imageState.isLoading, imageState.currentSrc, handleImageLoad, handleImageError]);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 ${className}`}
    >
      <AnimatePresence mode="wait">
        {imageState.isLoaded && imageState.currentSrc ? (
          // Loaded Image
          <motion.img
            key="image"
            ref={imgRef}
            src={imageState.currentSrc}
            alt={alt}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        ) : imageState.hasError || !src ? (
          // Fallback Gradient
          <motion.div
            key="fallback"
            className={`w-full h-full bg-gradient-to-br ${fallbackGradient} flex items-center justify-center`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ImageIcon className="h-8 w-8 text-white/70" />
          </motion.div>
        ) : (
          // Loading State
          <motion.div
            key="loading"
            className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Network Status Indicator */}
      {responsive.isMobile && (dataSaverMode || connectionSpeed === 'slow') && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded-full p-1">
            {connectionSpeed === 'slow' ? (
              <WifiOff className="h-3 w-3 text-white" />
            ) : (
              <Wifi className="h-3 w-3 text-white" />
            )}
          </div>
        </div>
      )}

      {/* Retry Button for Failed Images */}
      {imageState.hasError && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => {
            setImageState(prev => ({
              ...prev,
              hasError: false,
              isLoading: true,
              retryCount: 0
            }));
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
        >
          <div className="bg-white/90 dark:bg-slate-800/90 rounded-lg px-3 py-2 text-sm font-medium">
            Retry
          </div>
        </motion.button>
      )}
    </div>
  );
}

export default AdaptiveImage;