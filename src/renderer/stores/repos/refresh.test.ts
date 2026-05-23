import { beforeEach, describe, expect, test } from 'vitest'
import { replaceRepo } from '#/renderer/stores/repos/helpers.ts'
import { useReposStore } from '#/renderer/stores/repos/store.ts'
import { runningOperation } from '#/renderer/stores/repos/operations.ts'
import { branch, REPO_ID, resetRefreshTest, rpcHandlers, seedRepo } from '#/renderer/stores/repos/refresh-test-utils.ts'
import { canStartRemoteFetch } from '#/renderer/stores/repos/sync-state.ts'
import type { WorktreeStatus } from '#/renderer/types.ts'

beforeEach(resetRefreshTest)

type TestRepo = NonNullable<ReturnType<typeof useReposStore.getState>['repos'][string]>

function updateRepoForTest(mutator: (repo: TestRepo) => void) {
  useReposStore.setState((s) => {
    const repo = s.repos[REPO_ID]
    if (!repo) return s
    return { repos: { ...s.repos, [REPO_ID]: replaceRepo(repo, mutator) } }
  })
}

describe('remote fetch timestamps', () => {
  test('manual sync records the remote fetch settled time', async () => {
    const token = seedRepo([branch('feature/a')])
    const before = Date.now()

    await useReposStore.getState().syncAndRefresh(REPO_ID, { token })

    expect(useReposStore.getState().repos[REPO_ID]?.ops.fetch.settledAt).toBeGreaterThanOrEqual(before)
  })

  test('manual sync ignores stale fetch results after repo reopen', async () => {
    let resolveFetch!: (value: { ok: true; message: string }) => void
    const token = seedRepo([branch('feature/a')], 1)
    rpcHandlers['repo.fetch'] = () =>
      new Promise<{ ok: true; message: string }>((resolve) => {
        resolveFetch = resolve
      })

    const work = useReposStore.getState().syncAndRefresh(REPO_ID, { token })
    seedRepo([branch('feature/a')], 2)
    resolveFetch({ ok: true, message: 'ok' })
    await work

    const repo = useReposStore.getState().repos[REPO_ID]
    expect(repo?.instanceToken).toBe(2)
    expect(repo?.events).toEqual([])
    expect(repo?.ops.fetch.settledAt).toBeNull()
  })

  test('background fetch records the remote fetch settled time', async () => {
    const token = seedRepo([branch('feature/a')])
    const before = Date.now()

    await useReposStore.getState().backgroundFetch(REPO_ID)

    const repo = useReposStore.getState().repos[REPO_ID]
    expect(repo?.instanceToken).toBe(token)
    expect(repo?.ops.fetch.settledAt).toBeGreaterThanOrEqual(before)
  })

  test('background fetch records and clears fetch failures', async () => {
    seedRepo([branch('feature/a')])
    let fetchOk = false
    rpcHandlers['repo.fetch'] = async () =>
      fetchOk ? { ok: true, message: 'ok' } : { ok: false, message: 'fatal: offline' }

    await useReposStore.getState().backgroundFetch(REPO_ID)

    expect(useReposStore.getState().repos[REPO_ID]?.remote).toEqual({
      fetchFailed: true,
      fetchError: 'fatal: offline',
    })

    fetchOk = true
    await useReposStore.getState().backgroundFetch(REPO_ID)

    expect(useReposStore.getState().repos[REPO_ID]?.remote).toEqual({
      fetchFailed: false,
      fetchError: null,
    })
  })

  test('background fetch records thrown failures', async () => {
    seedRepo([branch('feature/a')])
    rpcHandlers['repo.fetch'] = async () => {
      throw new Error('network down')
    }

    await useReposStore.getState().backgroundFetch(REPO_ID)

    expect(useReposStore.getState().repos[REPO_ID]?.remote).toEqual({
      fetchFailed: true,
      fetchError: 'network down',
    })
  })

  test('does not mark a slow in-flight fetch as already settled', async () => {
    const token = seedRepo([branch('feature/a')])
    let resolveFetch!: (value: { ok: true; message: string }) => void
    rpcHandlers['repo.fetch'] = () =>
      new Promise<{ ok: true; message: string }>((resolve) => {
        resolveFetch = resolve
      })

    const work = useReposStore.getState().backgroundFetch(REPO_ID)

    expect(useReposStore.getState().repos[REPO_ID]?.ops.fetch.settledAt).toBeNull()

    resolveFetch({ ok: true, message: 'ok' })
    await work

    expect(useReposStore.getState().repos[REPO_ID]?.instanceToken).toBe(token)
    expect(useReposStore.getState().repos[REPO_ID]?.ops.fetch.settledAt).not.toBeNull()
  })

  test('coalesces concurrent background fetch requests for the same repo', async () => {
    seedRepo([branch('feature/a')])
    let callCount = 0
    let resolveFetch!: (value: { ok: true; message: string }) => void
    rpcHandlers['repo.fetch'] = () => {
      callCount += 1
      return new Promise<{ ok: true; message: string }>((resolve) => {
        resolveFetch = resolve
      })
    }

    const first = useReposStore.getState().backgroundFetch(REPO_ID)
    const second = useReposStore.getState().backgroundFetch(REPO_ID)

    expect(callCount).toBe(1)

    resolveFetch({ ok: true, message: 'ok' })
    await Promise.all([first, second])
  })

  test('network operations expose repo-level fetch busy state', async () => {
    const token = seedRepo([branch('feature/a')])
    let resolveNetwork!: (value: { ok: true; message: string }) => void
    rpcHandlers['repo.fetch'] = () =>
      new Promise<{ ok: true; message: string }>((resolve) => {
        resolveNetwork = resolve
      })

    const work = useReposStore.getState().syncAndRefresh(REPO_ID, { token })

    const runningRepo = useReposStore.getState().repos[REPO_ID]
    expect(runningRepo?.ops.fetch.phase).toBe('running')
    expect(canStartRemoteFetch(runningRepo)).toBe(false)

    resolveNetwork({ ok: true, message: 'ok' })
    await work

    expect(useReposStore.getState().repos[REPO_ID]?.ops.fetch.phase).toBe('idle')
  })

  test('manual sync records failed fetch results and still refreshes local state', async () => {
    const token = seedRepo([branch('feature/a')])
    let snapshotCount = 0
    rpcHandlers['repo.fetch'] = async () => ({ ok: false, message: 'fatal: rejected' })
    rpcHandlers['repo.snapshot'] = async () => {
      snapshotCount += 1
      return { branches: [branch('feature/a')], current: 'feature/a' }
    }

    await useReposStore.getState().syncAndRefresh(REPO_ID, { token })

    const repo = useReposStore.getState().repos[REPO_ID]
    expect(repo?.events.at(-1)).toMatchObject({ kind: 'result', result: { ok: false, message: 'fatal: rejected' } })
    expect(snapshotCount).toBe(1)
  })

  test('branch network actions expose branch and fetch operation state', async () => {
    const token = seedRepo([branch('feature/a')])
    let resolvePull!: (value: { ok: true; message: string }) => void
    rpcHandlers['repo.pull'] = () =>
      new Promise<{ ok: true; message: string }>((resolve) => {
        resolvePull = resolve
      })

    const work = useReposStore.getState().runBranchAction(REPO_ID, { kind: 'pull', branch: 'feature/a' }, { token })

    const runningRepo = useReposStore.getState().repos[REPO_ID]
    expect(runningRepo?.ops.branchAction.phase).toBe('running')
    expect(runningRepo?.ops.fetch.phase).toBe('running')
    expect(canStartRemoteFetch(runningRepo)).toBe(false)

    resolvePull({ ok: true, message: 'ok' })
    await work

    const repo = useReposStore.getState().repos[REPO_ID]
    expect(repo?.ops.branchAction.phase).toBe('idle')
    expect(repo?.ops.fetch.phase).toBe('idle')
  })

  test('branch write actions run through branch operation state and refresh after completion', async () => {
    const token = seedRepo([branch('feature/a')])
    let resolveCheckout!: (value: { ok: true; message: string }) => void
    let snapshotCount = 0
    rpcHandlers['repo.checkout'] = () =>
      new Promise<{ ok: true; message: string }>((resolve) => {
        resolveCheckout = resolve
      })
    rpcHandlers['repo.snapshot'] = async () => {
      snapshotCount += 1
      return { branches: [branch('feature/a')], current: 'feature/a' }
    }

    const work = useReposStore.getState().runBranchAction(REPO_ID, { kind: 'checkout', branch: 'feature/a' }, { token })

    const runningRepo = useReposStore.getState().repos[REPO_ID]
    expect(runningRepo?.ops.branchAction.phase).toBe('running')
    expect(canStartRemoteFetch(runningRepo)).toBe(false)

    resolveCheckout({ ok: true, message: 'ok' })
    await work

    const repo = useReposStore.getState().repos[REPO_ID]
    expect(repo?.ops.branchAction.phase).toBe('idle')
    expect(repo?.data.currentBranch).toBe('feature/a')
    expect(snapshotCount).toBe(1)
  })

  test('create worktree runs through branch operation state and refreshes only after success', async () => {
    const token = seedRepo([branch('main')])
    let snapshotCount = 0
    rpcHandlers['repo.createWorktree'] = async () => ({ ok: true, message: 'ok' })
    rpcHandlers['repo.snapshot'] = async () => {
      snapshotCount += 1
      return { branches: [branch('main'), branch('feature/a')], current: 'main' }
    }

    const result = await useReposStore.getState().runBranchAction(
      REPO_ID,
      {
        kind: 'createWorktree',
        worktreePath: '/tmp/worktrees/feature-a',
        newBranch: 'feature/a',
        baseBranch: 'main',
      },
      { token, refreshOnError: false },
    )

    const repo = useReposStore.getState().repos[REPO_ID]
    expect(result).toEqual({ ok: true, message: 'ok' })
    expect(repo?.ops.branchAction.phase).toBe('idle')
    expect(repo?.data.branches.map((b) => b.name)).toEqual(['main', 'feature/a'])
    expect(snapshotCount).toBe(1)
  })

  test('create worktree failure does not refresh when requested by command caller', async () => {
    const token = seedRepo([branch('main')])
    let snapshotCount = 0
    rpcHandlers['repo.createWorktree'] = async () => ({ ok: false, message: 'error.invalid-path' })
    rpcHandlers['repo.snapshot'] = async () => {
      snapshotCount += 1
      return { branches: [branch('main'), branch('feature/a')], current: 'main' }
    }

    const result = await useReposStore.getState().runBranchAction(
      REPO_ID,
      {
        kind: 'createWorktree',
        worktreePath: '/tmp/worktrees/feature-a',
        newBranch: 'feature/a',
        baseBranch: 'main',
      },
      { token, refreshOnError: false },
    )

    expect(result).toEqual({ ok: false, message: 'error.invalid-path' })
    expect(snapshotCount).toBe(0)
  })

  test('deferred branch action results skip toast and refresh until caller confirms follow-up', async () => {
    const token = seedRepo([branch('feature/a')])
    let snapshotCount = 0
    rpcHandlers['repo.deleteBranch'] = async () => ({ ok: false, message: 'error.branch-not-fully-merged' })
    rpcHandlers['repo.snapshot'] = async () => {
      snapshotCount += 1
      return { branches: [branch('feature/a')], current: 'feature/a' }
    }

    const result = await useReposStore
      .getState()
      .runBranchAction(
        REPO_ID,
        { kind: 'deleteBranch', branch: 'feature/a' },
        { token, deferResultMessages: ['error.branch-not-fully-merged'] },
      )

    const repo = useReposStore.getState().repos[REPO_ID]
    expect(result).toEqual({ ok: false, message: 'error.branch-not-fully-merged' })
    expect(repo?.events).toEqual([])
    expect(snapshotCount).toBe(0)
    expect(repo?.ops.branchAction.phase).toBe('idle')
  })

  test('branch action failures refresh by default', async () => {
    const token = seedRepo([branch('feature/a')])
    let snapshotCount = 0
    rpcHandlers['repo.checkout'] = async () => ({ ok: false, message: 'error.checkout-failed' })
    rpcHandlers['repo.snapshot'] = async () => {
      snapshotCount += 1
      return { branches: [branch('feature/a')], current: 'feature/a' }
    }

    const result = await useReposStore
      .getState()
      .runBranchAction(REPO_ID, { kind: 'checkout', branch: 'feature/a' }, { token })

    const repo = useReposStore.getState().repos[REPO_ID]
    expect(result).toEqual({ ok: false, message: 'error.checkout-failed' })
    expect(repo?.events.at(-1)).toMatchObject({
      kind: 'result',
      result: { ok: false, message: 'error.checkout-failed' },
    })
    expect(snapshotCount).toBe(1)
  })

  test('failed network branch actions do not clear the sticky fetch failure badge', async () => {
    const token = seedRepo([branch('feature/a')])
    updateRepoForTest((repo) => {
      repo.remote = { fetchFailed: true, fetchError: 'previous failure' }
    })
    rpcHandlers['repo.pull'] = async () => ({ ok: false, message: 'fatal: rejected' })

    await useReposStore.getState().runBranchAction(REPO_ID, { kind: 'pull', branch: 'feature/a' }, { token })

    expect(useReposStore.getState().repos[REPO_ID]?.remote).toEqual({
      fetchFailed: true,
      fetchError: 'previous failure',
    })
  })
})

describe('core refresh request ordering', () => {
  test('ignores stale status refreshes for the same repo instance', async () => {
    const token = seedRepo([branch('feature/a')])
    let callCount = 0
    let resolveFirst!: (value: WorktreeStatus[]) => void
    let resolveSecond!: (value: WorktreeStatus[]) => void
    rpcHandlers['repo.status'] = () => {
      callCount += 1
      return new Promise<WorktreeStatus[]>((resolve) => {
        if (callCount === 1) resolveFirst = resolve
        else resolveSecond = resolve
      })
    }

    const first = useReposStore.getState().refreshStatus(REPO_ID, { token })
    const second = useReposStore.getState().refreshStatus(REPO_ID, { token })
    const fresh = [{ path: '/repo', isMain: true, entries: [{ x: 'M', y: ' ', path: 'fresh.ts' }] }]

    resolveSecond(fresh)
    await second
    expect(useReposStore.getState().repos[REPO_ID]?.data.status).toEqual(fresh)

    resolveFirst([{ path: '/repo', isMain: true, entries: [{ x: 'M', y: ' ', path: 'stale.ts' }] }])
    await first
    expect(useReposStore.getState().repos[REPO_ID]?.data.status).toEqual(fresh)
  })

  test('marks read operations as queued before scheduler starts them', async () => {
    const token = seedRepo([branch('feature/a')])
    const resolvers: Array<(value: WorktreeStatus[]) => void> = []
    rpcHandlers['repo.status'] = () =>
      new Promise<WorktreeStatus[]>((resolve) => {
        resolvers.push(resolve)
      })

    const works = Array.from({ length: 4 }, () => useReposStore.getState().refreshStatus(REPO_ID, { token }))

    expect(resolvers).toHaveLength(3)
    expect(useReposStore.getState().repos[REPO_ID]?.ops.status.phase).toBe('queued')

    resolvers[0]?.([])
    await works[0]

    expect(resolvers).toHaveLength(4)
    expect(useReposStore.getState().repos[REPO_ID]?.ops.status.phase).toBe('running')

    resolvers[1]?.([])
    resolvers[2]?.([])
    resolvers[3]?.([])
    await Promise.all(works)

    expect(useReposStore.getState().repos[REPO_ID]?.ops.status.phase).toBe('idle')
  })

  test('closing a repo cancels active and queued repo operations', async () => {
    const token = seedRepo([branch('feature/a')])
    let callCount = 0
    rpcHandlers['repo.abort'] = async () => ({ ok: true, message: 'ok' })
    rpcHandlers['repo.status'] = () => {
      callCount += 1
      return new Promise<WorktreeStatus[]>(() => {})
    }

    const works = Array.from({ length: 4 }, () => useReposStore.getState().refreshStatus(REPO_ID, { token }))
    expect(callCount).toBe(3)
    expect(useReposStore.getState().repos[REPO_ID]?.ops.status.phase).toBe('queued')

    useReposStore.getState().closeRepo(REPO_ID)

    await expect(Promise.all(works)).resolves.toEqual([undefined, undefined, undefined, undefined])
    expect(useReposStore.getState().repos[REPO_ID]).toBeUndefined()
  })

  test('drops older queued status refreshes before they start', async () => {
    const token = seedRepo([branch('feature/a')])
    const resolvers: Array<(value: WorktreeStatus[]) => void> = []
    rpcHandlers['repo.status'] = () =>
      new Promise<WorktreeStatus[]>((resolve) => {
        resolvers.push(resolve)
      })

    const works = Array.from({ length: 5 }, () => useReposStore.getState().refreshStatus(REPO_ID, { token }))
    const fresh = [{ path: '/repo', isMain: true, entries: [{ x: 'M', y: ' ', path: 'fresh.ts' }] }]

    try {
      expect(resolvers).toHaveLength(3)
      expect(useReposStore.getState().repos[REPO_ID]?.ops.status.phase).toBe('queued')

      await expect(works[3]).resolves.toBeUndefined()

      resolvers[0]?.([])
      await works[0]

      expect(resolvers).toHaveLength(4)
      resolvers[3]?.(fresh)
      await works[4]

      expect(useReposStore.getState().repos[REPO_ID]?.data.status).toEqual(fresh)
    } finally {
      resolvers[1]?.([])
      resolvers[2]?.([])
      await Promise.allSettled([works[1], works[2]])
      await Promise.allSettled(works)
    }
  })

  test('ignores stale snapshot refreshes for the same repo instance', async () => {
    const token = seedRepo([branch('feature/a')])
    let callCount = 0
    let resolveFirst!: (value: { branches: ReturnType<typeof branch>[]; current: string }) => void
    let resolveSecond!: (value: { branches: ReturnType<typeof branch>[]; current: string }) => void
    rpcHandlers['repo.snapshot'] = () => {
      callCount += 1
      return new Promise<{ branches: ReturnType<typeof branch>[]; current: string }>((resolve) => {
        if (callCount === 1) resolveFirst = resolve
        else resolveSecond = resolve
      })
    }

    const first = useReposStore.getState().refreshSnapshot(REPO_ID, { token })
    const second = useReposStore.getState().refreshSnapshot(REPO_ID, { token })

    resolveSecond({ branches: [branch('fresh')], current: 'fresh' })
    await second
    expect(useReposStore.getState().repos[REPO_ID]?.data.currentBranch).toBe('fresh')

    resolveFirst({ branches: [branch('stale')], current: 'stale' })
    await first
    expect(useReposStore.getState().repos[REPO_ID]?.data.currentBranch).toBe('fresh')
  })

  test('snapshot refresh prunes stale log data and operations for deleted branches', async () => {
    const token = seedRepo([branch('stale'), branch('fresh')])
    updateRepoForTest((repo) => {
      repo.data.logsByBranch = {
        stale: { entries: [], selectedHash: null, loading: false },
        fresh: { entries: [], selectedHash: null, loading: false },
      }
      repo.ops.logsByBranch = {
        stale: runningOperation({ reason: 'log' }),
        fresh: runningOperation({ reason: 'log' }),
      }
    })
    rpcHandlers['repo.snapshot'] = async () => ({ branches: [branch('fresh')], current: 'fresh' })

    await useReposStore.getState().refreshSnapshot(REPO_ID, { token })

    const repo = useReposStore.getState().repos[REPO_ID]
    expect(Object.keys(repo?.data.logsByBranch ?? {})).toEqual(['fresh'])
    expect(Object.keys(repo?.ops.logsByBranch ?? {})).toEqual(['fresh'])
  })

  test('snapshot refresh backfills the visible branch log when commits are open', async () => {
    const token = seedRepo([branch('main')])
    const logCalls: string[] = []
    updateRepoForTest((repo) => {
      repo.ui.detailTab = 'commits'
    })
    rpcHandlers['repo.snapshot'] = async () => ({ branches: [branch('main')], current: 'main' })
    rpcHandlers['repo.log'] = async ({ branch: branchName }: { branch: string }) => {
      logCalls.push(branchName)
      return []
    }

    await useReposStore.getState().refreshSnapshot(REPO_ID, { token })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(logCalls).toEqual(['main'])
  })

  test('branch log refresh returns before scheduling work for unknown branches', async () => {
    const token = seedRepo([branch('main')])
    let logCalls = 0
    rpcHandlers['repo.log'] = async () => {
      logCalls += 1
      return []
    }

    await useReposStore.getState().refreshBranchLog(REPO_ID, 'missing', { token })

    const repo = useReposStore.getState().repos[REPO_ID]
    expect(logCalls).toBe(0)
    expect(repo?.data.logsByBranch.missing).toBeUndefined()
    expect(repo?.ops.logsByBranch.missing).toBeUndefined()
  })
})
