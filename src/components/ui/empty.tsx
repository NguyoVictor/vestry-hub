import { cn } from "@/lib/utils";

interface EmptyProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function Empty({ icon: Icon, title, description, action, className }: EmptyProps) {
  return (
    <div
      className={cn(
        "font-jakarta flex flex-col items-center justify-center py-16 gap-3 text-center",
        className
      )}
    >
      <Icon className="h-12 w-12 text-slate-300" />
      <p className="text-base font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      {description && (
        <p className="text-sm text-slate-400 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
