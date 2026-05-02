/**
 * FadeContent Component - React Bits Integration
 * 
 * Premium content transition component with smooth fade animations.
 * Perfect for tab content, modal transitions, and dynamic content changes.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FadeContentProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  show?: boolean;
  mode?: 'wait' | 'sync' | 'popLayout';
}

export default function FadeContent({
  children,
  className,
  duration = 0.3,
  delay = 0,
  direction = 'up',
  distance = 20,
  show = true,
  mode = 'wait',
}: FadeContentProps) {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: distance, x: 0 };
      case 'down':
        return { y: -distance, x: 0 };
      case 'left':
        return { x: distance, y: 0 };
      case 'right':
        return { x: -distance, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  };

  const variants = {
    hidden: {
      opacity: 0,
      ...getInitialPosition(),
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration,
        delay,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
    exit: {
      opacity: 0,
      ...getInitialPosition(),
      transition: {
        duration: duration * 0.8,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
  };

  return (
    <AnimatePresence mode={mode}>
      {show && (
        <motion.div
          className={cn('w-full', className)}
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}