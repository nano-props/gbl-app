import type { RepoState } from '#/renderer/stores/repos/types.ts'

export type RepoOperationKind = 'fetch' | 'snapshot' | 'status' | 'pullRequests' | 'branchAction'
export type RepoOperationPhase = 'idle' | 'queued' | 'running'
export type RepoBranchActionReason =
  | 'branch:checkout'
  | 'branch:pull'
  | 'branch:push'
  | 'branch:createWorktree'
  | 'branch:deleteBranch'
  | 'branch:removeWorktree'
export type RepoPullRequestReason = 'summary' | 'full'
export type RepoOperationReason =
  | 'background-fetch'
  | 'fetch'
  | 'network'
  | 'log'
  | 'pull'
  | 'push'
  | 'snapshot'
  | 'status'
  | 'pullRequests'
  | 'user-fetch'
  | RepoPullRequestReason
  | RepoBranchActionReason

export interface RepoOperationState {
  requestId: number
  phase: RepoOperationPhase
  reason: RepoOperationReason | null
  silent: boolean
  startedAt: number | null
  settledAt: number | null
  error: string | null
}

export interface RepoOperationsState {
  fetch: RepoOperationState
  snapshot: RepoOperationState
  status: RepoOperationState
  pullRequests: RepoOperationState
  branchAction: RepoOperationState
  logsByBranch: Record<string, RepoOperationState>
}

export function idleOperation(): RepoOperationState {
  return {
    requestId: 0,
    phase: 'idle',
    reason: null,
    silent: false,
    startedAt: null,
    settledAt: null,
    error: null,
  }
}

export function runningOperation(options?: {
  requestId?: number
  reason?: RepoOperationReason
  silent?: boolean
}): RepoOperationState {
  const operation = idleOperation()
  startOperation(operation, options?.requestId ?? 0, { reason: options?.reason, silent: options?.silent })
  return operation
}

export function emptyRepoOperations(): RepoOperationsState {
  return {
    fetch: idleOperation(),
    snapshot: idleOperation(),
    status: idleOperation(),
    pullRequests: idleOperation(),
    branchAction: idleOperation(),
    logsByBranch: {},
  }
}

export function idleRepoOperations(): RepoOperationsState {
  return {
    fetch: idleOperation(),
    snapshot: idleOperation(),
    status: idleOperation(),
    pullRequests: idleOperation(),
    branchAction: idleOperation(),
    logsByBranch: {},
  }
}

export function startOperation(
  operation: RepoOperationState,
  requestId: number,
  options?: { reason?: RepoOperationReason; silent?: boolean },
): void {
  operation.requestId = requestId
  operation.phase = 'running'
  operation.reason = options?.reason ?? null
  operation.silent = options?.silent === true
  operation.startedAt = Date.now()
  operation.settledAt = null
  operation.error = null
}

export function queueOperation(
  operation: RepoOperationState,
  requestId: number,
  options?: { reason?: RepoOperationReason; silent?: boolean },
): void {
  operation.requestId = requestId
  operation.phase = 'queued'
  operation.reason = options?.reason ?? null
  operation.silent = options?.silent === true
  operation.startedAt = null
  operation.settledAt = null
  operation.error = null
}

export function settleOperation(
  operation: RepoOperationState,
  requestId: number,
  options?: { error?: string | null },
): boolean {
  if (operation.requestId !== requestId) return false
  operation.phase = 'idle'
  operation.settledAt = Date.now()
  operation.error = options?.error ?? null
  return true
}

export function operationBusy(operation: RepoOperationState, options?: { includeSilent?: boolean }): boolean {
  if (operation.phase === 'idle') return false
  return options?.includeSilent === true || !operation.silent
}

export function repoOperation(repo: RepoState, kind: RepoOperationKind): RepoOperationState {
  return repo.ops[kind]
}

export function isRepoOperationCurrent(
  repo: RepoState | undefined,
  kind: RepoOperationKind,
  requestId: number,
): boolean {
  return !!repo && repoOperation(repo, kind).requestId === requestId
}
