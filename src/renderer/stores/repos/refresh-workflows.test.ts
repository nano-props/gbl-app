import { describe, expect, test } from 'vitest'
import {
  runBranchViewModeChangedWorkflow,
  runDetailTabChangedWorkflow,
  runInitialRepoLoad,
  runSelectedBranchChangedWorkflow,
} from '#/renderer/stores/repos/refresh-workflows.ts'
import type { ReposGet } from '#/renderer/stores/repos/types.ts'

function callsGet() {
  const calls: string[] = []
  const get: ReposGet = () =>
    ({
      refreshSnapshot: (id: string, options?: { token?: number }) => {
        calls.push(`snapshot:${id}:${options?.token ?? ''}`)
        return Promise.resolve()
      },
      refreshStatus: (id: string, options?: { token?: number }) => {
        calls.push(`status:${id}:${options?.token ?? ''}`)
        return Promise.resolve()
      },
      refreshBranchLog: (id: string, branch?: string, options?: { token?: number }) => {
        calls.push(`log:${id}:${branch ?? ''}:${options?.token ?? ''}`)
        return Promise.resolve()
      },
      refreshPullRequests: (
        id: string,
        branches?: string[],
        options?: { token?: number; mode?: string; clearMissing?: boolean },
      ) => {
        calls.push(`prs:${id}:${branches?.join(',') ?? ''}:${options?.mode ?? ''}:${options?.token ?? ''}`)
        return Promise.resolve()
      },
    }) as ReturnType<ReposGet>
  return { calls, get }
}

describe('repo refresh workflows', () => {
  test('runs the initial repo load as snapshot plus eager status refresh', () => {
    const { calls, get } = callsGet()

    runInitialRepoLoad(get, { id: '/repo', token: 7 })

    expect(calls).toEqual(['snapshot:/repo:7', 'status:/repo:7'])
  })

  test('runs tab-specific refresh work', () => {
    const { calls, get } = callsGet()

    runDetailTabChangedWorkflow(get, { id: '/repo', token: 1, tab: 'commits', selectedBranch: 'main' })
    runDetailTabChangedWorkflow(get, { id: '/repo', token: 1, tab: 'changes', selectedBranch: 'main' })
    runDetailTabChangedWorkflow(get, { id: '/repo', token: 1, tab: 'status', selectedBranch: 'main' })
    runDetailTabChangedWorkflow(get, { id: '/repo', token: 1, tab: 'status', selectedBranch: null })
    runDetailTabChangedWorkflow(get, { id: '/repo', token: 1, tab: undefined, selectedBranch: 'main' })

    expect(calls).toEqual(['log:/repo::1', 'status:/repo:1', 'prs:/repo:main:full:1'])
  })

  test('runs branch selection refresh work for visible detail data', () => {
    const { calls, get } = callsGet()

    runSelectedBranchChangedWorkflow(get, { id: '/repo', token: 3, branch: 'feature/a', tab: 'commits' })

    expect(calls).toEqual(['log:/repo:feature/a:3', 'prs:/repo:feature/a:full:3'])
  })

  test('skips branch selection log refresh outside the commits tab', () => {
    const { calls, get } = callsGet()

    runSelectedBranchChangedWorkflow(get, { id: '/repo', token: 3, branch: 'feature/a', tab: 'status' })

    expect(calls).toEqual(['prs:/repo:feature/a:full:3'])
  })

  test('runs branch view mode refresh work only for changed visible resources', () => {
    const { calls, get } = callsGet()

    runBranchViewModeChangedWorkflow(get, {
      id: '/repo',
      token: 4,
      selectedForLog: 'feature/a',
      selectedForPullRequest: 'feature/a',
      shouldRefreshLog: true,
    })

    expect(calls).toEqual(['log:/repo:feature/a:4', 'prs:/repo:feature/a:full:4'])
  })

  test('skips branch view refreshes for unchanged resources', () => {
    const { calls, get } = callsGet()

    runBranchViewModeChangedWorkflow(get, {
      id: '/repo',
      token: 4,
      selectedForLog: 'feature/a',
      selectedForPullRequest: null,
      shouldRefreshLog: false,
    })

    expect(calls).toEqual([])
  })
})
