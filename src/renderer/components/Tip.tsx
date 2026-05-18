// Thin wrapper around shadcn/ui Tooltip with the project's preferred
// defaults (200ms open delay, anchor below the trigger). Wrap any
// element that needs a hover label; Radix renders into a portal and
// survives `position: fixed` ancestors. Use this instead of the
// native `title=` attribute for any tooltip we want to style or
// compose with kbd chips.

import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '#/renderer/components/ui/tooltip.tsx'

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
    <TooltipProvider delayDuration={delayMs}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} sideOffset={6}>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
