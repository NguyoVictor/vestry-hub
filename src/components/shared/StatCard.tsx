import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;
  iconBg?: string;
  trend?: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  iconColor = 'text-violet-600',
  iconBg = 'bg-violet-100 dark:bg-violet-950/40',
  trend,
  className,
}: StatCardProps) {
  return (
    <motion.div
      className={cn(
        'rounded-xl border border-border/50 bg-card',
        'p-4 flex items-center gap-4',
        'hover:shadow-md transition-shadow duration-200',
        className
      )}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center',
          'justify-center flex-shrink-0',
          iconBg
        )}
      >
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">
          {label}
        </p>
        <p className="text-xl font-bold text-foreground leading-tight">
          {value}
        </p>
        {trend && (
          <p className="text-xs text-muted-foreground mt-0.5">{trend}</p>
        )}
      </div>
    </motion.div>
  );
}
