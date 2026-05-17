// Active-repo body. Header (name + path + actions) sits above a
// row of sub-tabs (Branches / Log / Status / Worktrees); error and
// result banners slide in between. Each sub-tab body fills the
// remaining vertical space.

import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useReposStore, type RightTab } from '#/renderer/stores/repos.ts'
import { BranchList } from '#/renderer/components/BranchList.tsx'
import { LogList } from '#/renderer/components/LogList.tsx'
import { StatusList } from '#/renderer/components/StatusList.tsx'
import { WorktreeList } from '#/renderer/components/WorktreeList.tsx'
import { CommitDetail } from '#/renderer/components/CommitDetail.tsx'
import { RepoActions } from '#/renderer/components/RepoActions.tsx'
import { ListSkeleton } from '#/renderer/components/Skeleton.tsx'
import { useT } from '#/renderer/stores/i18n.ts'
import { cn } from '#/renderer/lib/cn.ts'

const TAB_KEYS: { id: RightTab; key: string; hotkey: string }[] = [
  { id: 'branches', key: 'tab.branches', hotkey: '⌘1' },
  { id: 'log', key: 'tab.log', hotkey: '⌘2' },
  { id: 'status', key: 'tab.status', hotkey: '⌘3' },
  { id: 'worktrees', key: 'tab.worktrees', hotkey: '⌘4' },
]

interface Props {
  repoId: string
}

export function RepoView({ repoId }: Props) {
  const t = useT()
  const repo = useReposStore((s) => s.repos[repoId])
  const setRightTab = useReposStore((s) => s.setRightTab)
  const setLastResult = useReposStore((s) => s.setLastResult)

  // Auto-clear result toast — but only successes. Errors have multi-
  // line git output the user typically needs more than 4s to read; we
  // leave them up until the user dismisses with the × button.
  useEffect(() => {
    if (!repo?.lastResult || !repo.lastResult.ok) return
    const id = setTimeout(() => setLastResult(repoId, null), 4000)
    return () => clearTimeout(id)
  }, [repo?.lastResult, repoId, setLastResult])

  if (!repo) return <div />

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">{repo.name}</div>
            <div className="truncate text-xs text-ink-3">{repo.id}</div>
          </div>
          {repo.fetching && (
            <span className="flex items-center gap-1 text-xs text-ink-3" title={t('tab.fetchingTitle')}>
              <Loader2 size={12} className="animate-spin" />
              {t('tab.fetching')}
            </span>
          )}
          {!repo.fetching && repo.fetchFailed && (
            <span
              className="flex items-center gap-1 text-xs text-warning"
              // Hover surfaces the actual git error (e.g. "fatal: could
              // not read Username") so the user can act on it; without
              // a real message we fall back to the generic title.
              title={repo.fetchError ?? t('tab.fetchFailedTitle')}
              aria-label={repo.fetchError ?? t('tab.fetchFailedTitle')}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning" />
              {t('tab.fetchFailed')}
            </span>
          )}
        </div>
        <RepoActions repo={repo} />
      </header>

      <nav className="flex border-b border-line bg-bg-deep px-2">
        {TAB_KEYS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setRightTab(repoId, tab.id)}
            title={tab.hotkey}
            className={cn(
              'h-9 px-3 text-sm border-b-2 -mb-px',
              repo.rightTab === tab.id ? 'border-accent text-ink' : 'border-transparent text-ink-3 hover:text-ink',
            )}
          >
            {t(tab.key)}
            {tab.id === 'status' && repo.status.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-warning/20 text-warning text-[10px] px-1.5">
                {repo.status.length}
              </span>
            )}
            {tab.id === 'worktrees' && repo.worktrees.length > 1 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-bg text-ink-3 text-[10px] px-1.5 border border-line">
                {repo.worktrees.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {repo.error && (
        <div className="border-b border-[rgb(var(--color-danger-rgb)/0.25)] bg-[rgb(var(--color-danger-rgb)/0.08)] px-4 py-1.5 text-xs text-danger">
          {/* Errors set by the store may be either a translation key
            * (looked up in the dict) or a raw git/system message. The
            * dict lookup `t()` falls back to the key itself when the
            * key isn't found, so this works for both. */}
          {t(repo.error)}
        </div>
      )}
      {repo.lastResult && (
        <div
          className={cn(
            'border-b px-4 py-1.5 text-xs flex items-start gap-2',
            repo.lastResult.ok
              ? 'border-[rgb(var(--color-success-rgb)/0.25)] bg-[rgb(var(--color-success-rgb)/0.08)] text-success'
              : 'border-[rgb(var(--color-danger-rgb)/0.25)] bg-[rgb(var(--color-danger-rgb)/0.08)] text-danger',
          )}
        >
          <span className="font-medium shrink-0">
            {repo.lastResult.ok ? t('action.resultOk') : t('action.resultError')}
          </span>
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] flex-1">{repo.lastResult.message}</pre>
          <button type="button" onClick={() => setLastResult(repoId, null)} className="text-ink-3 hover:text-ink">
            ×
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 flex-col">
        {repo.openCommit ? (
          <CommitDetail repoId={repoId} detail={repo.openCommit} />
        ) : (
          <>
            {repo.rightTab === 'branches' &&
              (repo.loading && repo.branches.length === 0 ? (
                <ListSkeleton variant="branch" />
              ) : (
                <BranchList repoId={repoId} branches={repo.branches} selected={repo.selectedBranch} current={repo.currentBranch} />
              ))}
            {repo.rightTab === 'log' &&
              (repo.log.length === 0 && repo.loading ? (
                <ListSkeleton variant="log" />
              ) : (
                <LogList repoId={repoId} log={repo.log} branch={repo.selectedBranch ?? repo.currentBranch} />
              ))}
            {repo.rightTab === 'status' && <StatusList status={repo.status} />}
            {repo.rightTab === 'worktrees' && <WorktreeList worktrees={repo.worktrees} />}
          </>
        )}
      </div>
    </section>
  )
}
