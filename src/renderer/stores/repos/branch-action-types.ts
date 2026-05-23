export type RepoBranchAction =
  | { kind: 'checkout'; branch: string }
  | { kind: 'pull'; branch: string; worktreePath?: string }
  | { kind: 'push'; branch: string }
  | { kind: 'createWorktree'; worktreePath: string; newBranch: string; baseBranch: string }
  | { kind: 'deleteBranch'; branch: string; force?: boolean }
  | {
      kind: 'removeWorktree'
      branch: string
      worktreePath: string
      alsoDeleteBranch: boolean
      forceDeleteBranch?: boolean
    }

export type RepoBranchActionKind = RepoBranchAction['kind']

export interface RunBranchActionOptions {
  token?: number
  deferResultMessages?: string[]
  refreshOnError?: boolean
}
