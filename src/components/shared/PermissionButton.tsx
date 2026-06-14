import { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PermissionButtonProps extends ComponentPropsWithoutRef<typeof Button> {
  readOnly?: boolean;
  children: ReactNode;
}

export function PermissionButton({
  readOnly = false,
  children,
  className,
  ...props
}: PermissionButtonProps) {
  if (!readOnly) {
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
