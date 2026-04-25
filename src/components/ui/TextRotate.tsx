import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TextRotateProps {
  texts: string[];
  interval?: number;
  className?: string;
  charClassName?: string;
  staggerDuration?: number;
  exitDuration?: number;
}

export function TextRotate({
  texts,
  interval = 2800,
  className,
  charClassName,
  staggerDuration = 0.03,
  exitDuration = 0.2,
}: TextRotateProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % texts.length);
    }, interval);
    return () => clearInterval(timer);
  }, [texts.length, interval]);

  const currentText = texts[index];

  return (
    <span className={cn('inline-flex overflow-hidden', className)}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentText}
          className="inline-flex"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: staggerDuration } },
            exit: { transition: { staggerChildren: staggerDuration / 2, staggerDirection: -1 } },
          }}
        >
          {currentText.split('').map((char, i) => (
            <motion.span
              key={i}
              className={cn('inline-block', charClassName)}
              variants={{
                hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
                visible: {
                  opacity: 1, y: 0, filter: 'blur(0px)',
                  transition: { type: 'spring', stiffness: 400, damping: 28 },
                },
                exit: {
                  opacity: 0, y: -16, filter: 'blur(4px)',
                  transition: { duration: exitDuration, ease: 'easeIn' },
                },
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
