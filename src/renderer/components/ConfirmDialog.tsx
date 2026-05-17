// Inline confirm dialog — used by RepoActions to gate destructive
// operations (push to a protected branch, checkout with dirty tree).
// Built on Modal so Esc + click-outside both cancel.

import { Modal } from '#/renderer/components/Modal.tsx'
import { useT } from '#/renderer/stores/i18n.ts'
import { cn } from '#/renderer/lib/cn.ts'

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
    <Modal open={open} title={title} onClose={onCancel} widthClass="max-w-sm">
      <div className="space-y-4">
        <div className="text-sm text-ink-2 leading-relaxed">{message}</div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 inline-flex items-center rounded-md border border-line-2 bg-surface px-3 text-xs text-ink-2 hover:text-ink hover:bg-bg-deep"
          >
            {t('dialog.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'h-8 inline-flex items-center rounded-md px-3 text-xs font-medium shadow-sm hover:opacity-90',
              'text-[var(--color-btn-solid-text)]',
            )}
            style={{
              background: destructive ? 'var(--color-danger)' : 'var(--color-btn-solid)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
