import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, the confirm button renders in red */
  destructive?: boolean;
  /** Called when the user clicks confirm */
  onConfirm: () => void;
  /** Whether the confirm action is in progress */
  loading?: boolean;
}

/**
 * Reusable confirmation dialog built on shadcn AlertDialog.
 *
 * @example
 * <ConfirmDialog
 *   open={deleteOpen}
 *   onOpenChange={setDeleteOpen}
 *   title="Delete member?"
 *   description="This action cannot be undone."
 *   confirmLabel="Delete"
 *   destructive
 *   onConfirm={() => deleteMutation.mutate(memberId)}
 *   loading={deleteMutation.isPending}
 * />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="font-jakarta max-w-md rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold text-slate-900">
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-sm text-slate-500 leading-relaxed">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            className="font-jakarta border-slate-200 text-slate-600 hover:bg-slate-50"
            disabled={loading}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className={cn(
              "font-jakarta font-semibold",
              destructive
                ? "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500"
                : "bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-500"
            )}
          >
            {loading ? "Please wait…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
