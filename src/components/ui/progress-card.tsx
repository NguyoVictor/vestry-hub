import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

interface AnimatedProgressCardProps {
  chaptersRead: number;
  totalChapters?: number;
  className?: string;
}

/**
 * AnimatedProgressCard — A card with an animated Framer Motion progress bar
 * Used in the sidebar Progress section
 */
export function AnimatedProgressCard({
  chaptersRead,
  totalChapters = 1189,
  className = '',
}: AnimatedProgressCardProps) {
  const percent = Math.round((chaptersRead / totalChapters) * 100);

  return (
    <Card className={`${className} font-jakarta`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Reading Progress</p>
            <p className="text-xs text-slate-500">{chaptersRead} / {totalChapters} chapters</p>
          </div>
        </div>
        
        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${percent}%` }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
          />
        </div>
        
        <p className="text-xs text-slate-500 mt-2 text-right">{percent}% complete</p>
      </CardContent>
    </Card>
  );
}
