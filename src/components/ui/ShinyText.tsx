/**
 * ShinyText Component - React Bits Integration
 * 
 * Premium text component with animated shimmer effect.
 * Creates an elegant shine animation that sweeps across text.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ShinyTextProps {
  text: string;
  className?: string;
  shimmerColor?: string;
  shimmerWidth?: number;
  speed?: number;
  disabled?: boolean;
}

export default function ShinyText({
  text,
  className,
  shimmerColor = '#ffffff',
  shimmerWidth = 100,
  speed = 2,
  disabled = false,
}: ShinyTextProps) {
  const shimmerVariants = {
    initial: {
      backgroundPosition: '-200% 0',
    },
    animate: {
      backgroundPosition: '200% 0',
      transition: {
        duration: speed,
        ease: 'linear',
        repeat: Infinity,
        repeatDelay: 1,
      },
    },
  };

  const shimmerStyle = {
    backgroundImage: `linear-gradient(
      90deg,
      transparent 0%,
      transparent 40%,
      ${shimmerColor}80 50%,
      transparent 60%,
      transparent 100%
    )`,
    backgroundSize: `${shimmerWidth}% 100%`,
    backgroundRepeat: 'no-repeat',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
  };

  if (disabled) {
    return <span className={className}>{text}</span>;
  }

  return (
    <motion.span
      className={cn('inline-block', className)}
      style={shimmerStyle}
      variants={shimmerVariants}
      initial="initial"
      animate="animate"
    >
      {text}
    </motion.span>
  );
}