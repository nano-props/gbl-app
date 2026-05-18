// Confirm dialog for destructive operations (push to a protected
// branch, checkout with dirty tree). Built on shadcn/ui AlertDialog
// rather than Dialog so it gets the right semantics for AT users:
//   - role=alertdialog (vs role=dialog)
//   - focus lands on the cancel action by default, not the confirm
//   - Esc + outside-click both cancel
// The `destructive` flag swaps the confirm button's variant so an
// irreversible action reads as red rather than neutral.

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/renderer/components/ui/alert-dialog.tsx'
import { useT } from '#/renderer/stores/i18n.ts'

interface Props {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel: string
  /** Renders the confirm button red. Use for genuinely irreversible ops. */
  destructive?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel, destructive, onCancel, onConfirm }: Props) {
  const t = useT()
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {/* AlertDialogDescription wants string or inline content; we
           * pass arbitrary ReactNode so we render the body as a child
           * of the description for AT, but keep ours rich-content. */}
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground leading-relaxed">{message}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t('dialog.cancel')}</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
