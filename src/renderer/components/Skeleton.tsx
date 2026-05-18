// Skeleton row used as a placeholder while a list loads. Pulses via CSS
// keyframe so the user sees motion (not a frozen list) during the IPC
// round-trip. We render a fixed number of rows — the real list usually
// has dozens, so a half-dozen skeletons is enough to fill the visible
// area without committing to an exact count.

import { cn } from '#/renderer/lib/cn.ts'

interface Props {
  rows?: number
  /** Layout flavour:
   *  - "branch": two-line row with hash + subject (matches BranchList)
   *  - "log": single-line + tiny meta (matches LogList)
   *  - "status": label chip + path (matches StatusList) */
  variant?: 'branch' | 'log' | 'status'
}

export function ListSkeleton({ rows = 6, variant = 'branch' }: Props) {
  return (
    <ul className="flex-1 divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="px-4 py-2.5 flex items-start gap-2">
          {variant === 'status' ? (
            <>
              <Bar w="32px" h="14px" />
              <Bar w="60px" h="14px" />
              <Bar w="60%" h="14px" />
            </>
          ) : (
            <>
              <Bar w="14px" h="14px" round className="mt-0.5" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Bar w="35%" h="14px" />
                  {variant === 'branch' && <Bar w="60px" h="10px" />}
                </div>
                <Bar w={variant === 'log' ? '70%' : '85%'} h="11px" />
                {variant === 'branch' && <Bar w="40%" h="10px" />}
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

function Bar({
  w,
  h,
  round,
  className,
}: {
  w: string
  h: string
  round?: boolean
  className?: string
}) {
  return (
    <span
      className={cn('block bg-muted animate-pulse', round ? 'rounded-full' : 'rounded', className)}
      style={{ width: w, height: h }}
    />
  )
}
