import { beforeEach, describe, expect, test } from 'vitest'
import { runExclusiveOperation, runLatestOperation } from '#/renderer/stores/repos/operation-runner.ts'
import { operationBusy, runningOperation } from '#/renderer/stores/repos/operations.ts'
import { useReposStore } from '#/renderer/stores/repos/store.ts'
import { resetReposStore, seedRepoState } from '#/renderer/stores/repos/test-utils.ts'

const REPO_ID = '/tmp/gbl-operation-runner-test-repo'

beforeEach(() => {
  resetReposStore()
  seedRepoState({ id: REPO_ID, instanceToken: 1 })
})

describe('runLatestOperation', () => {
  test('replaces older queued operations before they start', async () => {
    const starts: string[] = []
    let releaseActive!: () => void
    const active = runLatestOperation({
      set: useReposStore.setState,
      get: useReposStore.getState,
      id: REPO_ID,
      token: 1,
      lane: 'network',
      operationKey: 'status',
      priority: 1,
      targets: [{ select: (r) => r.ops.status, reason: 'status' }],
      task: () =>
        new Promise<string>((resolve) => {
          starts.push('active')
          releaseActive = () => resolve('active')
        }),
    })
    const replaced = runLatestOperation({
      set: useReposStore.setState,
      get: useReposStore.getState,
      id: REPO_ID,
      token: 1,
      lane: 'network',
      operationKey: 'status',
      priority: 1,
      targets: [{ select: (r) => r.ops.status, reason: 'status' }],
      task: async () => {
        starts.push('replaced')
        return 'replaced'
      },
    })
    const latest = runLatestOperation({
      set: useReposStore.setState,
      get: useReposStore.getState,
      id: REPO_ID,
      token: 1,
      lane: 'network',
      operationKey: 'status',
      priority: 1,
      targets: [{ select: (r) => r.ops.status, reason: 'status' }],
      task: async () => {
        starts.push('latest')
        return 'latest'
      },
    })

    expect(useReposStore.getState().repos[REPO_ID]?.ops.status.phase).toBe('queued')
    releaseActive()

    await expect(active).resolves.toBeNull()
    await expect(replaced).resolves.toBeNull()
    await expect(latest).resolves.toBe('latest')
    expect(starts).toEqual(['active', 'latest'])
    expect(useReposStore.getState().repos[REPO_ID]?.ops.status.phase).toBe('idle')
  })
})

describe('runExclusiveOperation', () => {
  test('marks and settles all targets together', async () => {
    let release!: () => void
    const work = runExclusiveOperation({
      set: useReposStore.setState,
      get: useReposStore.getState,
      id: REPO_ID,
      token: 1,
      lane: 'network',
      priority: 1,
      targets: [
        { select: (r) => r.ops.branchAction, reason: 'branch:pull', target: 'feature/a' },
        { select: (r) => r.ops.fetch, reason: 'pull' },
      ],
      task: () =>
        new Promise<string>((resolve) => {
          release = () => resolve('ok')
        }),
    })

    const running = useReposStore.getState().repos[REPO_ID]
    expect(running?.ops.branchAction.phase).toBe('running')
    expect(running?.ops.fetch.phase).toBe('running')
    expect(running?.ops.branchAction.target).toBe('feature/a')
    expect(running?.ops.fetch.target).toBeNull()
    expect(operationBusy(running!.ops.branchAction)).toBe(true)

    release()
    await expect(work).resolves.toBe('ok')

    const settled = useReposStore.getState().repos[REPO_ID]
    expect(settled?.ops.branchAction.phase).toBe('idle')
    expect(settled?.ops.fetch.phase).toBe('idle')
    expect(settled?.ops.branchAction.target).toBeNull()
  })

  test('returns busyResult without scheduling when blocked', async () => {
    let release!: () => void
    const first = runExclusiveOperation({
      set: useReposStore.setState,
      get: useReposStore.getState,
      id: REPO_ID,
      token: 1,
      lane: 'network',
      priority: 1,
      targets: [{ select: (r) => r.ops.fetch, reason: 'user-fetch' }],
      busyResult: { ok: false, message: 'busy' },
      task: () =>
        new Promise((resolve) => {
          release = () => resolve({ ok: true, message: 'done' })
        }),
    })
    let secondRan = false
    const second = await runExclusiveOperation({
      set: useReposStore.setState,
      get: useReposStore.getState,
      id: REPO_ID,
      token: 1,
      lane: 'network',
      priority: 1,
      targets: [{ select: (r) => r.ops.fetch, reason: 'user-fetch' }],
      busyResult: { ok: false, message: 'busy' },
      task: async () => {
        secondRan = true
        return { ok: true, message: 'should-not-run' }
      },
    })

    expect(second).toEqual({ ok: false, message: 'busy' })
    expect(secondRan).toBe(false)
    release()
    await expect(first).resolves.toEqual({ ok: true, message: 'done' })
  })

  test('treats any busy target as blocked before scheduling', async () => {
    seedRepoState({
      id: REPO_ID,
      instanceToken: 1,
      ops: { fetch: runningOperation({ reason: 'fetch' }) },
    })
    let ran = false

    const result = await runExclusiveOperation({
      set: useReposStore.setState,
      get: useReposStore.getState,
      id: REPO_ID,
      token: 1,
      lane: 'network',
      priority: 1,
      targets: [
        { select: (r) => r.ops.branchAction, reason: 'branch:pull' },
        { select: (r) => r.ops.fetch, reason: 'pull' },
      ],
      busyResult: { ok: false, message: 'busy' },
      task: async () => {
        ran = true
        return { ok: true, message: 'should-not-run' }
      },
    })

    expect(result).toEqual({ ok: false, message: 'busy' })
    expect(ran).toBe(false)
    expect(useReposStore.getState().repos[REPO_ID]?.ops.branchAction.phase).toBe('idle')
  })
})
