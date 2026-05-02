/**
 * Magnet Component - React Bits Integration
 * 
 * Premium interactive component that creates a magnetic attraction effect.
 * Elements are drawn towards the cursor with smooth spring animations.
 */

import React, { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MagnetProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  range?: number;
  restoreSpeed?: number;
  disabled?: boolean;
}

export default function Magnet({
  children,
  className,
  strength = 0.3,
  range = 100,
  restoreSpeed = 0.15,
  disabled = false,
}: MagnetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || disabled) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    if (distance < range) {
      const factor = (range - distance) / range;
      const magnetX = distanceX * strength * factor;
      const magnetY = distanceY * strength * factor;

      x.set(magnetX);
      y.set(magnetY);
    } else {
      x.set(0);
      y.set(0);
    }
  }, [disabled, strength, range, x, y]);

  const handleMouseEnter = useCallback(() => {
    if (!disabled) {
      setIsHovered(true);
    }
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      className={cn('inline-block', className)}
      style={{
        x: disabled ? 0 : springX,
        y: disabled ? 0 : springY,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={{
        scale: isHovered && !disabled ? 1.05 : 1,
      }}
      transition={{
        duration: restoreSpeed,
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
}