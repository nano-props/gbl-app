import { cn } from '#/renderer/lib/cn.ts'

export function svgClass(className: string | undefined): string {
  return cn('pointer-events-none size-3.5 shrink-0', className)
}
