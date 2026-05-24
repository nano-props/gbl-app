import { describe, expect, test } from 'vitest'
import { getRepoSyncActivity, isRepoSyncBlocked } from '#/renderer/components/repo-sync/model.ts'
import { emptyRepo } from '#/renderer/stores/repos/helpers.ts'
import { idleRepoOperations, runningOperation } from '#/renderer/stores/repos/operations.ts'
import type { RepoDataSource, RepoState } from '#/renderer/stores/repos/types.ts'

interface RepoOverrides {
  dataSource?: RepoDataSource
  snapshotBusy?: boolean
  branchActionBusy?: boolean
  statusBusy?: boolean
  pullRequestsBusy?: boolean
  currentBranch?: string
  logsByBranch?: RepoState['data']['logsByBranch']
  fetchBusy?: boolean
  selectedBranch?: string | null
}

function repo(overrides: RepoOverrides = {}): RepoState {
  const base = emptyRepo('/tmp/goblin-sync-test', 'repo')
  return {
    ...base,
    data: {
      ...base.data,
      currentBranch: overrides.currentBranch ?? base.data.currentBranch,
      logsByBranch: overrides.logsByBranch ?? base.data.logsByBranch,
    },
    ui: {
      ...base.ui,
      selectedBranch: overrides.selectedBranch ?? base.ui.selectedBranch,
    },
    ops: {
      ...idleRepoOperations(),
      snapshot: overrides.snapshotBusy ? runningOperation({ reason: 'snapshot' }) : idleRepoOperations().snapshot,
      branchAction: overrides.branchActionBusy
        ? runningOperation({ reason: 'branch:checkout' })
        : idleRepoOperations().branchAction,
      status: overrides.statusBusy ? runningOperation({ reason: 'status' }) : idleRepoOperations().status,
      pullRequests: overrides.pullRequestsBusy
        ? runningOperation({ reason: 'pullRequests' })
        : idleRepoOperations().pullRequests,
      fetch: overrides.fetchBusy ? runningOperation({ reason: 'fetch' }) : idleRepoOperations().fetch,
      logsByBranch: {},
    },
    cache: {
      ...base.cache,
      source: overrides.dataSource ?? base.cache.source,
    },
  }
}

describe('getRepoSyncActivity', () => {
  test('uses the highest-value active refresh stage', () => {
    expect(getRepoSyncActivity(repo({ dataSource: 'cache', snapshotBusy: true, statusBusy: true }))?.stage).toBe(
      'cache',
    )
    expect(getRepoSyncActivity(repo({ snapshotBusy: true, fetchBusy: true }))?.stage).toBe('branches')
    expect(getRepoSyncActivity(repo({ branchActionBusy: true }))?.stage).toBe('branches')
    expect(getRepoSyncActivity(repo({ dataSource: 'cache', statusBusy: true }))?.stage).toBe('status')
    expect(getRepoSyncActivity(repo({ statusBusy: true, fetchBusy: true }))?.stage).toBe('status')
    expect(getRepoSyncActivity(repo({ pullRequestsBusy: true, fetchBusy: true }))?.stage).toBe('prs')
  })

  test('detects current branch log loading before remote activity', () => {
    expect(
      getRepoSyncActivity(
        repo({
          currentBranch: 'main',
          logsByBranch: { main: { entries: [], selectedHash: null, loading: true, hasMore: false } },
          fetchBusy: true,
        }),
      )?.stage,
    ).toBe('log')
  })

  test('falls back to remote activity and idle states', () => {
    expect(getRepoSyncActivity(repo({ fetchBusy: true }))?.stage).toBe('remote')
    expect(getRepoSyncActivity(repo())).toBeNull()
  })
})

describe('isRepoSyncBlocked', () => {
  test('blocks while network or required initial refresh state is active', () => {
    expect(isRepoSyncBlocked(repo({ fetchBusy: true }))).toBe(true)
    expect(isRepoSyncBlocked(repo({ branchActionBusy: true }))).toBe(true)
    expect(isRepoSyncBlocked(repo({ snapshotBusy: true }))).toBe(true)
    expect(isRepoSyncBlocked(repo({ statusBusy: true }))).toBe(true)
    expect(isRepoSyncBlocked(repo({ dataSource: 'cache', snapshotBusy: true }))).toBe(true)
  })

  test('does not block manual sync for metadata refreshes', () => {
    expect(isRepoSyncBlocked(repo({ pullRequestsBusy: true }))).toBe(false)
    expect(
      isRepoSyncBlocked(
        repo({
          selectedBranch: 'feature',
          logsByBranch: { feature: { entries: [], selectedHash: null, loading: true, hasMore: false } },
        }),
      ),
    ).toBe(false)
  })
})
