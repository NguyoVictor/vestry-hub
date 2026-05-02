/**
 * Simple replacements for React Bits components
 * 
 * These are lightweight alternatives that don't require react-native-web
 * and work seamlessly with Vite.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Simple ShinyPageTitle replacement
interface ShinyPageTitleProps {
  title: string;
  className?: string;
}

export function ShinyPageTitle({ title, className }: ShinyPageTitleProps) {
  return (
    <motion.h1
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'text-3xl font-bold bg-gradient-to-r from-slate-900 via-orange-600 to-slate-900 bg-clip-text text-transparent dark:from-slate-100 dark:via-orange-400 dark:to-slate-100',
        'bg-[length:200%_auto] animate-gradient',
        className
      )}
    >
      {title}
    </motion.h1>
  );
}

// Simple SpotlightCard replacement
interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function SpotlightCard({ children, className, onClick }: SpotlightCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700',
        'bg-white dark:bg-slate-800',
        'shadow-sm hover:shadow-lg transition-shadow duration-200',
        'cursor-pointer',
        className
      )}
    >
      {/* Spotlight effect on hover */}
      <motion.div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(249, 115, 22, 0.1) 0%, transparent 50%)',
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

// Simple TiltedCard replacement
interface TiltedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function TiltedCard({ children, className, onClick }: TiltedCardProps) {
  const [rotateX, setRotateX] = React.useState(0);
  const [rotateY, setRotateY] = React.useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateXValue = ((y - centerY) / centerY) * -10;
    const rotateYValue = ((x - centerX) / centerX) * 10;
    
    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={{
        rotateX,
        rotateY,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ transformStyle: 'preserve-3d' }}
      className={cn(
        'relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700',
        'bg-white dark:bg-slate-800',
        'shadow-sm hover:shadow-xl transition-shadow duration-200',
        'cursor-pointer',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

// Simple MagneticButton replacement
interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function MagneticButton({ 
  children, 
  className, 
  onClick,
  disabled = false 
}: MagneticButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'transition-all duration-200',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </motion.button>
  );
}

// Simple FadeContent replacement
interface FadeContentProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function FadeContent({ 
  children, 
  className,
  delay = 0 
}: FadeContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Simple BlurText replacement
interface BlurTextProps {
  text?: string;
  children?: React.ReactNode;
  className?: string;
  delay?: number;
}

export function BlurText({ 
  text, 
  children, 
  className,
  delay = 0 
}: BlurTextProps) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(10px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {text || children}
    </motion.div>
  );
}
