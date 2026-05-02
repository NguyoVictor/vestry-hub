/**
 * Magnet Component Integration for Song Library UI Revamp
 * 
 * Integrates React Bits Magnet component for hover interactions.
 * Used for:
 * - Interactive elements that follow cursor movement
 * - Enhanced hover effects for buttons and cards
 * - Magnetic attraction animations
 * - Premium interaction feedback
 * 
 * Requirements: 2.5
 */

import React from 'react';
import { Magnet as ReactBitsMagnet } from 'react-bits';
import { cn } from '@/lib/utils';

interface MagnetProps {
  /** Child elements to apply magnet effect to */
  children: React.ReactNode;
  /** Magnetic strength (0-1) */
  strength?: number;
  /** Magnetic range in pixels */
  range?: number;
  /** Whether to enable the magnet effect */
  enabled?: boolean;
  /** Custom className */
  className?: string;
  /** Animation easing */
  easing?: string;
  /** Animation duration in ms */
  duration?: number;
  /** Whether to apply 3D transform */
  use3D?: boolean;
}

/**
 * Enhanced Magnet wrapper that integrates React Bits Magnet
 * with Song Library theming and interaction patterns
 */
export function Magnet({
  children,
  strength = 0.3,
  range = 100,
  enabled = true,
  className,
  easing = 'cubic-bezier(0.23, 1, 0.32, 1)',
  duration = 300,
  use3D = true,
}: MagnetProps) {
  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <ReactBitsMagnet
      className={cn('magnet-container', className)}
      magnetStrength={strength}
      magnetRange={range}
      easing={easing}
      duration={duration}
      use3D={use3D}
    >
      {children}
    </ReactBitsMagnet>
  );
}

/**
 * Preset Magnet variants for common use cases
 */

// Button with magnetic effect
export function MagneticButton({ 
  children, 
  onClick, 
  className,
  strength = 0.4,
  ...props 
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  strength?: number;
  [key: string]: any;
}) {
  return (
    <Magnet strength={strength} range={80} className={className}>
      <button
        onClick={onClick}
        className={cn(
          'magnetic-button transition-all duration-200',
          'hover:shadow-lg active:scale-95',
          className
        )}
        {...props}
      >
        {children}
      </button>
    </Magnet>
  );
}

// Card with subtle magnetic effect
export function MagneticCard({ 
  children, 
  onClick, 
  className,
  strength = 0.2,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  strength?: number;
}) {
  return (
    <Magnet strength={strength} range={120} className={className}>
      <div
        onClick={onClick}
        className={cn(
          'magnetic-card transition-all duration-300',
          'hover:shadow-md cursor-pointer',
          className
        )}
      >
        {children}
      </div>
    </Magnet>
  );
}

// Icon with magnetic effect
export function MagneticIcon({ 
  children, 
  onClick, 
  className,
  strength = 0.5,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  strength?: number;
}) {
  return (
    <Magnet strength={strength} range={60} className={className}>
      <div
        onClick={onClick}
        className={cn(
          'magnetic-icon transition-all duration-200',
          'hover:scale-110 cursor-pointer',
          className
        )}
      >
        {children}
      </div>
    </Magnet>
  );
}

// Text element with magnetic effect
export function MagneticText({ 
  children, 
  onClick, 
  className,
  strength = 0.15,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  strength?: number;
}) {
  return (
    <Magnet strength={strength} range={80} className={className}>
      <span
        onClick={onClick}
        className={cn(
          'magnetic-text transition-all duration-200',
          onClick && 'cursor-pointer hover:text-orange-500',
          className
        )}
      >
        {children}
      </span>
    </Magnet>
  );
}

// Play button with strong magnetic effect
export function MagneticPlayButton({ 
  children, 
  onClick, 
  className,
  strength = 0.6,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  strength?: number;
}) {
  return (
    <Magnet strength={strength} range={100} className={className}>
      <button
        onClick={onClick}
        className={cn(
          'magnetic-play-button transition-all duration-200',
          'hover:scale-105 hover:shadow-xl active:scale-95',
          'bg-orange-500 hover:bg-orange-600 text-white',
          'rounded-full p-3 shadow-lg',
          className
        )}
      >
        {children}
      </button>
    </Magnet>
  );
}

// Navigation item with magnetic effect
export function MagneticNavItem({ 
  children, 
  onClick, 
  className,
  strength = 0.25,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  strength?: number;
}) {
  return (
    <Magnet strength={strength} range={90} className={className}>
      <div
        onClick={onClick}
        className={cn(
          'magnetic-nav-item transition-all duration-200',
          'hover:text-orange-500 cursor-pointer',
          'px-3 py-2 rounded-md',
          className
        )}
      >
        {children}
      </div>
    </Magnet>
  );
}

export default Magnet;