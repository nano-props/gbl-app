// In-app GBL wordmark. Uses the Manrope 800 face declared in styles.css
// — same font + letter-spacing as the packaged Dock icon, so an icon
// peeking from the OS sidebar reads as the same brand. The amber dot
// in the top-right is the only chrome; everything else is type.
//
// Sized via `size` (the wordmark height in px). Internal layout is in
// em so it scales linearly — a 18px logo and a 48px logo share one
// stylesheet.

import { cn } from '#/renderer/lib/cn.ts'

interface Props {
  /** Cap height of the wordmark in pixels. Default 18 (fits the topbar). */
  size?: number
  className?: string
}

export function Logo({ size = 18, className }: Props) {
  return (
    <span
      aria-label="GBL"
      className={cn('relative inline-flex items-baseline align-middle select-none', className)}
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: `${size}px`,
        letterSpacing: `${size * 0.04}px`,
        lineHeight: 1,
        color: 'var(--color-accent)',
      }}
    >
      GBL
      {/* Top-right dot — positioned in em units relative to the wordmark
       * cap height so it tracks the type at any scale. The negative
       * top + right tucks it into the tittle position above the L. */}
      <span
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: `${size * 0.2}px`,
          height: `${size * 0.2}px`,
          top: `${-size * 0.18}px`,
          right: `${-size * 0.16}px`,
          background: 'var(--color-warning)',
          boxShadow: `0 ${size * 0.04}px ${size * 0.16}px rgb(var(--color-warning-rgb) / 0.45)`,
        }}
      />
    </span>
  )
}
