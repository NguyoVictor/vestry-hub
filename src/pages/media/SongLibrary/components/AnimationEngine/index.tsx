/**
 * Premium Animation Engine for Song Library UI Revamp
 * 
 * Provides comprehensive animation utilities and components for premium feel.
 * Used for:
 * - Stagger animations for card grids and lists
 * - Micro-animations for user interactions
 * - Page transitions and loading states
 * - Interactive feedback animations
 * 
 * Requirements: 2.7, 2.8
 */

import React from 'react';
import { motion, AnimatePresence, Variants, Transition } from 'framer-motion';
import { cn } from '@/lib/utils';

// Animation variants for common patterns
export const animationVariants = {
  // Stagger container variants
  staggerContainer: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  },

  // Stagger item variants
  staggerItem: {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
  },

  // Card hover variants
  cardHover: {
    rest: { scale: 1, y: 0 },
    hover: {
      scale: 1.02,
      y: -4,
      transition: {
        duration: 0.2,
        ease: 'easeOut',
      },
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1,
      },
    },
  },

  // Button interaction variants
  buttonInteraction: {
    rest: { scale: 1 },
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.2,
        ease: 'easeOut',
      },
    },
    tap: {
      scale: 0.95,
      transition: {
        duration: 0.1,
      },
    },
  },

  // Fade slide variants
  fadeSlide: {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
    exit: {
      opacity: 0,
      x: 20,
      transition: {
        duration: 0.3,
      },
    },
  },

  // Scale fade variants
  scaleFade: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.2,
      },
    },
  },

  // Bounce variants
  bounce: {
    rest: { scale: 1 },
    bounce: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 0.3,
        ease: 'easeInOut',
      },
    },
  },

  // Pulse variants
  pulse: {
    rest: { scale: 1, opacity: 1 },
    pulse: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },

  // Slide up variants
  slideUp: {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
  },

  // Rotate fade variants
  rotateFade: {
    hidden: { opacity: 0, rotate: -10 },
    visible: {
      opacity: 1,
      rotate: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  },
};

// Common transition presets
export const transitionPresets = {
  smooth: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] },
  bouncy: { type: 'spring', stiffness: 400, damping: 17 },
  gentle: { duration: 0.5, ease: 'easeOut' },
  snappy: { duration: 0.15, ease: 'easeInOut' },
  elastic: { type: 'spring', stiffness: 300, damping: 20 },
};

// Stagger Container Component
interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
  variants?: Variants;
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
  initialDelay = 0.1,
  variants = animationVariants.staggerContainer,
}: StaggerContainerProps) {
  const customVariants = {
    ...variants,
    show: {
      ...variants.show,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
  };

  return (
    <motion.div
      className={cn('stagger-container', className)}
      variants={customVariants}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

// Stagger Item Component
interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
}

export function StaggerItem({
  children,
  className,
  variants = animationVariants.staggerItem,
}: StaggerItemProps) {
  return (
    <motion.div
      className={cn('stagger-item', className)}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

// Animated Card Component
interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  whileHover?: any;
  whileTap?: any;
  variants?: Variants;
}

export function AnimatedCard({
  children,
  className,
  onClick,
  whileHover = animationVariants.cardHover.hover,
  whileTap = animationVariants.cardHover.tap,
  variants,
}: AnimatedCardProps) {
  return (
    <motion.div
      className={cn('animated-card cursor-pointer', className)}
      onClick={onClick}
      variants={variants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      animate="rest"
      custom={{ whileHover, whileTap }}
    >
      {children}
    </motion.div>
  );
}

// Animated Button Component
interface AnimatedButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'bounce' | 'pulse';
  disabled?: boolean;
}

export function AnimatedButton({
  children,
  className,
  onClick,
  variant = 'default',
  disabled = false,
}: AnimatedButtonProps) {
  const getVariants = () => {
    switch (variant) {
      case 'bounce':
        return animationVariants.bounce;
      case 'pulse':
        return animationVariants.pulse;
      default:
        return animationVariants.buttonInteraction;
    }
  };

  return (
    <motion.button
      className={cn('animated-button', className)}
      onClick={onClick}
      disabled={disabled}
      variants={getVariants()}
      initial="rest"
      whileHover={!disabled ? 'hover' : 'rest'}
      whileTap={!disabled ? 'tap' : 'rest'}
      animate={variant === 'pulse' ? 'pulse' : 'rest'}
    >
      {children}
    </motion.button>
  );
}

// Page Transition Component
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'fade' | 'slide' | 'scale';
}

export function PageTransition({
  children,
  className,
  variant = 'slide',
}: PageTransitionProps) {
  const getVariants = () => {
    switch (variant) {
      case 'fade':
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
          exit: { opacity: 0 },
        };
      case 'scale':
        return animationVariants.scaleFade;
      default:
        return animationVariants.fadeSlide;
    }
  };

  return (
    <motion.div
      className={cn('page-transition', className)}
      variants={getVariants()}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

// Micro Animation Component
interface MicroAnimationProps {
  children: React.ReactNode;
  className?: string;
  trigger?: 'hover' | 'tap' | 'focus' | 'inView';
  animation?: 'bounce' | 'pulse' | 'shake' | 'rotate' | 'scale';
  duration?: number;
}

export function MicroAnimation({
  children,
  className,
  trigger = 'hover',
  animation = 'bounce',
  duration = 0.3,
}: MicroAnimationProps) {
  const getAnimation = () => {
    switch (animation) {
      case 'bounce':
        return { scale: [1, 1.1, 1] };
      case 'pulse':
        return { scale: [1, 1.05, 1], opacity: [1, 0.8, 1] };
      case 'shake':
        return { x: [-2, 2, -2, 2, 0] };
      case 'rotate':
        return { rotate: [0, 5, -5, 0] };
      case 'scale':
        return { scale: [1, 1.05, 1] };
      default:
        return { scale: [1, 1.1, 1] };
    }
  };

  const animationProps = {
    transition: { duration, ease: 'easeInOut' },
  };

  const triggerProps = {
    [trigger === 'hover' ? 'whileHover' : 
     trigger === 'tap' ? 'whileTap' :
     trigger === 'focus' ? 'whileFocus' : 'animate']: getAnimation(),
  };

  return (
    <motion.div
      className={cn('micro-animation', className)}
      {...triggerProps}
      {...animationProps}
    >
      {children}
    </motion.div>
  );
}

// Loading Animation Component
interface LoadingAnimationProps {
  className?: string;
  variant?: 'spinner' | 'dots' | 'pulse' | 'wave';
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingAnimation({
  className,
  variant = 'spinner',
  size = 'md',
}: LoadingAnimationProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  if (variant === 'spinner') {
    return (
      <motion.div
        className={cn(
          'border-2 border-slate-200 border-t-orange-500 rounded-full',
          sizeClasses[size],
          className
        )}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    );
  }

  if (variant === 'dots') {
    return (
      <div className={cn('flex space-x-1', className)}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn(
              'bg-orange-500 rounded-full',
              size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3'
            )}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <motion.div
        className={cn(
          'bg-orange-500 rounded-full',
          sizeClasses[size],
          className
        )}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    );
  }

  // Wave variant
  return (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className={cn(
            'bg-orange-500',
            size === 'sm' ? 'w-1 h-4' : size === 'md' ? 'w-1 h-6' : 'w-2 h-8'
          )}
          animate={{
            scaleY: [1, 2, 1],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Entrance Animation Component
interface EntranceAnimationProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'fade' | 'scale' | 'rotate';
  delay?: number;
  duration?: number;
}

export function EntranceAnimation({
  children,
  className,
  variant = 'slideUp',
  delay = 0,
  duration = 0.5,
}: EntranceAnimationProps) {
  const getVariants = () => {
    switch (variant) {
      case 'slideUp':
        return {
          hidden: { opacity: 0, y: 50 },
          visible: { opacity: 1, y: 0 },
        };
      case 'slideDown':
        return {
          hidden: { opacity: 0, y: -50 },
          visible: { opacity: 1, y: 0 },
        };
      case 'slideLeft':
        return {
          hidden: { opacity: 0, x: 50 },
          visible: { opacity: 1, x: 0 },
        };
      case 'slideRight':
        return {
          hidden: { opacity: 0, x: -50 },
          visible: { opacity: 1, x: 0 },
        };
      case 'fade':
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        };
      case 'scale':
        return {
          hidden: { opacity: 0, scale: 0.8 },
          visible: { opacity: 1, scale: 1 },
        };
      case 'rotate':
        return {
          hidden: { opacity: 0, rotate: -10 },
          visible: { opacity: 1, rotate: 0 },
        };
      default:
        return {
          hidden: { opacity: 0, y: 50 },
          visible: { opacity: 1, y: 0 },
        };
    }
  };

  return (
    <motion.div
      className={cn('entrance-animation', className)}
      variants={getVariants()}
      initial="hidden"
      animate="visible"
      transition={{
        duration,
        delay,
        ease: [0.4, 0.0, 0.2, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

// Export all animation utilities
export {
  motion,
  AnimatePresence,
  type Variants,
  type Transition,
};

export default {
  StaggerContainer,
  StaggerItem,
  AnimatedCard,
  AnimatedButton,
  PageTransition,
  MicroAnimation,
  LoadingAnimation,
  EntranceAnimation,
  animationVariants,
  transitionPresets,
};