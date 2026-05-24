import { operationBusy } from '#/renderer/stores/repos/operations.ts'
import type { RepoState } from '#/renderer/stores/repos/types.ts'

export function canStartRemoteFetch(repo: RepoState | undefined): repo is RepoState {
  if (!repo) return false
  return (
    !operationBusy(repo.ops.fetch) &&
    !operationBusy(repo.ops.branchAction) &&
    !operationBusy(repo.ops.snapshot) &&
    !operationBusy(repo.ops.status)
  )
}

export function isRemoteFetchDue(
  repo: RepoState | undefined,
  intervalMs: number,
  now: number = Date.now(),
): repo is RepoState {
  if (intervalMs <= 0 || !canStartRemoteFetch(repo)) return false
  return repo.ops.fetch.settledAt === null || now - repo.ops.fetch.settledAt >= intervalMs
}
