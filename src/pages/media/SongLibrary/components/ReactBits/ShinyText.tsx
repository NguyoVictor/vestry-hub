/**
 * ShinyText Component Integration for Song Library UI Revamp
 * 
 * Integrates React Bits ShinyText component for headings and labels.
 * Used for:
 * - Premium headings with shimmer effects
 * - Interactive text elements with shine animations
 * - Section headers and labels with visual appeal
 * - Call-to-action text elements
 * 
 * Requirements: 2.4
 */

import React from 'react';
import { ShinyText as ReactBitsShinyText } from 'react-bits';
import { cn } from '@/lib/utils';

interface ShinyTextProps {
  /** Text content to display */
  text: string;
  /** Text size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Shine animation speed (ms) */
  speed?: number;
  /** Shine color */
  shineColor?: string;
  /** Whether to enable shine effect */
  enabled?: boolean;
  /** Custom className */
  className?: string;
  /** Animation trigger */
  trigger?: 'hover' | 'always' | 'inView';
  /** Animation delay */
  delay?: number;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl font-bold',
};

/**
 * Enhanced ShinyText wrapper that integrates React Bits ShinyText
 * with Song Library theming and consistent styling
 */
export function ShinyText({
  text,
  size = 'md',
  speed = 2000,
  shineColor = 'rgba(255, 255, 255, 0.8)',
  enabled = true,
  className,
  trigger = 'always',
  delay = 0,
  onAnimationComplete,
}: ShinyTextProps) {
  const [shouldAnimate, setShouldAnimate] = React.useState(trigger === 'always');
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
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, [trigger]);

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
      setShouldAnimate(false);
    }
  };

  // Animation completion handler
  const handleAnimationComplete = () => {
    onAnimationComplete?.();
  };

  if (!enabled) {
    return (
      <span className={cn('font-jakarta', sizeClasses[size], className)}>
        {text}
      </span>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        'inline-block font-jakarta',
        sizeClasses[size],
        trigger === 'hover' && 'cursor-pointer',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ReactBitsShinyText
        text={text}
        speed={speed}
        shineColor={shineColor}
        className="sl-text-primary"
        disabled={!shouldAnimate}
        onAnimationEnd={handleAnimationComplete}
      />
    </div>
  );
}

/**
 * Preset ShinyText variants for common use cases
 */

// Page title with shine effect
export function ShinyPageTitle({ text, className }: {
  text: string;
  className?: string;
}) {
  return (
    <ShinyText
      text={text}
      size="2xl"
      speed={3000}
      shineColor="rgba(249, 115, 22, 0.8)" // Orange shine
      trigger="inView"
      className={cn('page-title-shiny', className)}
    />
  );
}

// Section heading with subtle shine
export function ShinySectionHeading({ text, className }: {
  text: string;
  className?: string;
}) {
  return (
    <ShinyText
      text={text}
      size="lg"
      speed={2500}
      shineColor="rgba(255, 255, 255, 0.6)"
      trigger="inView"
      className={cn('section-heading-shiny font-semibold', className)}
    />
  );
}

// Interactive button text with hover shine
export function ShinyButtonText({ text, className }: {
  text: string;
  className?: string;
}) {
  return (
    <ShinyText
      text={text}
      size="sm"
      speed={1500}
      shineColor="rgba(255, 255, 255, 0.9)"
      trigger="hover"
      className={cn('button-text-shiny font-medium', className)}
    />
  );
}

// Call-to-action text with continuous shine
export function ShinyCallToAction({ text, className }: {
  text: string;
  className?: string;
}) {
  return (
    <ShinyText
      text={text}
      size="md"
      speed={2000}
      shineColor="rgba(249, 115, 22, 0.7)" // Orange shine
      trigger="always"
      className={cn('cta-shiny font-semibold text-orange-600', className)}
    />
  );
}

// Label text with subtle shine on view
export function ShinyLabel({ text, className }: {
  text: string;
  className?: string;
}) {
  return (
    <ShinyText
      text={text}
      size="sm"
      speed={1800}
      shineColor="rgba(148, 163, 184, 0.8)" // Slate shine
      trigger="inView"
      className={cn('label-shiny text-slate-600 font-medium', className)}
    />
  );
}

export default ShinyText;