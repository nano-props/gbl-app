// Lightweight modal — Radix Dialog under the hood. Radix gives us:
//   - proper focus trap (Tab/Shift+Tab cycle stays inside the panel)
//   - focus restoration to the triggering element on close
//   - aria-modal + aria-labelledby wiring
//   - Esc + click-outside dismissal
// Without those, keyboard users could Tab into the dimmed background
// and end up clicking buttons they couldn't see.

import * as Dialog from '@radix-ui/react-dialog'
import { type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useT } from '#/renderer/stores/i18n.ts'
import { cn } from '#/renderer/lib/cn.ts'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Tailwind width class. Default `max-w-md`. */
  widthClass?: string
}

export function Modal({ open, title, onClose, children, widthClass = 'max-w-md' }: Props) {
  const t = useT()

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40 bg-black/40 animate-in fade-in-0"
          // Radix already wires Esc / outside-click; we only need
          // styling here.
        />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[90vw] -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-line-2 bg-surface shadow-card',
            'animate-in zoom-in-95 fade-in-0 focus:outline-none',
            widthClass,
          )}
          // Default Radix behaviour focuses the first focusable child.
          // We keep that — overrides go on a per-modal basis if needed.
        >
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <Dialog.Title className="text-sm font-semibold text-ink">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="text-ink-3 hover:text-ink" title={t('dialog.close')} aria-label={t('dialog.close')}>
                <X size={16} />
              </button>
            </Dialog.Close>
          </header>
          <div className="p-4 max-h-[70vh] overflow-y-auto scroll-thin">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
