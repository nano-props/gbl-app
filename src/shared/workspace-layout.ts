export const WORKSPACE_LAYOUTS = ['top-bottom', 'left-right'] as const

export type WorkspaceLayout = (typeof WORKSPACE_LAYOUTS)[number]
export type WorkspaceLayoutAxis = 'rows' | 'columns'

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayout = 'top-bottom'
export const DEFAULT_DETAIL_COLLAPSED = true

const WORKSPACE_LAYOUT_META = {
  'top-bottom': { axis: 'rows', detailCollapseAllowed: true },
  // Side-by-side layout always keeps both panes visible; collapsing the
  // detail pane would leave the branch list without its companion pane.
  'left-right': { axis: 'columns', detailCollapseAllowed: false },
} satisfies Record<WorkspaceLayout, { axis: WorkspaceLayoutAxis; detailCollapseAllowed: boolean }>

export function normalizeWorkspaceLayout(value: unknown): WorkspaceLayout {
  if (value === 'top-bottom' || value === 'left-right') return value
  return DEFAULT_WORKSPACE_LAYOUT
}

export function workspaceLayoutAxis(layout: WorkspaceLayout): WorkspaceLayoutAxis {
  return WORKSPACE_LAYOUT_META[layout].axis
}

export function workspaceLayoutAllowsDetailCollapse(layout: WorkspaceLayout): boolean {
  return WORKSPACE_LAYOUT_META[layout].detailCollapseAllowed
}

export function effectiveDetailCollapsed(layout: WorkspaceLayout, detailCollapsed: boolean): boolean {
  return workspaceLayoutAllowsDetailCollapse(layout) && detailCollapsed
}
