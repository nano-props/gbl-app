// Status tab — parsed `git status --porcelain` for the working tree.
// Entries are grouped into Staged / Unstaged / Untracked using git's
// X (index) / Y (worktree) two-letter convention. The two-letter code
// is preserved verbatim in the leading column (matches what users see
// in the terminal); a friendlier word + colour chip sits beside it.

import { useT } from '#/renderer/stores/i18n.ts'
import { cn } from '#/renderer/lib/cn.ts'
import type { StatusEntry } from '#/renderer/types.ts'

interface Props {
  status: StatusEntry[]
}

type Tone = 'success' | 'warning' | 'danger' | 'ink'
type LabelKey =
  | 'status.label.untracked'
  | 'status.label.ignored'
  | 'status.label.added'
  | 'status.label.deleted'
  | 'status.label.modified'
  | 'status.label.renamed'
  | 'status.label.copied'
  | 'status.label.conflict'
  | 'status.label.changed'

function statusLabel(x: string, y: string): { key: LabelKey; tone: Tone; raw?: string } {
  if (x === '?' && y === '?') return { key: 'status.label.untracked', tone: 'warning' }
  if (x === '!' && y === '!') return { key: 'status.label.ignored', tone: 'ink' }
  if (x === 'A') return { key: 'status.label.added', tone: 'success' }
  if (x === 'D' || y === 'D') return { key: 'status.label.deleted', tone: 'danger' }
  if (x === 'M' || y === 'M') return { key: 'status.label.modified', tone: 'warning' }
  if (x === 'R') return { key: 'status.label.renamed', tone: 'warning' }
  if (x === 'C') return { key: 'status.label.copied', tone: 'success' }
  if (x === 'U' || y === 'U') return { key: 'status.label.conflict', tone: 'danger' }
  const raw = `${x}${y}`.trim()
  return { key: 'status.label.changed', tone: 'ink', raw: raw || undefined }
}

interface Group {
  titleKey: string
  hintKey: string
  entries: StatusEntry[]
}

function groupStatus(entries: StatusEntry[]): Group[] {
  const staged: StatusEntry[] = []
  const unstaged: StatusEntry[] = []
  const untracked: StatusEntry[] = []
  for (const e of entries) {
    if (e.x === '?' && e.y === '?') {
      untracked.push(e)
    } else {
      if (e.x !== ' ' && e.x !== '?') staged.push(e)
      if (e.y !== ' ' && e.y !== '?') unstaged.push(e)
    }
  }
  const out: Group[] = []
  if (staged.length) out.push({ titleKey: 'status.staged', hintKey: 'status.stagedHint', entries: staged })
  if (unstaged.length) out.push({ titleKey: 'status.unstaged', hintKey: 'status.unstagedHint', entries: unstaged })
  if (untracked.length) out.push({ titleKey: 'status.untracked', hintKey: 'status.untrackedHint', entries: untracked })
  return out
}

export function StatusList({ status }: Props) {
  const t = useT()
  if (status.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div>
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--color-success-rgb)/0.1)] text-success">
            ✓
          </div>
          <div className="text-sm font-medium text-ink">{t('status.cleanTitle')}</div>
          <div className="text-xs text-ink-3 mt-1">{t('status.cleanBody')}</div>
        </div>
      </div>
    )
  }

  const groups = groupStatus(status)

  return (
    <div className="overflow-y-auto scroll-thin flex-1">
      {groups.map((group) => (
        <section key={group.titleKey} className="border-b border-line last:border-b-0">
          <header className="flex items-baseline justify-between px-4 py-1.5 bg-bg-deep border-b border-line">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">{t(group.titleKey)}</span>
              <span className="text-xs text-ink-3">{t(group.hintKey)}</span>
            </div>
            <span className="text-xs text-ink-3 font-mono">{group.entries.length}</span>
          </header>
          <ul className="divide-y divide-line">
            {group.entries.map((entry) => {
              const label = statusLabel(entry.x, entry.y)
              return (
                <li
                  key={`${group.titleKey}-${entry.path}`}
                  className="px-4 py-2 flex items-center gap-3"
                >
                  <span className="font-mono text-xs text-ink-3 shrink-0 w-7">
                    {entry.x}
                    {entry.y}
                  </span>
                  <span
                    className={cn(
                      'rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide shrink-0 min-w-[68px] text-center',
                      label.tone === 'success' && 'bg-[rgb(var(--color-success-rgb)/0.12)] text-success',
                      label.tone === 'warning' && 'bg-[rgb(var(--color-warning-rgb)/0.12)] text-warning',
                      label.tone === 'danger' && 'bg-[rgb(var(--color-danger-rgb)/0.12)] text-danger',
                      label.tone === 'ink' && 'bg-bg-deep text-ink-3',
                    )}
                  >
                    {label.raw ?? t(label.key)}
                  </span>
                  <span className="truncate text-sm text-ink-2 font-mono flex-1 min-w-0" title={entry.path}>
                    {entry.path}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
