import { toast } from 'sonner';

export function showPaywallToast(resource: string, addOnLabel?: string) {
  toast.error(`You've reached your ${resource} limit.`, {
    description: addOnLabel
      ? `Buy extra ${addOnLabel} or upgrade your plan to continue.`
      : `Upgrade your plan to continue.`,
    action: {
      label: 'View Plans',
      onClick: () => window.location.href = '/settings/billing',
    },
    duration: 6000,
  });
}