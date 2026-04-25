import * as React from 'react';
import { motion, useInView, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MasonryGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  gap?: string;
  staggerDelay?: number;
}

const GridItem = ({ children }: { children: React.ReactNode }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['6deg', '-6deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-6deg', '6deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    x.set((e.clientX - left) / width - 0.5);
    y.set((e.clientY - top) / height - 0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
      className="relative"
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        whileTap={{ scale: 0.97 }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

function MasonryGrid<T>({
  items,
  renderItem,
  className,
  gap = '1rem',
  staggerDelay = 0.06,
}: MasonryGridProps<T>) {
  const containerRef = React.useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.1 });

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: staggerDelay } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.96, filter: 'blur(6px)' },
    visible: {
      opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
      transition: { duration: 0.45, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      ref={containerRef}
      className={cn('w-full', className)}
      style={{ columnGap: gap }}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={containerVariants}
      role="list"
    >
      {items.map((item, index) => (
        <motion.div key={index} className="mb-4 break-inside-avoid" variants={itemVariants} role="listitem">
          <GridItem>{renderItem(item, index)}</GridItem>
        </motion.div>
      ))}
    </motion.div>
  );
}

export default MasonryGrid;
