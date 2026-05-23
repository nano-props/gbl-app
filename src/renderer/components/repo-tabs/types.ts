export interface RepoTabSummary {
  id: string
  name: string
}

export interface RepoTabStripLabels {
  repositories: string
  emptyBefore: string
  emptyOpenLabel: string
  emptyAfter: string
  close: string
  dragToReorder: string
  open: string
  openLocal: string
  openLocalShortcut: string | null
  clone: string
  cloneShortcut: string | null
  missingTitle: string
  missingDismiss: string
}
