import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Bold heading */
  title: string;
  /** Descriptive sub-text */
  description?: string;
  /** CTA button or any ReactNode */
  action?: ReactNode;
  /** Extra classes on the container */
  className?: string;
}

/**
 * Centered empty state with icon, title, description, and optional CTA.
 * Use whenever a list, table, or section has no data.
 *
 * @example
 * <EmptyState
 *   icon={Users}
 *   title="No members yet"
 *   description="Add your first member to get started."
 *   action={
 *     <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
 *       <UserPlus className="h-4 w-4 mr-1.5" />Add Member
 *     </Button>
 *   }
 * />
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center font-jakarta",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <p className="text-base font-semibold text-slate-700 mb-1">{title}</p>
      {description && (
        <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-5">{description}</p>
      )}
      {action && !description && <div className="mt-5">{action}</div>}
      {action && description && <div>{action}</div>}
    </div>
  );
}
