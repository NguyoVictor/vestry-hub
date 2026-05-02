import { BlurFadeIn } from '@/components/ui/BlurFadeIn';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  children,
  className,
}: PageHeaderProps) {
  return (
    <BlurFadeIn>
      <div
        className={cn(
          'flex items-start justify-between gap-4 mb-6',
          className
        )}
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {subtitle}
            </p>
          )}
          {children}
        </div>
        {action && (
          <div className="flex-shrink-0 flex items-center gap-2">
            {action}
          </div>
        )}
      </div>
    </BlurFadeIn>
  );
}
