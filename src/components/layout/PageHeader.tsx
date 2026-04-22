import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-side action buttons */
  actions?: ReactNode;
  /** @deprecated Use `actions` instead */
  action?: ReactNode;
  className?: string;
}

/**
 * Consistent page header used at the top of every page.
 * Renders title + optional subtitle on the left, action buttons on the right.
 *
 * @example
 * <PageHeader
 *   title="Members"
 *   subtitle="Manage your church members and their information"
 *   actions={
 *     <>
 *       <Button variant="outline" size="sm">Export</Button>
 *       <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
 *         <UserPlus className="h-4 w-4 mr-1.5" />Add Member
 *       </Button>
 *     </>
 *   }
 * />
 */
export function PageHeader({ title, subtitle, actions, action, className }: PageHeaderProps) {
  const rightSlot = actions ?? action;

  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6 font-jakarta", className)}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {rightSlot && (
        <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>
      )}
    </div>
  );
}
