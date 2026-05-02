/**
 * FadeContent Component Integration for Song Library UI Revamp
 * 
 * Integrates React Bits FadeContent component for smooth content transitions.
 * Used for:
 * - Smooth content transitions between states
 * - Loading state animations
 * - Content reveal animations
 * - Page transition effects
 * 
 * Requirements: 2.6
 */

import React from 'react';
import { FadeContent as ReactBitsFadeContent } from 'react-bits';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FadeContentProps {
  /** Child elements to apply fade effect to */
  children: React.ReactNode;
  /** Whether content is visible */
  show?: boolean;
  /** Fade animation duration in ms */
  duration?: number;
  /** Animation delay in ms */
  delay?: number;
  /** Fade direction */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Distance to move during fade */
  distance?: number;
  /** Custom className */
  className?: string;
  /** Animation easing */
  easing?: string;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Whether to unmount when hidden */
  unmountOnExit?: boolean;
}

/**
 * Enhanced FadeContent wrapper that integrates React Bits FadeContent
 * with Song Library theming and animation patterns
 */
export function FadeContent({
  children,
  show = true,
  duration = 300,
  delay = 0,
  direction = 'up',
  distance = 20,
  className,
  easing = 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  onAnimationComplete,
  unmountOnExit = false,
}: FadeContentProps) {
  const getInitialTransform = () => {
    switch (direction) {
      case 'up':
        return { opacity: 0, y: distance };
      case 'down':
        return { opacity: 0, y: -distance };
      case 'left':
        return { opacity: 0, x: distance };
      case 'right':
        return { opacity: 0, x: -distance };
      case 'none':
      default:
        return { opacity: 0 };
    }
  };

  const getAnimateTransform = () => {
    switch (direction) {
      case 'up':
      case 'down':
        return { opacity: 1, y: 0 };
      case 'left':
      case 'right':
        return { opacity: 1, x: 0 };
      case 'none':
      default:
        return { opacity: 1 };
    }
  };

  const getExitTransform = () => {
    switch (direction) {
      case 'up':
        return { opacity: 0, y: -distance };
      case 'down':
        return { opacity: 0, y: distance };
      case 'left':
        return { opacity: 0, x: -distance };
      case 'right':
        return { opacity: 0, x: distance };
      case 'none':
      default:
        return { opacity: 0 };
    }
  };

  if (unmountOnExit) {
    return (
      <AnimatePresence onExitComplete={onAnimationComplete}>
        {show && (
          <motion.div
            initial={getInitialTransform()}
            animate={getAnimateTransform()}
            exit={getExitTransform()}
            transition={{
              duration: duration / 1000,
              delay: delay / 1000,
              ease: easing,
            }}
            className={cn('fade-content', className)}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      initial={getInitialTransform()}
      animate={show ? getAnimateTransform() : getInitialTransform()}
      transition={{
        duration: duration / 1000,
        delay: delay / 1000,
        ease: easing,
      }}
      onAnimationComplete={onAnimationComplete}
      className={cn('fade-content', className)}
      style={{ pointerEvents: show ? 'auto' : 'none' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Preset FadeContent variants for common use cases
 */

// Loading content fade
export function FadeInContent({ 
  children, 
  isLoading, 
  className 
}: {
  children: React.ReactNode;
  isLoading: boolean;
  className?: string;
}) {
  return (
    <FadeContent
      show={!isLoading}
      duration={400}
      direction="up"
      distance={30}
      className={cn('fade-in-content', className)}
    >
      {children}
    </FadeContent>
  );
}

// Staggered list item fade
export function StaggeredFadeItem({ 
  children, 
  index, 
  show = true, 
  className 
}: {
  children: React.ReactNode;
  index: number;
  show?: boolean;
  className?: string;
}) {
  return (
    <FadeContent
      show={show}
      duration={300}
      delay={index * 50}
      direction="up"
      distance={15}
      className={cn('staggered-fade-item', className)}
    >
      {children}
    </FadeContent>
  );
}

// Modal content fade
export function ModalFadeContent({ 
  children, 
  show, 
  className 
}: {
  children: React.ReactNode;
  show: boolean;
  className?: string;
}) {
  return (
    <FadeContent
      show={show}
      duration={200}
      direction="none"
      unmountOnExit={true}
      className={cn('modal-fade-content', className)}
    >
      {children}
    </FadeContent>
  );
}

// Page transition fade
export function PageFadeTransition({ 
  children, 
  className 
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <FadeContent
      show={true}
      duration={500}
      direction="up"
      distance={40}
      className={cn('page-fade-transition', className)}
    >
      {children}
    </FadeContent>
  );
}

// Card reveal fade
export function CardRevealFade({ 
  children, 
  show = true, 
  delay = 0, 
  className 
}: {
  children: React.ReactNode;
  show?: boolean;
  delay?: number;
  className?: string;
}) {
  return (
    <FadeContent
      show={show}
      duration={350}
      delay={delay}
      direction="up"
      distance={25}
      className={cn('card-reveal-fade', className)}
    >
      {children}
    </FadeContent>
  );
}

// Text content fade
export function TextFadeReveal({ 
  children, 
  show = true, 
  className 
}: {
  children: React.ReactNode;
  show?: boolean;
  className?: string;
}) {
  return (
    <FadeContent
      show={show}
      duration={400}
      direction="right"
      distance={20}
      className={cn('text-fade-reveal', className)}
    >
      {children}
    </FadeContent>
  );
}

// Button fade in
export function ButtonFadeIn({ 
  children, 
  show = true, 
  delay = 0, 
  className 
}: {
  children: React.ReactNode;
  show?: boolean;
  delay?: number;
  className?: string;
}) {
  return (
    <FadeContent
      show={show}
      duration={250}
      delay={delay}
      direction="up"
      distance={10}
      className={cn('button-fade-in', className)}
    >
      {children}
    </FadeContent>
  );
}

export default FadeContent;