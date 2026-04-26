import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TextRotateProps {
  texts: string[];
  interval?: number;
  className?: string;
}

export function TextRotate({ texts, interval = 2800, className }: TextRotateProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % texts.length);
    }, interval);
    return () => clearInterval(timer);
  }, [texts.length, interval]);

  return (
    // min-w keeps the h1 from collapsing when the word transitions
    <span className={cn('relative inline-block', className)} style={{ minWidth: '1ch' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={texts[index]}
          className="inline-block whitespace-nowrap"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          {texts[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
