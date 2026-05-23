import { ChevronDown, Loader2 } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { useReposStore } from '#/renderer/stores/repos/store.ts'
import { idleOperation, operationBusy } from '#/renderer/stores/repos/operations.ts'
import type { RepoState, DetailTab } from '#/renderer/stores/repos/types.ts'
import { useSettingsStore } from '#/renderer/stores/settings.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import { Badge } from '#/renderer/components/ui/badge.tsx'
import { Button } from '#/renderer/components/ui/button.tsx'
import { BranchActionBar } from '#/renderer/components/BranchActionBar.tsx'
import { Toolbar } from '#/renderer/components/Layout.tsx'
import { DETAIL_TABS } from '#/renderer/lib/detail-tabs.ts'
import { cn } from '#/renderer/lib/cn.ts'
import type { SelectedBranchDetail } from '#/renderer/components/branch-detail/model.ts'

interface Props {
  repo: RepoState
  detail: SelectedBranchDetail
  detailId: string
  contentId: string
  collapsed: boolean
}

export function BranchDetailToolbar({ repo, detail, detailId, contentId, collapsed }: Props) {
  const t = useT()
  const setDetailTab = useReposStore((s) => s.setDetailTab)
  const setDetailCollapsed = useReposStore((s) => s.setDetailCollapsed)
  const toggleDetailCollapsed = useReposStore((s) => s.toggleDetailCollapsed)
  const shortcutsDisabled = useSettingsStore((s) => s.shortcutsDisabled)
  const logLoading =
    detail.branchLog?.loading ||
    operationBusy(repo.ops.logsByBranch[detail.branch?.name ?? ''] ?? idleOperation(), { includeSilent: true })

  if (!detail.branch) return null

  function handleTabKeyDown(e: KeyboardEvent<HTMLButtonElement>, tabId: DetailTab) {
    const current = DETAIL_TABS.findIndex((tab) => tab.id === tabId)
    const last = DETAIL_TABS.length - 1
    const next =
      e.key === 'ArrowRight'
        ? (current + 1) % DETAIL_TABS.length
        : e.key === 'ArrowLeft'
          ? (current - 1 + DETAIL_TABS.length) % DETAIL_TABS.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : -1
    if (next === -1) return
    e.preventDefault()
    const nextTab = DETAIL_TABS[next]
    setDetailTab(repo.id, nextTab.id)
    setDetailCollapsed(false)
    window.requestAnimationFrame(() => document.getElementById(`${detailId}-${nextTab.id}-tab`)?.focus())
  }

  return (
    <Toolbar variant="detail">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDetailCollapsed}
        aria-label={t(collapsed ? 'branch-detail.expand' : 'branch-detail.collapse')}
        title={t(
          shortcutsDisabled
            ? collapsed
              ? 'branch-detail.expand'
              : 'branch-detail.collapse'
            : collapsed
              ? 'branch-detail.expand-title'
              : 'branch-detail.collapse-title',
        )}
        aria-expanded={!collapsed}
        aria-controls={collapsed ? undefined : contentId}
        className="size-7"
      >
        <ChevronDown className={cn(collapsed && '-rotate-90')} />
      </Button>
      <div className="flex shrink-0" role="tablist" aria-label={t('tab.branch-detail')}>
        {DETAIL_TABS.map((tab) => {
          const selected = repo.ui.detailTab === tab.id
          const visuallySelected = !collapsed && selected
          return (
            <button
              key={tab.id}
              id={`${detailId}-${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              // Keep tabs switchable while the commits list loads; aria-busy only announces the panel's pending work.
              aria-busy={tab.id === 'commits' && logLoading}
              aria-controls={collapsed ? undefined : `${detailId}-${tab.id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                setDetailTab(repo.id, tab.id)
                setDetailCollapsed(false)
              }}
              onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
              className={cn(
                'h-9 px-3 text-sm border-b-2 -mb-px cursor-pointer transition-colors duration-100',
                visuallySelected
                  ? 'border-brand text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t(tab.labelKey)}
              {tab.id === 'changes' && detail.statusCount > 0 && (
                <Badge variant="attention" className="ml-1.5 rounded-full">
                  {detail.statusCount}
                </Badge>
              )}
              {tab.id === 'commits' && logLoading && (
                <Loader2 size={11} className="ml-1.5 inline animate-spin text-muted-foreground" />
              )}
            </button>
          )
        })}
      </div>
      <BranchActionBar key={`${repo.id}:${detail.branch.name}`} repo={repo} branch={detail.branch} />
    </Toolbar>
  )
}
