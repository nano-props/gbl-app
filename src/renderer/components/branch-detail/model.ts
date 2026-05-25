import type { RepoState } from '#/renderer/stores/repos/types.ts'
import { idleOperation, operationBusy } from '#/renderer/stores/repos/operations.ts'

export type SelectedBranchDetail = ReturnType<typeof getSelectedBranchDetail>
export type SelectedBranchDetailPresentation = ReturnType<typeof getSelectedBranchDetailPresentation>

export function getSelectedBranchDetail(repo: RepoState) {
  const branch = repo.data.branches.find((b) => b.name === repo.ui.selectedBranch) ?? null
  const branchName = branch?.name ?? ''
  const branchLog = branchName ? repo.data.logsByBranch[branchName] : undefined
  const selectedStatus = branch?.worktreePath ? repo.data.status.filter((wt) => wt.path === branch.worktreePath) : []
  const statusCount = selectedStatus.reduce((n, wt) => n + wt.entries.length, 0)

  return { branch, branchLog, selectedStatus, statusCount }
}

export function getSelectedBranchDetailPresentation(repo: RepoState) {
  const detail = getSelectedBranchDetail(repo)
  const branchLogOperation = detail.branch ? (repo.ops.logsByBranch[detail.branch.name] ?? idleOperation()) : null
  const logLoading = branchLogOperation ? operationBusy(branchLogOperation) : false
  const logInitialLoading = logLoading && !detail.branchLog?.entries.length
  const logAppendLoading = logLoading && !!detail.branchLog?.entries.length
  const statusLoading = operationBusy(repo.ops.status)

  return {
    ...detail,
    loading: {
      status: statusLoading,
      pullRequests: operationBusy(repo.ops.pullRequests),
      commits: repo.ui.commitDetail.phase === 'opening' || logLoading,
      log: logLoading,
      logInitial: logInitialLoading,
      logAppend: logAppendLoading,
    },
    errors: {
      status: repo.ops.status.error,
    },
  }
}
