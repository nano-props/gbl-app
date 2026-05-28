import type { RepoBranchActionKind } from '#/renderer/stores/repos/branch-action-types.ts'
import { resourceBusy } from '#/renderer/stores/repos/resources.ts'
import { repoOperationBusy } from '#/renderer/stores/repos/runtime.ts'
import type { RepoState } from '#/renderer/stores/repos/types.ts'

export type BranchActionItemId =
  | 'copyPatch'
  | 'checkout'
  | 'pull'
  | 'push'
  | 'remote'
  | 'terminal'
  | 'editor'
  | 'deleteBranch'
  | 'removeWorktree'

export function isBranchActionBlocked(repo: RepoState): boolean {
  return resourceBusy(repo.resources.branchAction) || repoOperationBusy(repo.id, 'branchAction')
}

export function branchActionItemIdFromKind(kind: RepoBranchActionKind | null): BranchActionItemId | null {
  switch (kind) {
    case 'checkout':
      return 'checkout'
    case 'pull':
      return 'pull'
    case 'push':
      return 'push'
    case 'deleteBranch':
      return 'deleteBranch'
    case 'removeWorktree':
      return 'removeWorktree'
    case 'createWorktree':
    case null:
      return null
  }
}

export function branchActionItemIdFromResource(repo: RepoState, branchName: string): BranchActionItemId | null {
  const action = repo.resources.branchAction
  if (!resourceBusy(action)) return null
  if (action.target !== branchName) return null
  return branchActionItemIdFromKind(action.kind)
}

export function branchActionBusyItemId(repo: RepoState, branchName: string): BranchActionItemId | null {
  return branchActionItemIdFromResource(repo, branchName)
}

export function branchActionDisplayPhase(repo: RepoState, branchName: string): 'queued' | 'running' | null {
  const action = repo.resources.branchAction
  if (!resourceBusy(action) || action.target !== branchName) return null
  return action.actionPhase ?? 'running'
}
