// Branches tab — the primary right-side view. Each row shows branch
// name, upstream, ahead/behind, optional worktree marker, and the head
// commit's hash + subject + author + relative date. The selected row
// scrolls into view automatically when the user moves with j/k so a
// long branch list doesn't strand the cursor offscreen.
//
// Worktree branches are visually distinct: the row's leading icon is
// replaced with a folder-tree glyph in accent color, and a coloured
// chip beside the name spells out the worktree path tail. This makes
// "this branch is checked out elsewhere" readable at a glance — the
// previous design buried the marker inside a row of small chips.

import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  FolderOpen,
  FolderTree,
  GitBranch,
  Terminal,
} from 'lucide-react'
import { useReposStore } from '#/renderer/stores/repos.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import { cn } from '#/renderer/lib/cn.ts'
import { lastPathSegment } from '#/renderer/lib/paths.ts'
import type { BranchInfo } from '#/renderer/types.ts'

interface Props {
  repoId: string
  branches: BranchInfo[]
  selected: string | null
  current: string
}

export function BranchList({ repoId, branches, selected, current }: Props) {
  const t = useT()
  const selectBranch = useReposStore((s) => s.selectBranch)
  const selectedRef = useRef<HTMLLIElement | null>(null)

  // Probe ghostty once. Same pattern as the old WorktreeList — cheap and
  // doesn't change mid-session, so a ref-style mount probe is enough.
  const [ghosttyInstalled, setGhosttyInstalled] = useState(false)
  useEffect(() => {
    let cancelled = false
    void window.gbl.ghosttyInstalled().then((ok) => {
      if (!cancelled) setGhosttyInstalled(ok)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Keep the selected row in view as the user navigates with j/k.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  if (branches.length === 0) {
    return <div className="p-6 text-center text-sm text-ink-3">{t('branches.empty')}</div>
  }

  return (
    <ul className="overflow-y-auto scroll-thin flex-1 divide-y divide-line">
      {branches.map((b) => {
        const isSelected = b.name === selected
        const isCurrent = b.name === current
        const isWorktree = !!b.worktreePath && !isCurrent
        return (
          <li
            key={b.name}
            ref={isSelected ? selectedRef : undefined}
            data-interactive
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={() => selectBranch(repoId, b.name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                selectBranch(repoId, b.name)
              }
            }}
            className={cn(
              'group flex cursor-pointer items-start gap-2 px-4 py-2.5 border-l-2',
              isSelected
                ? 'bg-bg-deep border-accent'
                : 'border-transparent hover:bg-bg-deep',
              // Worktree rows get a faint accent-tinted background so
              // the eye groups them away from "normal" branches.
              isWorktree && !isSelected && 'bg-[rgb(var(--color-accent-rgb)/0.04)]',
              isWorktree && isSelected && 'bg-[rgb(var(--color-accent-rgb)/0.08)]',
            )}
          >
            <div className="w-4 pt-0.5 shrink-0">
              {isCurrent ? (
                <Check size={14} className="text-success" />
              ) : isWorktree ? (
                <FolderTree size={14} className="text-accent" />
              ) : (
                <GitBranch size={14} className="text-ink-3" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="truncate font-medium text-ink">{b.name}</span>
                {isWorktree && b.worktreePath && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-sm px-1.5 py-0 text-[10px] font-medium',
                      b.worktreeDirty
                        ? 'bg-[rgb(var(--color-warning-rgb)/0.14)] text-warning'
                        : 'bg-[rgb(var(--color-accent-rgb)/0.12)] text-accent',
                    )}
                    title={b.worktreePath}
                  >
                    <FolderTree size={10} />
                    {lastPathSegment(b.worktreePath)}
                    {b.worktreeDirty && (
                      <span className="ml-0.5 uppercase tracking-wide">· {t('branches.dirty')}</span>
                    )}
                  </span>
                )}
                {b.tracking && (
                  <span
                    className={cn(
                      'rounded-sm border border-line-2 px-1 py-0 text-[10px] font-mono leading-4',
                      b.trackingGone
                        ? 'text-warning border-[rgb(var(--color-warning-rgb)/0.4)]'
                        : 'text-ink-3',
                    )}
                  >
                    {b.trackingGone ? `${b.tracking} (${t('branches.gone')})` : b.tracking}
                  </span>
                )}
                {b.ahead > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-success">
                    <ArrowUp size={11} />
                    {b.ahead}
                  </span>
                )}
                {b.behind > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-warning">
                    <ArrowDown size={11} />
                    {b.behind}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-3">
                <span className="font-mono shrink-0">{b.lastCommitHash}</span>
                <span className="truncate">{b.lastCommitMessage || '—'}</span>
              </div>
              <div className="mt-0.5 text-xs text-ink-4">
                {b.lastCommitAuthor} · {b.lastCommitDate}
              </div>
            </div>
            <div className="shrink-0 flex items-start gap-1 pt-0.5">
              {b.worktreePath && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {ghosttyInstalled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void window.gbl.openInGhostty(b.worktreePath!)
                      }}
                      className="p-1 rounded text-ink-3 hover:text-ink hover:bg-bg"
                      title={t('worktrees.openInGhosttyTitle')}
                      aria-label={t('worktrees.openInGhosttyTitle')}
                    >
                      <Terminal size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void window.gbl.openInFinder(b.worktreePath!)
                    }}
                    className="p-1 rounded text-ink-3 hover:text-ink hover:bg-bg"
                    title={t('worktrees.revealTitle')}
                    aria-label={t('worktrees.revealTitle')}
                  >
                    <FolderOpen size={13} />
                  </button>
                </div>
              )}
              {!b.tracking && (
                <AlertTriangle size={12} className="mt-1 text-ink-4" aria-label={t('branches.noUpstream')} />
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
