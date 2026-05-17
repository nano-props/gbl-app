// Log tab — `git log` for the currently selected branch. Refreshed on
// branch change and on tab switch, capped at 100 entries (any deeper
// dive belongs in the terminal). Click a row to open the commit detail
// overlay.

import { useReposStore } from '#/renderer/stores/repos.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import type { LogEntry } from '#/renderer/types.ts'

interface Props {
  repoId: string
  log: LogEntry[]
  branch: string
}

export function LogList({ repoId, log, branch }: Props) {
  const t = useT()
  const openCommit = useReposStore((s) => s.openCommit)

  if (log.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-ink-3">
        {branch ? t('log.emptyForBranch', { branch }) : t('log.empty')}
      </div>
    )
  }
  return (
    <ul className="overflow-y-auto scroll-thin flex-1 divide-y divide-line">
      {log.map((entry) => (
        <li
          key={entry.hash}
          data-interactive
          role="button"
          tabIndex={0}
          onClick={() => void openCommit(repoId, entry.hash)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              void openCommit(repoId, entry.hash)
            }
          }}
          className="px-4 py-2.5 cursor-pointer hover:bg-bg-deep"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-accent shrink-0">{entry.shortHash}</span>
            <span className="truncate text-sm text-ink">{entry.message}</span>
          </div>
          <div className="mt-0.5 text-xs text-ink-3">
            {entry.author} · {entry.date}
          </div>
        </li>
      ))}
    </ul>
  )
}
