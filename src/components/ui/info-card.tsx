import { cn } from "@/lib/utils";

interface InfoCardProps {
  children: React.ReactNode;
  className?: string;
  accentColor?: string; // hex string, e.g. "#6366f1"
}

export function InfoCard({ children, className, accentColor }: InfoCardProps) {
  return (
    <div
      className={cn(
        "font-jakarta bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm",
        className
      )}
      style={accentColor ? { borderLeft: `4px solid ${accentColor}` } : undefined}
    >
      {children}
    </div>
  );
}
