import { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PermissionButtonProps extends ComponentPropsWithoutRef<typeof Button> {
  /** Explicit read-only state. When omitted, derived from `permission`. */
  readOnly?: boolean;
  /** Permission area (e.g. "financial_records"): read-only / no-access disables the button. */
  permission?: string;
  children: ReactNode;
}

export function PermissionButton({
  readOnly,
  permission,
  children,
  className,
  ...props
}: PermissionButtonProps) {
  // T15: `permission` used to be ignored (passed to the DOM), so buttons that
  // gave only a permission were never disabled for read-only staff.
  const { isReadOnly } = usePermissions();
  const locked = readOnly ?? (permission ? isReadOnly(permission) : false);
  if (!locked) {
    return (
      <Button className={className} {...props}>
        {children}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block">
            <Button
              {...props}
              disabled
              className={`${className ?? ''} pointer-events-none opacity-50`}
            >
              {children}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Read Only Access — contact your church admin to enable this action</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
