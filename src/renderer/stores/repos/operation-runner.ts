import type { Draft } from 'immer'
import { updateIfFresh } from '#/renderer/stores/repos/helpers.ts'
import {
  operationBusy,
  queueOperation,
  type RepoOperationReason,
  type RepoOperationState,
  settleOperation,
  startOperation,
} from '#/renderer/stores/repos/operations.ts'
import { nextRepoOperationId, scheduleRepoTask, type RepoTaskLane } from '#/renderer/stores/repos/runtime.ts'
import type { RepoState, ReposGet, ReposSet } from '#/renderer/stores/repos/types.ts'

type RepoDraft = Draft<RepoState>
export type RepoOperationSelector = (repo: RepoDraft) => RepoOperationState

export interface RepoOperationTarget {
  select: RepoOperationSelector
  reason: RepoOperationReason
  target?: string | null
}

interface RepoOperationContext {
  id: string
  token: number
  requestId: number
  isCurrent: () => boolean
}

interface RepoOperationBaseOptions<T> {
  set: ReposSet
  get: ReposGet
  id: string
  token?: number
  lane: RepoTaskLane
  priority: number
  targets: [RepoOperationTarget, ...RepoOperationTarget[]]
  task: (signal: AbortSignal) => Promise<T>
  operationKey?: string
  errorFromResult?: (result: T) => string | null
  onResult?: (result: T, ctx: RepoOperationContext) => void | Promise<void>
  onError?: (message: string, ctx: RepoOperationContext) => void | Promise<void>
  rethrow?: boolean
}

type RunLatestOperationOptions<T> = RepoOperationBaseOptions<T>

interface RunExclusiveOperationOptions<T> extends RepoOperationBaseOptions<T> {
  canStart?: (repo: RepoState) => boolean
  busyResult?: T
}

type InternalRepoOperationOptions<T> =
  | (RunLatestOperationOptions<T> & { policy: 'latest-wins' })
  | (RunExclusiveOperationOptions<T> & { policy: 'exclusive' })

function selectFromState(repo: RepoState, select: RepoOperationSelector): RepoOperationState {
  return select(repo as RepoDraft)
}

function operationCurrent(get: ReposGet, id: string, token: number, requestId: number, target: RepoOperationTarget) {
  const repo = get().repos[id]
  return !!repo && repo.instanceToken === token && selectFromState(repo, target.select).requestId === requestId
}

function anyTargetBusy(repo: RepoState, targets: RepoOperationTarget[]) {
  return targets.some((target) => operationBusy(selectFromState(repo, target.select)))
}

function markTargets(
  set: ReposSet,
  id: string,
  token: number,
  requestId: number,
  targets: RepoOperationTarget[],
  phase: 'queued' | 'running',
  wasQueued = false,
) {
  updateIfFresh(set, id, token, (repo) => {
    if (phase === 'running' && wasQueued) {
      const allTargetsQueuedForRequest = targets.every((target) => {
        const operation = target.select(repo)
        return operation.requestId === requestId && operation.phase === 'queued'
      })
      if (!allTargetsQueuedForRequest) return
    }
    for (const target of targets) {
      const operation = target.select(repo)
      if (phase === 'running') {
        startOperation(operation, requestId, { reason: target.reason, target: target.target })
      } else {
        queueOperation(operation, requestId, { reason: target.reason, target: target.target })
      }
    }
  })
}

function settleTargets(
  set: ReposSet,
  id: string,
  token: number,
  requestId: number,
  targets: RepoOperationTarget[],
  error: string | null,
) {
  updateIfFresh(set, id, token, (repo) => {
    for (const target of targets) {
      settleOperation(target.select(repo), requestId, { error })
    }
  })
}

async function runRepoOperation<T>(options: InternalRepoOperationOptions<T>): Promise<T | null> {
  const repoBefore = options.get().repos[options.id]
  if (!repoBefore) return null
  const token = options.token ?? repoBefore.instanceToken
  if (repoBefore.instanceToken !== token) return null
  const primary = options.targets[0]
  if (options.policy !== 'latest-wins') {
    const busy = anyTargetBusy(repoBefore, options.targets)
    if (busy || (options.canStart && !options.canStart(repoBefore))) return options.busyResult ?? null
  }

  const requestId = nextRepoOperationId(options.id)
  const ctx: RepoOperationContext = {
    id: options.id,
    token,
    requestId,
    isCurrent: () => operationCurrent(options.get, options.id, token, requestId, primary),
  }
  let error: string | null = null
  try {
    const result = await scheduleRepoTask(options.id, options.lane, options.task, {
      priority: options.priority,
      replaceQueuedKey:
        options.policy === 'latest-wins' ? `${options.lane}:${options.operationKey ?? primary.reason}` : undefined,
      onQueued: () => markTargets(options.set, options.id, token, requestId, options.targets, 'queued'),
      onStart: (wasQueued) =>
        markTargets(options.set, options.id, token, requestId, options.targets, 'running', wasQueued),
    })
    if (!ctx.isCurrent()) return null
    error = options.errorFromResult?.(result) ?? null
    await options.onResult?.(result, ctx)
    return result
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    if (ctx.isCurrent()) await options.onError?.(error, ctx)
    if (options.rethrow) throw err
    return null
  } finally {
    settleTargets(options.set, options.id, token, requestId, options.targets, error)
  }
}

export function runLatestOperation<T>(options: RepoOperationBaseOptions<T>): Promise<T | null> {
  return runRepoOperation({ ...options, policy: 'latest-wins' })
}

export function runExclusiveOperation<T>(options: RunExclusiveOperationOptions<T>): Promise<T | null> {
  return runRepoOperation({ ...options, policy: 'exclusive' })
}
