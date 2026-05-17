// Left sidebar — one row per opened repository. Click to focus, hover to
// reveal the close (×) button. The active row gets a left accent border
// and surface-coloured background so it pops against the deeper sidebar
// fill.

import { useShallow } from 'zustand/react/shallow'
import { useStoreWithEqualityFn } from 'zustand/traditional'
import { AlertCircle, X } from 'lucide-react'
import { useReposStore } from '#/renderer/stores/repos.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import { cn } from '#/renderer/lib/cn.ts'

/** Sidebar row data. Projecting RepoState down to these three string
 *  fields means subscribing to `s.repos` doesn't make us re-render
 *  on every refresh of branches/log/status. */
interface TabSummary {
  id: string
  name: string
  currentBranch: string
}

/** Equality fn for the summaries array. Zustand's `useShallow` does
 *  Object.is on each element — but we re-create the inner objects
 *  every selector run, so refs always differ. Compare the relevant
 *  string fields explicitly so the sidebar only re-renders when the
 *  rendered text actually changes. */
function summariesEqual(a: TabSummary[], b: TabSummary[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!
    const y = b[i]!
    if (x.id !== y.id || x.name !== y.name || x.currentBranch !== y.currentBranch) return false
  }
  return true
}

export function RepoTabs() {
  const t = useT()
  // Build the summary array inside the selector but compare with our
  // explicit equality fn so re-derivations with identical contents
  // don't trigger a re-render. Zustand v5's primary `useReposStore`
  // hook drops the second-arg equality fn — `useStoreWithEqualityFn`
  // from `zustand/traditional` is the v5 escape hatch for cases like
  // this where shallow on Object.is misses the structurally-equal
  // case.
  const summaries = useStoreWithEqualityFn(
    useReposStore,
    (s) =>
      s.order
        .map<TabSummary | null>((id) => {
          const r = s.repos[id]
          return r ? { id: r.id, name: r.name, currentBranch: r.currentBranch } : null
        })
        .filter((x): x is TabSummary => x !== null),
    summariesEqual,
  )
  const activeId = useReposStore((s) => s.activeId)
  const setActive = useReposStore((s) => s.setActive)
  const closeRepo = useReposStore((s) => s.closeRepo)
  const missing = useReposStore(useShallow((s) => s.missingFromSession))
  const dismissMissing = useReposStore((s) => s.dismissMissing)

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-bg-deep">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-3 border-b border-line">
        {t('sidebar.repos')}
      </div>
      <div className="flex-1 overflow-y-auto scroll-thin">
        {summaries.length === 0 ? (
          <div className="px-3 py-6 text-xs text-ink-3 leading-relaxed">
            {t('sidebar.empty.before')}
            <span className="text-ink-2">{t('sidebar.empty.openLabel')}</span>
            {t('sidebar.empty.after')}
          </div>
        ) : (
          summaries.map((repo) => {
            const isActive = repo.id === activeId
            return (
              <div
                key={repo.id}
                data-interactive
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onClick={() => setActive(repo.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActive(repo.id)
                  }
                }}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2 cursor-pointer border-l-2 text-sm',
                  isActive
                    ? 'border-accent bg-surface text-ink'
                    : 'border-transparent text-ink-2 hover:bg-bg hover:text-ink',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{repo.name}</div>
                  <div className="truncate text-xs text-ink-3">{repo.currentBranch || repo.id}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeRepo(repo.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-ink p-0.5 rounded"
                  title={t('sidebar.close')}
                  aria-label={t('sidebar.close')}
                >
                  <X size={14} />
                </button>
              </div>
            )
          })
        )}

        {missing.length > 0 && (
          <div className="border-t border-line mt-2 pt-2 px-3 pb-3">
            <div className="flex items-start gap-1.5 text-xs">
              <AlertCircle size={12} className="mt-0.5 shrink-0 text-warning" />
              <div className="flex-1 min-w-0">
                <div className="text-ink-2 font-medium mb-1">
                  {t('sidebar.missingTitle', { n: missing.length })}
                </div>
                <ul className="space-y-0.5 mb-2">
                  {missing.map((p) => (
                    <li key={p} className="truncate font-mono text-[11px] text-ink-3" title={p}>
                      {p}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={dismissMissing}
                  className="text-[11px] text-ink-3 hover:text-ink underline-offset-2 hover:underline"
                >
                  {t('sidebar.missingDismiss')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
