import type { DetailTab, ReposGet } from '#/renderer/stores/repos/types.ts'

// Fire-and-forget refresh orchestration. Callers pass the repo token captured
// when the UI change happened; refresh methods still own final repo-exists and
// stale-token validation before writing results.
export function runInitialRepoLoad(get: ReposGet, refresh: { id: string; token: number }): void {
  void get().refreshSnapshot(refresh.id, { token: refresh.token })
  void get().refreshStatus(refresh.id, { token: refresh.token })
}

export function runBranchViewModeChangedWorkflow(
  get: ReposGet,
  options: {
    id: string
    token: number
    selectedForLog: string | null
    selectedForPullRequest: string | null
    shouldRefreshLog: boolean
  },
): void {
  if (options.shouldRefreshLog && options.selectedForLog) {
    void get().refreshBranchLog(options.id, options.selectedForLog, { token: options.token })
  }
  if (options.selectedForPullRequest) {
    void get().refreshPullRequests(options.id, [options.selectedForPullRequest], {
      token: options.token,
      mode: 'full',
    })
  }
}

export function runDetailTabChangedWorkflow(
  get: ReposGet,
  options: { id: string; token: number; tab: DetailTab | undefined; selectedBranch: string | null | undefined },
): void {
  if (options.tab === 'commits') void get().refreshBranchLog(options.id, undefined, { token: options.token })
  if (options.tab === 'changes') void get().refreshStatus(options.id, { token: options.token })
  if (options.tab === 'status' && options.selectedBranch) {
    void get().refreshPullRequests(options.id, [options.selectedBranch], { token: options.token, mode: 'full' })
  }
}

export function runSelectedBranchChangedWorkflow(
  get: ReposGet,
  options: { id: string; token: number; branch: string; tab: DetailTab | undefined },
): void {
  if (options.tab === 'commits') void get().refreshBranchLog(options.id, options.branch, { token: options.token })
  void get().refreshPullRequests(options.id, [options.branch], { token: options.token, mode: 'full' })
}

export function runSelectedBranchStatusWorkflow(
  get: ReposGet,
  options: { id: string; token: number; selectedBranch: string | null | undefined },
): void {
  if (options.selectedBranch) {
    void get().refreshPullRequests(options.id, [options.selectedBranch], { token: options.token, mode: 'full' })
  }
}

export async function runBranchActionRefreshWorkflow(
  get: ReposGet,
  options: { id: string; token: number },
): Promise<void> {
  await Promise.all([
    get().refreshSnapshot(options.id, { token: options.token }),
    get().refreshStatus(options.id, { token: options.token }),
  ])
}
