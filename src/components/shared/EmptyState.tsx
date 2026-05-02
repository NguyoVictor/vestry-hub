import { BlurFadeIn } from '@/components/ui/BlurFadeIn';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  iconColor = 'text-violet-500',
  iconBg = 'bg-violet-100 dark:bg-violet-950/30',
  className,
}: EmptyStateProps) {
  return (
    <BlurFadeIn>
      <div
        className={cn(
          'flex flex-col items-center justify-center',
          'py-16 px-8 text-center',
          className
        )}
      >
        <div
          className={cn(
            'w-16 h-16 rounded-2xl flex items-center',
            'justify-center mb-4',
            iconBg
          )}
        >
          <Icon className={cn('w-8 h-8', iconColor)} />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-4">
            {description}
          </p>
        )}
        {action}
      </div>
    </BlurFadeIn>
  );
}
