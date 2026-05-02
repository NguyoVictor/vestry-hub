/**
 * BlurText Component Integration for Song Library UI Revamp
 * 
 * Integrates React Bits BlurText component for dynamic text effects.
 * Used for:
 * - Song titles with reveal animations
 * - Section headings with blur-to-focus effects
 * - Dynamic text transitions in search results
 * - Loading state text animations
 * 
 * Requirements: 2.1
 */

import React from 'react';
import { BlurText as ReactBitsBlurText } from 'react-bits';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BlurTextProps {
  /** The text content to display with blur effect */
  text: string;
  /** Animation delay in seconds */
  delay?: number;
  /** Duration of the blur animation in seconds */
  duration?: number;
  /** Custom className for styling */
  className?: string;
  /** Text size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Animation trigger - when to start the animation */
  trigger?: 'immediate' | 'hover' | 'inView';
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Whether to repeat the animation */
  repeat?: boolean;
  /** Custom blur intensity (0-20) */
  blurIntensity?: number;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl font-bold',
};

/**
 * Enhanced BlurText wrapper component that integrates React Bits BlurText
 * with Song Library theming and animation controls
 */
export function BlurText({
  text,
  delay = 0,
  duration = 0.8,
  className,
  size = 'md',
  trigger = 'immediate',
  onAnimationComplete,
  repeat = false,
  blurIntensity = 10,
}: BlurTextProps) {
  const [shouldAnimate, setShouldAnimate] = React.useState(trigger === 'immediate');
  const [isHovered, setIsHovered] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Handle in-view animation trigger
  React.useEffect(() => {
    if (trigger !== 'inView') return;

    // Check if IntersectionObserver is available (not in test environment)
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback for test environments without IntersectionObserver
      setShouldAnimate(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldAnimate(true);
          if (!repeat) {
            observer.disconnect();
          }
        } else if (repeat) {
          setShouldAnimate(false);
        }
      },
      { threshold: 0.1 }
    );

    // Observe the element when ref is available
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, [trigger, repeat]);

  // Handle hover trigger
  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsHovered(true);
      setShouldAnimate(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsHovered(false);
      if (repeat) {
        setShouldAnimate(false);
      }
    }
  };

  // Animation completion handler
  const handleAnimationComplete = () => {
    onAnimationComplete?.();
    
    if (repeat && trigger === 'immediate') {
      // Reset and restart animation for repeat mode
      setTimeout(() => {
        setShouldAnimate(false);
        setTimeout(() => setShouldAnimate(true), 100);
      }, 1000);
    }
  };

  return (
    <motion.div
      ref={ref}
      className={cn(
        'inline-block font-jakarta',
        sizeClasses[size],
        trigger === 'hover' && 'cursor-pointer',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: delay * 0.5 }}
    >
      <ReactBitsBlurText
        text={text}
        delay={delay}
        duration={duration}
        className={cn(
          'sl-text-primary transition-colors duration-300',
          isHovered && 'sl-text-accent-primary'
        )}
        // React Bits specific props
        animateOnMount={shouldAnimate}
        blurAmount={blurIntensity}
        onComplete={handleAnimationComplete}
      />
    </motion.div>
  );
}

/**
 * Preset BlurText variants for common use cases in Song Library
 */

// Song title with blur reveal effect
export function SongTitleBlur({ title, delay = 0, className }: { 
  title: string; 
  delay?: number; 
  className?: string; 
}) {
  return (
    <BlurText
      text={title}
      size="lg"
      delay={delay}
      duration={1.2}
      trigger="inView"
      className={cn('font-semibold', className)}
      blurIntensity={8}
    />
  );
}

// Section heading with blur effect
export function SectionHeadingBlur({ heading, delay = 0, className }: { 
  heading: string; 
  delay?: number; 
  className?: string; 
}) {
  return (
    <BlurText
      text={heading}
      size="2xl"
      delay={delay}
      duration={1.0}
      trigger="inView"
      className={cn('font-bold tracking-tight', className)}
      blurIntensity={12}
    />
  );
}

// Interactive blur text for hover effects
export function InteractiveBlurText({ text, className }: { 
  text: string; 
  className?: string; 
}) {
  return (
    <BlurText
      text={text}
      size="md"
      duration={0.6}
      trigger="hover"
      repeat={true}
      className={cn('transition-all duration-200', className)}
      blurIntensity={6}
    />
  );
}

// Loading state blur text
export function LoadingBlurText({ text = "Loading...", className }: { 
  text?: string; 
  className?: string; 
}) {
  return (
    <BlurText
      text={text}
      size="sm"
      duration={1.5}
      trigger="immediate"
      repeat={true}
      className={cn('sl-text-muted', className)}
      blurIntensity={15}
    />
  );
}

export default BlurText;