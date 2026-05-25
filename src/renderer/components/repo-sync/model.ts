import type { RepoState } from '#/renderer/stores/repos/types.ts'
import { canStartRemoteFetch } from '#/renderer/stores/repos/sync-state.ts'
import { operationBusy } from '#/renderer/stores/repos/operations.ts'

export type RepoSyncStage = 'cache' | 'branches' | 'status' | 'prs' | 'log' | 'remote'

export interface RepoSyncActivity {
  stage: RepoSyncStage
  labelKey: string
}

export interface RepoSyncPresentation {
  rawBlocked: boolean
  visibleActivity: RepoSyncActivity | null
  visualBusy: boolean
  visualDisabled: boolean
}

const STAGE_LABEL_KEYS: Record<RepoSyncStage, string> = {
  cache: 'tab.refreshing-cache',
  branches: 'tab.refreshing-branches',
  status: 'tab.refreshing-status',
  prs: 'tab.refreshing-prs',
  log: 'tab.refreshing-log',
  remote: 'tab.refreshing-remote',
}

const STAGE_ACTIVITIES = Object.fromEntries(
  Object.entries(STAGE_LABEL_KEYS).map(([stage, labelKey]) => [stage, { stage, labelKey }]),
) as Record<RepoSyncStage, RepoSyncActivity>

export function getRepoSyncActivity(repo: RepoState): RepoSyncActivity | null {
  const logLoading = Object.values(repo.ops.logsByBranch).some(operationBusy)
  const snapshotLoading = operationBusy(repo.ops.snapshot)
  const branchActionLoading = operationBusy(repo.ops.branchAction)
  const statusLoading = operationBusy(repo.ops.status)
  const pullRequestsLoading = operationBusy(repo.ops.pullRequests)
  const remoteLoading = operationBusy(repo.ops.fetch)
  const stage =
    repo.cache.source === 'cache' && snapshotLoading
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

  return stage ? STAGE_ACTIVITIES[stage] : null
}

export function isRepoSyncBlocked(repo: RepoState): boolean {
  return !canStartRemoteFetch(repo)
}

export function getRepoSyncPresentation(
  repo: RepoState,
  visibleActivity: RepoSyncActivity | null,
): RepoSyncPresentation {
  const rawBlocked = isRepoSyncBlocked(repo)
  const visualBusy = visibleActivity !== null
  return {
    rawBlocked,
    visibleActivity,
    visualBusy,
    // Once an operation is visible as loading, keep the button visually and
    // interactively in one state instead of showing a spinner on an enabled
    // ghost button. `rawBlocked` still gates the click before the delayed
    // loading affordance appears.
    visualDisabled: visualBusy,
  }
}
