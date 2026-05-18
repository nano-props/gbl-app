// In-app Goblin wordmark. Plain typography — set in the theme
// foreground colour at a regular weight, sitting in the macOS
// title bar like a native window title.
//
// Uses the project's `--font-sans` stack (system UI face, e.g. SF Pro
// on macOS) at weight 500. We deliberately do NOT use `--font-display`
// here: that stack is Manrope, and `@font-face` only ships the 800
// weight asset — asking for 500 would either synthetic-bold to 800
// or silently fall back, which is what made earlier revisions of
// the wordmark read as bold.

import { cn } from '#/renderer/lib/cn.ts'

interface Props {
  /** Cap height of the wordmark in pixels. Default 13 (fits the topbar). */
  size?: number
  className?: string
}

export function Logo({ size = 13, className }: Props) {
  return (
    <span
      aria-label="Goblin"
      className={cn('inline-flex items-baseline align-middle select-none text-foreground', className)}
      style={{
        fontFamily: 'var(--font-sans)',
        fontWeight: 500,
        fontSize: `${size}px`,
        letterSpacing: `${size * 0.02}px`,
        lineHeight: 1,
      }}
    >
      Goblin
    </span>
  )
}
