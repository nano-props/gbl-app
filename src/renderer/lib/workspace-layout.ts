import { effectiveDetailCollapsed, workspaceLayoutAllowsDetailCollapse } from '#/shared/workspace-layout.ts'
import type { WorkspaceLayout } from '#/renderer/types-bridge.ts'

export interface RepoWorkspaceBehavior {
  detailCollapsed: boolean
  detailCollapseAllowed: boolean
  branchListActionsVisible: boolean
  detailActionVariant: 'bar' | 'auto'
  prTooltipSide: 'right' | 'bottom'
}

const REPO_WORKSPACE_BEHAVIOR = {
  'top-bottom': {
    branchListActionsVisible: true,
    detailActionVariant: 'bar',
    prTooltipSide: 'right',
  },
  'left-right': {
    branchListActionsVisible: false,
    detailActionVariant: 'auto',
    prTooltipSide: 'bottom',
  },
} satisfies Record<WorkspaceLayout, Omit<RepoWorkspaceBehavior, 'detailCollapsed' | 'detailCollapseAllowed'>>

export function repoWorkspaceBehavior(layout: WorkspaceLayout, detailCollapsed: boolean): RepoWorkspaceBehavior {
  return {
    ...REPO_WORKSPACE_BEHAVIOR[layout],
    detailCollapseAllowed: workspaceLayoutAllowsDetailCollapse(layout),
    detailCollapsed: effectiveDetailCollapsed(layout, detailCollapsed),
  }
}
