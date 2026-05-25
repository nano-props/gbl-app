import { operationBusy } from '#/renderer/stores/repos/operations.ts'
import type { RepoState } from '#/renderer/stores/repos/types.ts'

export interface RepoWorkspacePresentation {
  exists: boolean
  initialLoading: boolean
}

export function getRepoWorkspacePresentation(repo: RepoState | undefined): RepoWorkspacePresentation {
  return {
    exists: !!repo,
    initialLoading: !!repo && operationBusy(repo.ops.snapshot) && repo.data.branches.length === 0,
  }
}
