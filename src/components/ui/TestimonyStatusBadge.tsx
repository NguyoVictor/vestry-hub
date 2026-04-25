import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestimonyStatusBadgeProps {
  status: 'pending' | 'approved' | 'declined';
  className?: string;
}

const config = {
  pending: {
    icon: Clock,
    label: 'Pending Review',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-400',
  },
  approved: {
    icon: CheckCircle,
    label: 'Published',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-400',
  },
  declined: {
    icon: XCircle,
    label: 'Declined',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-400',
  },
};

export function TestimonyStatusBadge({ status, className }: TestimonyStatusBadgeProps) {
  const c = config[status];
  const Icon = c.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
      c.bg, c.border, c.text, className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', c.dot, status === 'pending' && 'animate-pulse')} />
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}
