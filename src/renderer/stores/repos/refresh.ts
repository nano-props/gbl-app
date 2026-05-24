import { appendRepoEvent, errorEvent, inFlightFetchById, updateIfFresh } from '#/renderer/stores/repos/helpers.ts'
import { branchForVisibleLog, selectedBranchForBranchSet } from '#/renderer/stores/repos/branch-view-mode.ts'
import {
  runExclusiveOperation,
  runLatestOperation,
  type RepoOperationSelector,
} from '#/renderer/stores/repos/operation-runner.ts'
import { persistRepoCache } from '#/renderer/stores/repos/persistence.ts'
import { canStartRemoteFetch } from '#/renderer/stores/repos/sync-state.ts'
import { idleOperation, operationBusy } from '#/renderer/stores/repos/operations.ts'
import { branchPullRequestBelongsToBranch } from '#/shared/git-types.ts'
import type { RepoOperationReason, RepoPullRequestReason } from '#/renderer/stores/repos/operations.ts'
import type { BranchLogState, ReposGet, ReposSet } from '#/renderer/stores/repos/types.ts'
import type { ExecResult, LogEntry, PullRequestFetchMode, PullRequestInfo } from '#/renderer/types.ts'
import { rpc } from '#/renderer/rpc.ts'

export const INITIAL_LOG_COUNT = 30
export const LOG_PAGE_SIZE = 30
export const MAX_LOG_COUNT = 300

function emptyBranchLog(): BranchLogState {
  return { entries: [], selectedHash: null, loading: false, hasMore: false }
}

function logPage(entries: LogEntry[], pageSize: number): { entries: LogEntry[]; hasMore: boolean } {
  return { entries: entries.slice(0, pageSize), hasMore: entries.length > pageSize }
}

function mergePullRequest(
  previous: { pullRequest?: PullRequestInfo },
  next: PullRequestInfo,
  mode: PullRequestFetchMode,
): PullRequestInfo {
  const existing = previous.pullRequest
  if (mode === 'full' || !existing || existing.number !== next.number || existing.url !== next.url) return next
  return {
    ...next,
    checks: existing.checks ?? next.checks,
    reviewDecision: existing.reviewDecision !== undefined ? existing.reviewDecision : next.reviewDecision,
    mergeable: existing.mergeable ?? next.mergeable,
  }
}

export function createRefreshActions(set: ReposSet, get: ReposGet) {
  function repoFresh(id: string, token: number): boolean {
    const repo = get().repos[id]
    return !!repo && repo.instanceToken === token
  }

  async function runNetworkTask(
    id: string,
    task: (signal: AbortSignal) => Promise<ExecResult>,
    options?: { token?: number; reason?: RepoOperationReason; priority?: number },
  ): Promise<ExecResult | null> {
    const repoBefore = get().repos[id]
    if (!repoBefore) return null
    const token = options?.token ?? repoBefore.instanceToken
    if (repoBefore.instanceToken !== token) return null
    if (!canStartRemoteFetch(repoBefore)) return { ok: false, message: 'error.network-op-in-progress' }
    return runExclusiveOperation({
      set,
      get,
      id,
      token,
      lane: 'network',
      priority: options?.priority ?? 50,
      targets: [{ select: (r) => r.ops.fetch, reason: options?.reason ?? 'network' }],
      canStart: canStartRemoteFetch,
      busyResult: { ok: false, message: 'error.network-op-in-progress' },
      task,
      errorFromResult: (result) => (!result.ok && result.message !== 'cancelled' ? result.message : null),
      rethrow: true,
    })
  }

  async function refreshSelectedPullRequest(id: string, token: number): Promise<void> {
    const repo = get().repos[id]
    if (!repo || repo.instanceToken !== token || !repo.ui.selectedBranch) return
    await get().refreshPullRequests(id, [repo.ui.selectedBranch], { token, mode: 'full' })
  }

  async function refreshPullRequestsAfterSnapshot(
    id: string,
    token: number,
    branchNames: string[],
    isSnapshotCurrent: () => boolean,
  ): Promise<void> {
    if (!isSnapshotCurrent() || !repoFresh(id, token)) return
    await get().refreshPullRequests(id, branchNames, { token, mode: 'summary' })
    if (!isSnapshotCurrent() || !repoFresh(id, token)) return
    await refreshSelectedPullRequest(id, token)
    if (!isSnapshotCurrent() || !repoFresh(id, token)) return
    await get().refreshPullRequests(id, branchNames, {
      token,
      mode: 'full',
    })
  }

  function pullRequestReason(mode: PullRequestFetchMode): RepoPullRequestReason {
    switch (mode) {
      case 'summary':
        return 'summary'
      case 'full':
        return 'full'
    }
    const exhaustive: never = mode
    return exhaustive
  }

  async function refreshBranchLogPage(
    id: string,
    branchArg?: string,
    options?: { token?: number; append?: boolean },
  ): Promise<void> {
    const repoBefore = get().repos[id]
    if (!repoBefore) return
    const token = options?.token ?? repoBefore.instanceToken
    if (repoBefore.instanceToken !== token) return
    const branch = branchArg ?? branchForVisibleLog(repoBefore)
    if (!branch) return
    if (repoBefore.data.branches.length > 0 && !repoBefore.data.branches.some((b) => b.name === branch)) return
    const append = options?.append === true
    const existing = repoBefore.data.logsByBranch[branch]
    const existingOperation = repoBefore.ops.logsByBranch[branch] ?? idleOperation()
    if (append) {
      if (!existing || existing.loading || operationBusy(existingOperation)) return
      if (!existing.hasMore || existing.entries.length >= MAX_LOG_COUNT) return
    }
    const loaded = append ? existing.entries.length : 0
    const pageSize = append ? Math.min(LOG_PAGE_SIZE, MAX_LOG_COUNT - loaded) : INITIAL_LOG_COUNT
    if (pageSize <= 0) return
    const requestCount = pageSize + 1
    updateIfFresh(set, id, token, (r) => {
      const prev = r.data.logsByBranch[branch] ?? emptyBranchLog()
      r.data.logsByBranch[branch] = { ...prev, loading: true }
      r.ops.logsByBranch[branch] ??= idleOperation()
    })
    const selectLogOperation: RepoOperationSelector = (r) => r.ops.logsByBranch[branch] ?? idleOperation()
    await runLatestOperation({
      set,
      get,
      id,
      token,
      lane: 'read',
      operationKey: `log:${branch}`,
      priority: 20,
      targets: [{ select: selectLogOperation, reason: 'log' }],
      task: (signal) => rpc.repo.log.query({ cwd: id, branch, count: requestCount, skip: loaded }, { signal }),
      onResult: (log) => {
        updateIfFresh(set, id, token, (r) => {
          if (!r.data.branches.some((b) => b.name === branch)) return
          const prev = r.data.logsByBranch[branch] ?? emptyBranchLog()
          const page = logPage(log, pageSize)
          const entries = (append ? [...prev.entries, ...page.entries] : page.entries).slice(0, MAX_LOG_COUNT)
          const stillHas = prev.selectedHash && entries.some((e) => e.hash === prev.selectedHash)
          const selectedHash = stillHas ? prev.selectedHash : (entries[0]?.hash ?? null)
          r.data.logsByBranch[branch] = {
            entries,
            selectedHash,
            loading: false,
            hasMore: entries.length < MAX_LOG_COUNT && page.hasMore,
          }
        })
      },
      onError: (message) => {
        console.warn('[refreshBranchLog] failed', message)
        updateIfFresh(set, id, token, (r) => {
          if (r.data.branches.some((b) => b.name === branch)) {
            r.data.logsByBranch[branch] = {
              ...(r.data.logsByBranch[branch] ?? emptyBranchLog()),
              loading: false,
            }
          }
          r.events = appendRepoEvent(r.events, errorEvent(message))
        })
      },
    })
  }

  return {
    async refreshSnapshot(id: string, options?: { skipLogBackfill?: boolean; token?: number }) {
      const repoBefore = get().repos[id]
      if (!repoBefore) return
      const token = options?.token ?? repoBefore.instanceToken
      if (repoBefore.instanceToken !== token) return
      await runLatestOperation({
        set,
        get,
        id,
        token,
        lane: 'read',
        operationKey: 'snapshot',
        priority: 50,
        targets: [{ select: (r) => r.ops.snapshot, reason: 'snapshot' }],
        task: (signal) => rpc.repo.snapshot.query({ cwd: id }, { signal }),
        errorFromResult: (snap) => (snap ? null : 'error.failed-read-repo'),
        onResult: (snap, ctx) => {
          if (!snap) {
            updateIfFresh(set, id, token, (r) => {
              r.events = appendRepoEvent(r.events, errorEvent('error.failed-read-repo'))
            })
            return
          }
          updateIfFresh(set, id, token, (r) => {
            // Default selection: current branch on first load. Keep the
            // user's pick if it still exists, otherwise fall back so the
            // detail panel never points at a stale name.
            const selected = selectedBranchForBranchSet({
              branches: snap.branches,
              currentBranch: snap.current,
              selectedBranch: r.ui.selectedBranch,
              viewMode: r.ui.branchViewMode,
            })
            const validBranches = new Set(snap.branches.map((b) => b.name))
            const logsByBranch = Object.fromEntries(
              Object.entries(r.data.logsByBranch).filter(([branch]) => validBranches.has(branch)),
            )
            const pullRequestsByBranch = new Map(
              r.data.branches.flatMap((branch) =>
                branch.pullRequest ? [[branch.name, branch.pullRequest] as const] : [],
              ),
            )
            // Preserve the last known PR while the async GitHub refresh below
            // runs. If GitHub is unavailable, refreshPullRequests keeps this
            // metadata instead of making the row flicker to "no PR".
            const branches = snap.branches.map((branch) => {
              const pullRequest = branch.pullRequest ?? pullRequestsByBranch.get(branch.name)
              return pullRequest && branchPullRequestBelongsToBranch(branch, pullRequest)
                ? { ...branch, pullRequest }
                : branch
            })
            r.data.branches = branches
            r.data.currentBranch = snap.current
            r.data.logsByBranch = logsByBranch
            r.ops.logsByBranch = Object.fromEntries(
              Object.entries(r.ops.logsByBranch).filter(([branch]) => validBranches.has(branch)),
            )
            r.ui.selectedBranch = selected
            r.cache.source = 'fresh'
            r.cache.savedAt = null
          })
          const repoAfterSnapshot = get().repos[id]
          if (!ctx.isCurrent()) return
          persistRepoCache(set, repoAfterSnapshot, token)
          const branchNames = snap.branches.map((branch) => branch.name)
          const isSnapshotCurrent = ctx.isCurrent
          void (async () => {
            try {
              if (isSnapshotCurrent()) await refreshPullRequestsAfterSnapshot(id, token, branchNames, isSnapshotCurrent)
            } catch (err) {
              console.warn('[refreshPullRequests] failed', err)
              const message = err instanceof Error ? err.message : String(err)
              updateIfFresh(set, id, token, (r) => {
                r.events = appendRepoEvent(r.events, errorEvent(message))
              })
            }
          })()
          // If the user opened Commits while the snapshot was in flight,
          // their setDetailTab fired a refreshBranchLog that bailed out because
          // selectedBranch was still null. Now that we have it, backfill
          // the data they're actually looking at.
          //
          const after = get().repos[id]
          if (
            after &&
            after.instanceToken === token &&
            ctx.isCurrent() &&
            after.ui.detailTab === 'commits' &&
            after.ui.selectedBranch &&
            !options?.skipLogBackfill
          ) {
            void get().refreshBranchLog(id, after.ui.selectedBranch, { token })
          }
        },
        onError: (message) => {
          updateIfFresh(set, id, token, (r) => {
            r.events = appendRepoEvent(r.events, errorEvent(message))
          })
        },
      })
    },

    async refreshPullRequests(
      id: string,
      branchesArg?: string[],
      options?: {
        token?: number
        mode?: PullRequestFetchMode
        clearMissing?: boolean
      },
    ) {
      const repoBefore = get().repos[id]
      if (!repoBefore) return
      const token = options?.token ?? repoBefore.instanceToken
      if (repoBefore.instanceToken !== token) return
      const mode = options?.mode ?? 'full'
      const clearMissing = options?.clearMissing ?? mode === 'full'
      const branchNames = branchesArg ?? repoBefore.data.branches.map((branch) => branch.name)
      if (branchNames.length === 0) return
      const requested = new Set(branchNames)
      await runLatestOperation({
        set,
        get,
        id,
        token,
        lane: 'read',
        operationKey: 'pullRequests',
        priority: 10,
        targets: [{ select: (r) => r.ops.pullRequests, reason: pullRequestReason(mode) }],
        task: (signal) =>
          rpc.repo.pullRequests.query({ cwd: id, branches: branchNames, options: { mode } }, { signal }),
        onResult: (entries, ctx) => {
          if (entries === null) return
          updateIfFresh(set, id, token, (r) => {
            const byBranch = new Map(entries.map((entry) => [entry.branch, entry.pullRequest]))
            for (const branch of r.data.branches) {
              const pullRequest = byBranch.get(branch.name)
              if (pullRequest) {
                if (branchPullRequestBelongsToBranch(branch, pullRequest)) {
                  branch.pullRequest = mergePullRequest(branch, pullRequest, mode)
                } else branch.pullRequest = undefined
                continue
              }
              if (clearMissing && requested.has(branch.name) && branch.pullRequest) {
                branch.pullRequest = undefined
              }
            }
          })
          if (ctx.isCurrent()) persistRepoCache(set, get().repos[id], token)
        },
        onError: (message) => {
          console.warn('[refreshPullRequests] failed', message)
          updateIfFresh(set, id, token, (r) => {
            r.events = appendRepoEvent(r.events, errorEvent(message))
          })
        },
      })
    },

    async refreshBranchLog(id: string, branchArg?: string, options?: { token?: number }) {
      await refreshBranchLogPage(id, branchArg, options)
    },

    async loadMoreBranchLog(id: string, branchArg?: string, options?: { token?: number }) {
      await refreshBranchLogPage(id, branchArg, { ...options, append: true })
    },

    async refreshStatus(id: string, options?: { token?: number }) {
      const repoBefore = get().repos[id]
      if (!repoBefore) return
      const token = options?.token ?? repoBefore.instanceToken
      if (repoBefore.instanceToken !== token) return
      await runLatestOperation({
        set,
        get,
        id,
        token,
        lane: 'read',
        operationKey: 'status',
        priority: 40,
        targets: [{ select: (r) => r.ops.status, reason: 'status' }],
        task: (signal) => rpc.repo.status.query({ cwd: id }, { signal }),
        onResult: (status, ctx) => {
          updateIfFresh(set, id, token, (r) => {
            r.data.status = status
            r.data.statusLoaded = true
          })
          const repoAfterStatus = get().repos[id]
          if (ctx.isCurrent()) persistRepoCache(set, repoAfterStatus, token)
        },
        onError: (message) => {
          console.warn('[refreshStatus] failed', message)
          updateIfFresh(set, id, token, (r) => {
            r.events = appendRepoEvent(r.events, errorEvent(message))
          })
        },
      })
    },

    async refreshAll(id: string, options?: { token?: number }) {
      const repoBefore = get().repos[id]
      if (!repoBefore) return
      const token = options?.token ?? repoBefore.instanceToken
      if (repoBefore.instanceToken !== token) return
      await get().refreshSnapshot(id, { skipLogBackfill: true, token })
      // Status is always refreshed (regardless of which detail tab is
      // active) because the selected-branch detail toolbar surfaces the
      // dirty file count on every view. Log only matters when it's
      // visible, so we keep its refresh tab-gated.
      const after = get().repos[id]
      if (!after || after.instanceToken !== token) return
      await get().refreshStatus(id, { token })
      const afterStatus = get().repos[id]
      if (!afterStatus || afterStatus.instanceToken !== token) return
      if (afterStatus.ui.detailTab === 'commits') await get().refreshBranchLog(id, undefined, { token })
    },

    async syncAndRefresh(id: string, options?: { token?: number }) {
      const repoBefore = get().repos[id]
      if (!repoBefore) return
      const token = options?.token ?? repoBefore.instanceToken
      if (repoBefore.instanceToken !== token) return
      if (!canStartRemoteFetch(repoBefore)) return
      const result = await runNetworkTask(id, (signal) => rpc.repo.fetch.mutate({ cwd: id }, { signal }), {
        token,
        reason: 'user-fetch',
        priority: 100,
      })
      if (!result) return
      if (!result.ok && result.message === 'cancelled') return
      get().setLastResult(id, result, token)
      if (!result.ok && result.message === 'error.network-op-in-progress') return
      await get().refreshAll(id, { token })
      if (result.ok) get().clearFetchFailed(id, token)
    },

    async backgroundFetch(id: string) {
      // Coalesce: if a fetch is already running for this repo, return its
      // promise. Switching active back and forth on a slow network used
      // to fire overlapping fetches.
      const existing = inFlightFetchById.get(id)
      if (existing) return existing

      const repoBefore = get().repos[id]
      if (!repoBefore) return
      if (!canStartRemoteFetch(repoBefore)) return
      const token = repoBefore.instanceToken

      let resolveWork!: () => void
      let rejectWork!: (reason: unknown) => void
      const work = new Promise<void>((resolve, reject) => {
        resolveWork = resolve
        rejectWork = reject
      })
      inFlightFetchById.set(id, work)

      void (async () => {
        try {
          const result = await runNetworkTask(
            id,
            (signal) => rpc.repo.fetch.mutate({ cwd: id, kind: 'background' }, { signal }),
            { token, reason: 'background-fetch' },
          )
          if (!result) return
          if (!result.ok) {
            if (result.message === 'cancelled' || result.message === 'error.network-op-in-progress') return
            console.warn('[backgroundFetch] git fetch failed:', result.message)
            updateIfFresh(set, id, token, (r) => {
              r.remote.fetchFailed = true
              r.remote.fetchError = result.message
            })
            await get().refreshStatus(id, { token })
            return
          }
          // Success — clear the fail flag and refresh the snapshot/status.
          updateIfFresh(set, id, token, (r) => {
            r.remote.fetchFailed = false
            r.remote.fetchError = null
          })
          await get().refreshSnapshot(id, { token })
          await get().refreshStatus(id, { token })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          if (message === 'Request aborted' || message === 'cancelled') return
          console.warn('[backgroundFetch] threw:', err)
          updateIfFresh(set, id, token, (r) => {
            r.remote.fetchFailed = true
            r.remote.fetchError = message
          })
        } finally {
          // Only clear the slot if it still refers to this run. Without
          // the identity check, a close + reopen + new fetch can land
          // before this finally runs, and we'd wipe the new run's entry.
          if (inFlightFetchById.get(id) === work) inFlightFetchById.delete(id)
        }
      })().then(resolveWork, rejectWork)
      return work
    },
  }
}
