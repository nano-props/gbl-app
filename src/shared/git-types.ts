// Git domain types shared by main (which produces them) and renderer
// (which consumes them via IPC). Putting these in `src/shared/` keeps
// main/renderer bundles independent — neither side has to import the
// other's module graph just to know what a `BranchInfo` looks like.

export interface BranchInfo {
  name: string
  isCurrent: boolean
  tracking?: string
  trackingGone?: boolean
  ahead: number
  behind: number
  lastCommitHash: string
  lastCommitMessage: string
  lastCommitDate: string
  lastCommitAuthor: string
  worktreePath?: string
  worktreeDirty?: boolean
}

export interface WorktreeInfo {
  path: string
  branch?: string
  isBare: boolean
  isDirty?: boolean
  changeCount?: number
}

export interface StatusEntry {
  x: string
  y: string
  path: string
}

export interface LogEntry {
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
}

export interface ExecResult {
  ok: boolean
  message: string
}
