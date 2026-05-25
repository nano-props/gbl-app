import { operationBusy } from '#/renderer/stores/repos/operations.ts'
import type { RepoState } from '#/renderer/stores/repos/types.ts'

export type BranchActionItemId =
  | 'copyPatch'
  | 'checkout'
  | 'pull'
  | 'push'
  | 'github'
  | 'terminal'
  | 'editor'
  | 'deleteBranch'
  | 'removeWorktree'

export function isBranchActionBlocked(repo: RepoState): boolean {
  return operationBusy(repo.ops.branchAction)
}

export function branchActionItemIdFromOperation(repo: RepoState, branchName: string): BranchActionItemId | null {
  if (!operationBusy(repo.ops.branchAction)) return null
  if (repo.ops.branchAction.target !== branchName) return null
  switch (repo.ops.branchAction.reason) {
    case 'branch:checkout':
      return 'checkout'
    case 'branch:pull':
      return 'pull'
    case 'branch:push':
      return 'push'
    case 'branch:deleteBranch':
      return 'deleteBranch'
    case 'branch:removeWorktree':
      return 'removeWorktree'
    default:
      return null
  }
}
