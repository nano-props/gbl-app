import { describe, expect, test } from 'vitest'
import { emptyRepo } from '#/renderer/stores/repos/helpers.ts'
import { idleRepoOperations, runningOperation } from '#/renderer/stores/repos/operations.ts'
import { canStartRemoteFetch, isRemoteFetchDue } from '#/renderer/stores/repos/sync-state.ts'
import type { RepoState } from '#/renderer/stores/repos/types.ts'

interface RepoOverrides {
  fetchBusy?: boolean
  branchActionBusy?: boolean
  snapshotBusy?: boolean
  statusBusy?: boolean
  lastFetchSettledAt?: number | null
}

function repo(overrides: RepoOverrides = {}): RepoState {
  const base = emptyRepo('/tmp/goblin-sync-state-test', 'repo')
  const ops = idleRepoOperations()
  if (overrides.fetchBusy) ops.fetch = runningOperation({ reason: 'fetch' })
  if (overrides.branchActionBusy) ops.branchAction = runningOperation({ reason: 'branch:checkout' })
  if (overrides.snapshotBusy) ops.snapshot = runningOperation({ reason: 'snapshot' })
  if (overrides.statusBusy) ops.status = runningOperation({ reason: 'status' })
  ops.fetch.settledAt = overrides.lastFetchSettledAt ?? null
  return {
    ...base,
    ops,
  }
}

describe('canStartRemoteFetch', () => {
  test('requires a repo that is not already busy with core refresh work', () => {
    expect(canStartRemoteFetch(undefined)).toBe(false)
    expect(canStartRemoteFetch(repo())).toBe(true)
    expect(canStartRemoteFetch(repo({ fetchBusy: true }))).toBe(false)
    expect(canStartRemoteFetch(repo({ branchActionBusy: true }))).toBe(false)
    expect(canStartRemoteFetch(repo({ snapshotBusy: true }))).toBe(false)
    expect(canStartRemoteFetch(repo({ statusBusy: true }))).toBe(false)
  })
})

describe('isRemoteFetchDue', () => {
  test('is due when no remote fetch has settled yet', () => {
    expect(isRemoteFetchDue(repo(), 60_000, 100_000)).toBe(true)
  })

  test('is due only after the interval since the last settled fetch', () => {
    expect(isRemoteFetchDue(repo({ lastFetchSettledAt: 50_000 }), 60_000, 100_000)).toBe(false)
    expect(isRemoteFetchDue(repo({ lastFetchSettledAt: 40_000 }), 60_000, 100_000)).toBe(true)
  })

  test('is not due when disabled or core fetch state is busy', () => {
    expect(isRemoteFetchDue(repo(), 0, 100_000)).toBe(false)
    expect(isRemoteFetchDue(repo({ fetchBusy: true, lastFetchSettledAt: null }), 60_000, 100_000)).toBe(false)
    expect(isRemoteFetchDue(repo({ branchActionBusy: true, lastFetchSettledAt: null }), 60_000, 100_000)).toBe(false)
    expect(isRemoteFetchDue(repo({ snapshotBusy: true, lastFetchSettledAt: null }), 60_000, 100_000)).toBe(false)
  })
})
