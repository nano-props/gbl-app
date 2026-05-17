// Thin wrapper around Radix Tooltip with the project's styling. Wrap
// any element that needs a hover label; the tooltip renders into a
// portal and survives `position: fixed` ancestors. Use this instead
// of the native `title=` attribute for any tooltip we want to style
// or compose with kbd chips.

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

interface Props {
  label: ReactNode
  /** Side of the trigger to anchor against. Default 'bottom'. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** ms before tooltip opens. Default 200. */
  delayMs?: number
  children: ReactNode
}

export function Tip({ label, side = 'bottom', delayMs = 200, children }: Props) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayMs}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className="z-50 rounded-md border border-line-2 bg-surface px-2 py-1 text-xs text-ink-2 shadow-card animate-in fade-in-0 zoom-in-95"
          >
            {label}
            <TooltipPrimitive.Arrow className="fill-[var(--color-surface)] stroke-[var(--color-line-2)]" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
