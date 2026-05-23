import { runExclusiveOperation } from '#/renderer/stores/repos/operation-runner.ts'
import { operationBusy } from '#/renderer/stores/repos/operations.ts'
import type { RepoBranchActionReason, RepoOperationReason } from '#/renderer/stores/repos/operations.ts'
import { canStartRemoteFetch } from '#/renderer/stores/repos/sync-state.ts'
import type {
  RepoBranchAction,
  RepoBranchActionKind,
  RunBranchActionOptions,
} from '#/renderer/stores/repos/branch-action-types.ts'
import type { RepoState, ReposGet, ReposSet } from '#/renderer/stores/repos/types.ts'
import type { ExecResult } from '#/renderer/types.ts'
import { rpc } from '#/renderer/rpc.ts'

const NETWORK_BRANCH_ACTIONS = new Set<RepoBranchActionKind>(['pull', 'push'])
const BRANCH_ACTION_REASON_BY_KIND: Record<RepoBranchActionKind, RepoBranchActionReason> = {
  checkout: 'branch:checkout',
  pull: 'branch:pull',
  push: 'branch:push',
  createWorktree: 'branch:createWorktree',
  deleteBranch: 'branch:deleteBranch',
  removeWorktree: 'branch:removeWorktree',
}
const BRANCH_ACTION_KIND_BY_REASON = Object.fromEntries(
  Object.entries(BRANCH_ACTION_REASON_BY_KIND).map(([kind, reason]) => [reason, kind]),
) as Record<RepoBranchActionReason, RepoBranchActionKind>
type NetworkRepoBranchAction = Extract<RepoBranchAction, { kind: 'pull' | 'push' }>
type NetworkFetchReason = Extract<RepoOperationReason, 'pull' | 'push'>
const NETWORK_FETCH_REASON_BY_KIND: Record<NetworkRepoBranchAction['kind'], NetworkFetchReason> = {
  pull: 'pull',
  push: 'push',
}

export function repoBranchActionReason(kind: RepoBranchActionKind): RepoBranchActionReason {
  return BRANCH_ACTION_REASON_BY_KIND[kind]
}

export function repoBranchActionKindFromReason(reason: RepoOperationReason | null): RepoBranchActionKind | null {
  return isRepoBranchActionReason(reason) ? BRANCH_ACTION_KIND_BY_REASON[reason] : null
}

function branchActionReason(action: RepoBranchAction): RepoBranchActionReason {
  return repoBranchActionReason(action.kind)
}

function isRepoBranchActionReason(reason: RepoOperationReason | null): reason is RepoBranchActionReason {
  return reason !== null && reason in BRANCH_ACTION_KIND_BY_REASON
}

function networkFetchReason(action: NetworkRepoBranchAction): NetworkFetchReason {
  return NETWORK_FETCH_REASON_BY_KIND[action.kind]
}

function isNetworkBranchAction(action: RepoBranchAction): action is NetworkRepoBranchAction {
  return NETWORK_BRANCH_ACTIONS.has(action.kind)
}

function canStartBranchNetwork(repo: RepoState): boolean {
  return canStartRemoteFetch(repo)
}

function runBranchActionRpc(action: RepoBranchAction, repoId: string, signal?: AbortSignal): Promise<ExecResult> {
  switch (action.kind) {
    case 'checkout':
      return rpc.repo.checkout.mutate({ cwd: repoId, branch: action.branch }, { signal })
    case 'pull':
      return rpc.repo.pull.mutate({ cwd: repoId, branch: action.branch, worktreePath: action.worktreePath }, { signal })
    case 'push':
      return rpc.repo.push.mutate({ cwd: repoId, branch: action.branch }, { signal })
    case 'createWorktree':
      return rpc.repo.createWorktree.mutate(
        {
          cwd: repoId,
          worktreePath: action.worktreePath,
          newBranch: action.newBranch,
          baseBranch: action.baseBranch,
        },
        { signal },
      )
    case 'deleteBranch':
      return rpc.repo.deleteBranch.mutate({ cwd: repoId, branch: action.branch, force: action.force }, { signal })
    case 'removeWorktree':
      return rpc.repo.removeWorktree.mutate(
        {
          cwd: repoId,
          branch: action.branch,
          worktreePath: action.worktreePath,
          alsoDeleteBranch: action.alsoDeleteBranch,
          forceDeleteBranch: action.forceDeleteBranch,
        },
        { signal },
      )
  }
  const exhaustive: never = action
  return exhaustive
}

export function createBranchActions(set: ReposSet, get: ReposGet) {
  return {
    async runBranchAction(
      id: string,
      action: RepoBranchAction,
      options?: RunBranchActionOptions,
    ): Promise<ExecResult | null> {
      const repoBefore = get().repos[id]
      if (!repoBefore) return null
      const token = options?.token ?? repoBefore.instanceToken
      if (repoBefore.instanceToken !== token) return null
      if (operationBusy(repoBefore.ops.branchAction, { includeSilent: true })) {
        return { ok: false, message: 'cancelled' }
      }
      const network = isNetworkBranchAction(action)
      if (network && !canStartBranchNetwork(repoBefore)) {
        const result = { ok: false, message: 'error.network-op-in-progress' }
        get().setLastResult(id, result, token)
        return result
      }
      return runExclusiveOperation({
        set,
        get,
        id,
        token,
        lane: network ? 'network' : 'write',
        priority: 100,
        targets: network
          ? [
              { select: (r) => r.ops.branchAction, reason: branchActionReason(action) },
              { select: (r) => r.ops.fetch, reason: networkFetchReason(action) },
            ]
          : [{ select: (r) => r.ops.branchAction, reason: branchActionReason(action) }],
        canStart: network ? canStartBranchNetwork : undefined,
        busyResult: network
          ? { ok: false, message: 'error.network-op-in-progress' }
          : { ok: false, message: 'cancelled' },
        task: (signal) => runBranchActionRpc(action, id, signal),
        errorFromResult: (result) => (!result.ok && result.message !== 'cancelled' ? result.message : null),
        onResult: async (result) => {
          if (result.message === 'cancelled') return
          if (options?.deferResultMessages?.includes(result.message)) return
          get().setLastResult(id, result, token)
          if (!result.ok && result.message === 'error.network-op-in-progress') return
          if (result.ok || options?.refreshOnError !== false) {
            await Promise.all([get().refreshSnapshot(id, { token }), get().refreshStatus(id, { token })])
          }
          if (result.ok && network) get().clearFetchFailed(id, token)
        },
        onError: (message) => {
          get().setLastResult(id, { ok: false, message }, token)
        },
      })
    },
  }
}
