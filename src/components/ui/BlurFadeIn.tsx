import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface BlurFadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  yOffset?: number;
  once?: boolean;
}

export function BlurFadeIn({
  children,
  delay = 0,
  duration = 0.4,
  className,
  yOffset = 16,
  once = true,
}: BlurFadeInProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: '0px 0px -40px 0px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset, filter: 'blur(8px)' }}
      animate={
        isInView
          ? { opacity: 1, y: 0, filter: 'blur(0px)' }
          : { opacity: 0, y: yOffset, filter: 'blur(8px)' }
      }
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
