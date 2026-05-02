import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLazyLoading } from '../../hooks/useLazyLoading';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
  priority?: boolean;
}

/**
 * LazyImage component with intersection observer-based loading
 * Validates: Requirements 11.2 (lazy loading for cover art)
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  fallback,
  placeholder,
  onLoad,
  onError,
  sizes,
  priority = false,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { ref, isVisible } = useLazyLoading({
    threshold: 0.1,
    rootMargin: '50px',
    triggerOnce: true,
  });

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    onError?.();
  }, [onError]);

  // Load immediately if priority is set
  const shouldLoad = priority || isVisible;

  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden bg-slate-100',
        className
      )}
    >
      {/* Placeholder/Loading state */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center">
          {placeholder ? (
            <img
              src={placeholder}
              alt=""
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 animate-pulse" />
          )}
        </div>
      )}

      {/* Actual image */}
      {shouldLoad && !imageError && (
        <motion.img
          src={src}
          alt={alt}
          sizes={sizes}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          initial={{ opacity: 0 }}
          animate={{ opacity: imageLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Fallback for error state */}
      {imageError && fallback && (
        <div className="absolute inset-0 flex items-center justify-center">
          {fallback}
        </div>
      )}
    </div>
  );
};

/**
 * Optimized image component with WebP support and responsive sizing
 */
interface OptimizedImageProps extends LazyImageProps {
  webpSrc?: string;
  srcSet?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  webpSrc,
  srcSet,
  ...props
}) => {
  return (
    <picture>
      {webpSrc && (
        <source srcSet={webpSrc} type="image/webp" />
      )}
      {srcSet && (
        <source srcSet={srcSet} />
      )}
      <LazyImage src={src} {...props} />
    </picture>
  );
};