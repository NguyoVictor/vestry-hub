/**
 * TiltedCard Component - React Bits Integration
 * 
 * Premium card component with 3D tilt effect that responds to mouse movement.
 * Creates an interactive depth effect for enhanced user engagement.
 */

import React, { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TiltedCardProps {
  children: React.ReactNode;
  className?: string;
  tiltMaxAngleX?: number;
  tiltMaxAngleY?: number;
  perspective?: number;
  scale?: number;
  transitionEasing?: string;
  transitionDuration?: number;
  transformOrigin?: string;
  glareEnable?: boolean;
  glareMaxOpacity?: number;
  glareColor?: string;
  glarePosition?: string;
  gyroscope?: boolean;
  disabled?: boolean;
}

export default function TiltedCard({
  children,
  className,
  tiltMaxAngleX = 15,
  tiltMaxAngleY = 15,
  perspective = 1000,
  scale = 1.05,
  transitionEasing = 'cubic-bezier(0.03, 0.98, 0.52, 0.99)',
  transitionDuration = 400,
  transformOrigin = 'center',
  glareEnable = true,
  glareMaxOpacity = 0.7,
  glareColor = '#ffffff',
  glarePosition = 'bottom',
  gyroscope = true,
  disabled = false,
}: TiltedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseYSpring = useSpring(y, { stiffness: 500, damping: 100 });

  const rotateX = useTransform(
    mouseYSpring,
    [-0.5, 0.5],
    [tiltMaxAngleX, -tiltMaxAngleX]
  );
  const rotateY = useTransform(
    mouseXSpring,
    [-0.5, 0.5],
    [-tiltMaxAngleY, tiltMaxAngleY]
  );

  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], [0, 100]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || disabled) return;

    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = (e.clientX - rect.left - width / 2) / width;
    const mouseY = (e.clientY - rect.top - height / 2) / height;

    x.set(mouseX);
    y.set(mouseY);
  }, [disabled, x, y]);

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
      ref={cardRef}
      className={cn(
        'relative transform-gpu transition-all duration-200',
        !disabled && 'cursor-pointer',
        className
      )}
      style={{
        perspective: `${perspective}px`,
        transformOrigin,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={{
        scale: isHovered && !disabled ? scale : 1,
      }}
      transition={{
        duration: transitionDuration / 1000,
        ease: transitionEasing,
      }}
    >
      <motion.div
        className="relative h-full w-full transform-gpu"
        style={{
          rotateX: disabled ? 0 : rotateX,
          rotateY: disabled ? 0 : rotateY,
        }}
        transition={{
          duration: transitionDuration / 1000,
          ease: transitionEasing,
        }}
      >
        {/* Glare effect */}
        {glareEnable && !disabled && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(${glarePosition === 'top' ? '0deg' : glarePosition === 'right' ? '90deg' : glarePosition === 'bottom' ? '180deg' : '270deg'}, transparent 0%, ${glareColor} 50%, transparent 100%)`,
              opacity: isHovered ? glareMaxOpacity : 0,
              backgroundPosition: `${glareX.get()}% ${glareY.get()}%`,
              backgroundSize: '200% 200%',
            }}
            transition={{
              duration: transitionDuration / 1000,
              ease: transitionEasing,
            }}
          />
        )}

        {/* Content */}
        {children}
      </motion.div>
    </motion.div>
  );
}