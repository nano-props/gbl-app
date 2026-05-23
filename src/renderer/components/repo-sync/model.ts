import type { RepoState } from '#/renderer/stores/repos/types.ts'
import { branchForVisibleLog } from '#/renderer/stores/repos/branch-view-mode.ts'
import { canStartRemoteFetch } from '#/renderer/stores/repos/sync-state.ts'
import { idleOperation, operationBusy } from '#/renderer/stores/repos/operations.ts'

export type RepoSyncStage = 'cache' | 'branches' | 'status' | 'prs' | 'log' | 'remote'

export interface RepoSyncActivity {
  stage: RepoSyncStage
  labelKey: string
}

const STAGE_LABEL_KEYS: Record<RepoSyncStage, string> = {
  cache: 'tab.refreshing-cache',
  branches: 'tab.refreshing-branches',
  status: 'tab.refreshing-status',
  prs: 'tab.refreshing-prs',
  log: 'tab.refreshing-log',
  remote: 'tab.refreshing-remote',
}

export function getRepoSyncActivity(repo: RepoState): RepoSyncActivity | null {
  const branchForLog = branchForVisibleLog(repo)
  const logLoading = branchForLog
    ? (repo.data.logsByBranch[branchForLog]?.loading ?? false) ||
      operationBusy(repo.ops.logsByBranch[branchForLog] ?? idleOperation())
    : false
  const snapshotLoading = operationBusy(repo.ops.snapshot)
  const branchActionLoading = operationBusy(repo.ops.branchAction)
  const statusLoading = operationBusy(repo.ops.status)
  const pullRequestsLoading = operationBusy(repo.ops.pullRequests)
  const remoteLoading = operationBusy(repo.ops.fetch)
  const stage =
    repo.cache.source === 'cache' && operationBusy(repo.ops.snapshot)
      ? 'cache'
      : snapshotLoading || branchActionLoading
        ? 'branches'
        : statusLoading
          ? 'status'
          : pullRequestsLoading
            ? 'prs'
            : logLoading
              ? 'log'
              : remoteLoading
                ? 'remote'
                : null

  return stage ? { stage, labelKey: STAGE_LABEL_KEYS[stage] } : null
}

export function isRepoSyncBlocked(repo: RepoState): boolean {
  return !canStartRemoteFetch(repo)
}
