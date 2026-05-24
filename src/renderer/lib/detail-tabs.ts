import type { DetailTab } from '#/renderer/stores/repos/types.ts'

export const DETAIL_TABS = [
  { id: 'status', labelKey: 'tab.status' },
  { id: 'changes', labelKey: 'tab.changes' },
  { id: 'commits', labelKey: 'tab.log' },
  { id: 'terminal', labelKey: 'tab.terminal' },
] as const satisfies readonly { id: DetailTab; labelKey: string }[]

export function visibleDetailTabs(hasWorktree: boolean) {
  return hasWorktree ? DETAIL_TABS : DETAIL_TABS.filter((tab) => tab.id !== 'terminal')
}

export function adjacentDetailTab(current: DetailTab, direction: 1 | -1, hasWorktree = true): DetailTab {
  const tabs = visibleDetailTabs(hasWorktree)
  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === current),
  )
  return tabs[(index + direction + tabs.length) % tabs.length].id
}
