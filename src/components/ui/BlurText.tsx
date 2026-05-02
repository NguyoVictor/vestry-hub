/**
 * BlurText Component - React Bits Integration
 * 
 * Premium text animation component that creates a blur-to-focus effect
 * with word-by-word or character-by-character animation.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BlurTextProps {
  text: string;
  className?: string;
  animateBy?: 'words' | 'characters';
  delay?: number;
  duration?: number;
  once?: boolean;
  trigger?: boolean;
}

export default function BlurText({
  text,
  className,
  animateBy = 'words',
  delay = 50,
  duration = 0.6,
  once = true,
  trigger = true,
}: BlurTextProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (trigger) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  const splitText = () => {
    if (animateBy === 'words') {
      return text.split(' ');
    } else {
      return text.split('');
    }
  };

  const textParts = splitText();

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: delay / 1000,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      filter: 'blur(10px)',
      y: 10,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        duration,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
  };

  return (
    <motion.div
      className={cn('inline-block', className)}
      variants={containerVariants}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
    >
      <AnimatePresence>
        {textParts.map((part, index) => (
          <motion.span
            key={`${part}-${index}`}
            variants={itemVariants}
            className="inline-block"
            style={{
              marginRight: animateBy === 'words' ? '0.25em' : '0',
            }}
          >
            {part}
            {animateBy === 'words' && index < textParts.length - 1 && ' '}
          </motion.span>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}