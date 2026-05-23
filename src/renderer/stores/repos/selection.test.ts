import { beforeEach, describe, expect, test } from 'vitest'
import { replaceRepo } from '#/renderer/stores/repos/helpers.ts'
import { useReposStore } from '#/renderer/stores/repos/store.ts'
import type { BranchLogState, DetailTab, RepoState } from '#/renderer/stores/repos/types.ts'
import {
  createBranch as branch,
  createCommitDetail,
  installGoblinTestBridge,
  resetReposStore,
  seedRepoState,
} from '#/renderer/stores/repos/test-utils.ts'
import type { BranchInfo } from '#/renderer/types.ts'

const REPO_ID = '/tmp/gbl-selection-test-repo'
const rpcHandlers: Record<string, (input: any) => unknown> = {}

function seedRepo(options: {
  selectedBranch?: string | null
  currentBranch?: string
  detailTab?: DetailTab
  openCommit?: boolean
  branches?: BranchInfo[]
}) {
  seedRepoState({
    id: REPO_ID,
    branches: options.branches ?? [
      branch('main', { worktreePath: '/repo' }),
      branch('feature/worktree', { worktreePath: '/tmp/feature-worktree' }),
      branch('feature/plain'),
    ],
    currentBranch: options.currentBranch ?? 'main',
    selectedBranch: options.selectedBranch ?? 'feature/plain',
    detailTab: options.detailTab ?? 'status',
    openCommit: options.openCommit ? createCommitDetail() : null,
  })
}

function updateRepoForTest(mutator: (repo: RepoState) => void) {
  useReposStore.setState((s) => {
    const repo = s.repos[REPO_ID]
    if (!repo) return s
    return { repos: { ...s.repos, [REPO_ID]: replaceRepo(repo, mutator) } }
  })
}

async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

function stubRefreshActions(
  stubs: Partial<
    Pick<ReturnType<typeof useReposStore.getState>, 'refreshBranchLog' | 'refreshPullRequests' | 'refreshStatus'>
  >,
): () => void {
  const original = useReposStore.getState()
  useReposStore.setState(stubs)
  return () => {
    useReposStore.setState({
      refreshBranchLog: original.refreshBranchLog,
      refreshPullRequests: original.refreshPullRequests,
      refreshStatus: original.refreshStatus,
    })
  }
}

beforeEach(() => {
  for (const key of Object.keys(rpcHandlers)) delete rpcHandlers[key]
  resetReposStore()
  installGoblinTestBridge(rpcHandlers)
  rpcHandlers['repo.log'] = async () => []
  rpcHandlers['repo.pullRequests'] = async () => []
  rpcHandlers['repo.status'] = async () => []
})

describe('setBranchViewMode', () => {
  test('changes the selected branch when the previous selection is hidden', () => {
    seedRepo({ selectedBranch: 'feature/plain' })

    useReposStore.getState().setBranchViewMode(REPO_ID, 'worktrees')

    const repo = useReposStore.getState().repos[REPO_ID]
    expect(repo?.ui.branchViewMode).toBe('worktrees')
    expect(repo?.ui.selectedBranch).toBe('main')
    expect(useReposStore.getState().repoCache[REPO_ID]?.ui).toMatchObject({
      branchViewMode: 'worktrees',
      selectedBranch: 'main',
    })
  })

  test('keeps the selected branch when it remains visible', () => {
    seedRepo({ selectedBranch: 'feature/worktree' })

    useReposStore.getState().setBranchViewMode(REPO_ID, 'worktrees')

    expect(useReposStore.getState().repos[REPO_ID]?.ui.selectedBranch).toBe('feature/worktree')
  })

  test('clears commit detail state when selection changes', () => {
    seedRepo({ selectedBranch: 'feature/plain', openCommit: true })

    useReposStore.getState().setBranchViewMode(REPO_ID, 'worktrees')

    const repo = useReposStore.getState().repos[REPO_ID]
    expect(repo?.ui.selectedBranch).toBe('main')
    expect(repo?.ui.openCommit).toBeNull()
    expect(repo?.ui.openingCommitHash).toBeNull()
  })

  test('clears the selection when the new view mode has no visible branches', () => {
    seedRepo({ selectedBranch: 'main', branches: [branch('main')] })

    useReposStore.getState().setBranchViewMode(REPO_ID, 'worktrees')

    const repo = useReposStore.getState().repos[REPO_ID]
    expect(repo?.ui.branchViewMode).toBe('worktrees')
    expect(repo?.ui.selectedBranch).toBeNull()
    expect(useReposStore.getState().repoCache[REPO_ID]?.ui.selectedBranch).toBeNull()
  })

  test('refreshes the new branch log when commits are visible', async () => {
    const calls: string[] = []
    rpcHandlers['repo.log'] = async ({ branch }: { branch: string }) => {
      calls.push(branch)
      return []
    }
    seedRepo({ selectedBranch: 'feature/plain', detailTab: 'commits' })

    useReposStore.getState().setBranchViewMode(REPO_ID, 'worktrees')
    await flushAsyncWork()

    expect(calls).toEqual(['main'])
  })

  test('passes the current repo token to follow-up refreshes', () => {
    seedRepo({ selectedBranch: 'feature/plain', detailTab: 'commits' })
    const token = useReposStore.getState().repos[REPO_ID]!.instanceToken
    const logCalls: Parameters<ReturnType<typeof useReposStore.getState>['refreshBranchLog']>[] = []
    const pullRequestCalls: Parameters<ReturnType<typeof useReposStore.getState>['refreshPullRequests']>[] = []
    const restore = stubRefreshActions({
      refreshBranchLog: async (...args) => {
        logCalls.push(args)
      },
      refreshPullRequests: async (...args) => {
        pullRequestCalls.push(args)
      },
    })

    try {
      useReposStore.getState().setBranchViewMode(REPO_ID, 'worktrees')

      expect(logCalls[0]).toEqual([REPO_ID, 'main', { token }])
      expect(pullRequestCalls[0]).toEqual([REPO_ID, ['main'], { token, mode: 'full', silent: true }])
    } finally {
      restore()
    }
  })

  test('refreshes pull request details when the selected branch changes', async () => {
    const calls: Array<{ branches?: string[]; mode?: string }> = []
    rpcHandlers['repo.pullRequests'] = async ({
      branches,
      options,
    }: {
      branches?: string[]
      options?: { mode?: string }
    }) => {
      calls.push({ branches, mode: options?.mode })
      return []
    }
    seedRepo({ selectedBranch: 'feature/plain' })

    useReposStore.getState().setBranchViewMode(REPO_ID, 'worktrees')
    await flushAsyncWork()

    expect(calls).toEqual([{ branches: ['main'], mode: 'full' }])
  })
})

describe('selectBranch', () => {
  test('refreshes pull request details silently', async () => {
    let resolve!: () => void
    const calls: Array<{ branches?: string[]; mode?: string }> = []
    rpcHandlers['repo.pullRequests'] = ({ branches, options }: { branches?: string[]; options?: { mode?: string } }) =>
      new Promise<[]>((r) => {
        calls.push({ branches, mode: options?.mode })
        resolve = () => r([])
      })
    seedRepo({ selectedBranch: 'feature/plain' })

    useReposStore.getState().selectBranch(REPO_ID, 'main')

    expect(useReposStore.getState().repos[REPO_ID]?.ops.pullRequests.phase).toBe('running')
    resolve()
    await Promise.resolve()
    expect(calls).toEqual([{ branches: ['main'], mode: 'full' }])
    expect(useReposStore.getState().repoCache[REPO_ID]?.ui.selectedBranch).toBe('main')
  })

  test('passes the current repo token to selected branch refreshes', () => {
    seedRepo({ selectedBranch: 'feature/plain', detailTab: 'commits' })
    const token = useReposStore.getState().repos[REPO_ID]!.instanceToken
    const logCalls: Parameters<ReturnType<typeof useReposStore.getState>['refreshBranchLog']>[] = []
    const pullRequestCalls: Parameters<ReturnType<typeof useReposStore.getState>['refreshPullRequests']>[] = []
    const restore = stubRefreshActions({
      refreshBranchLog: async (...args) => {
        logCalls.push(args)
      },
      refreshPullRequests: async (...args) => {
        pullRequestCalls.push(args)
      },
    })

    try {
      useReposStore.getState().selectBranch(REPO_ID, 'main')

      expect(logCalls[0]).toEqual([REPO_ID, 'main', { token }])
      expect(pullRequestCalls[0]).toEqual([REPO_ID, ['main'], { token, mode: 'full', silent: true }])
    } finally {
      restore()
    }
  })

  test('ignores a branch that is not in the current snapshot', () => {
    let calls = 0
    rpcHandlers['repo.pullRequests'] = async () => {
      calls += 1
      return []
    }
    seedRepo({ selectedBranch: 'feature/plain', openCommit: true })

    useReposStore.getState().selectBranch(REPO_ID, 'missing')

    const repo = useReposStore.getState().repos[REPO_ID]
    expect(repo?.ui.selectedBranch).toBe('feature/plain')
    expect(repo?.ui.openCommit).not.toBeNull()
    expect(calls).toBe(0)
  })

  test('does not refresh when selecting the already-selected branch', () => {
    let calls = 0
    rpcHandlers['repo.pullRequests'] = async () => {
      calls += 1
      return []
    }
    seedRepo({ selectedBranch: 'feature/plain' })

    useReposStore.getState().selectBranch(REPO_ID, 'feature/plain')

    expect(useReposStore.getState().repos[REPO_ID]?.ui.selectedBranch).toBe('feature/plain')
    expect(calls).toBe(0)
  })

  test('clears commit detail state when the selection changes', () => {
    seedRepo({ selectedBranch: 'feature/plain', openCommit: true })

    useReposStore.getState().selectBranch(REPO_ID, 'main')

    const repo = useReposStore.getState().repos[REPO_ID]
    expect(repo?.ui.selectedBranch).toBe('main')
    expect(repo?.ui.openCommit).toBeNull()
    expect(repo?.ui.openingCommitHash).toBeNull()
  })
})

describe('setDetailTab', () => {
  test('persists the selected detail tab immediately', () => {
    seedRepo({ selectedBranch: 'main', detailTab: 'status' })

    useReposStore.getState().setDetailTab(REPO_ID, 'commits')

    expect(useReposStore.getState().repoCache[REPO_ID]?.ui.detailTab).toBe('commits')
  })

  test('does not refresh when reselecting the current tab', () => {
    let calls = 0
    rpcHandlers['repo.log'] = async () => {
      calls += 1
      return []
    }
    seedRepo({ selectedBranch: 'main', detailTab: 'commits' })

    useReposStore.getState().setDetailTab(REPO_ID, 'commits')

    expect(calls).toBe(0)
  })

  test('refreshes status when switching to changes', async () => {
    let calls = 0
    rpcHandlers['repo.status'] = async () => {
      calls += 1
      return []
    }
    seedRepo({ selectedBranch: 'main', detailTab: 'status' })

    useReposStore.getState().setDetailTab(REPO_ID, 'changes')
    await flushAsyncWork()

    expect(calls).toBe(1)
  })

  test('passes the current repo token to detail tab refreshes', () => {
    seedRepo({ selectedBranch: 'main', detailTab: 'changes' })
    const token = useReposStore.getState().repos[REPO_ID]!.instanceToken
    const pullRequestCalls: Parameters<ReturnType<typeof useReposStore.getState>['refreshPullRequests']>[] = []
    const restore = stubRefreshActions({
      refreshPullRequests: async (...args) => {
        pullRequestCalls.push(args)
      },
    })

    try {
      useReposStore.getState().setDetailTab(REPO_ID, 'status')

      expect(pullRequestCalls[0]).toEqual([REPO_ID, ['main'], { token, mode: 'full', silent: true }])
    } finally {
      restore()
    }
  })

  test('refreshes pull request details when switching to status', async () => {
    const calls: string[][] = []
    rpcHandlers['repo.pullRequests'] = async ({ branches }: { branches?: string[] }) => {
      calls.push(branches ?? [])
      return []
    }
    seedRepo({ selectedBranch: 'main', detailTab: 'changes' })

    useReposStore.getState().setDetailTab(REPO_ID, 'status')
    await flushAsyncWork()

    expect(calls).toEqual([['main']])
  })

  test('skips commit log refresh when no branch is visible for logs', async () => {
    let calls = 0
    rpcHandlers['repo.log'] = async () => {
      calls += 1
      return []
    }
    seedRepo({ selectedBranch: 'main', detailTab: 'status', branches: [branch('main')] })
    updateRepoForTest((r) => {
      r.ui.selectedBranch = null
      r.ui.branchViewMode = 'worktrees'
    })

    useReposStore.getState().setDetailTab(REPO_ID, 'commits')
    await flushAsyncWork()

    expect(calls).toBe(0)
  })
})

describe('selectLog', () => {
  test('updates runtime log selection without rewriting durable cache', () => {
    seedRepo({ selectedBranch: 'main', detailTab: 'commits' })
    const repo = useReposStore.getState().repos[REPO_ID]!
    const cached = {
      savedAt: 123,
      name: repo.name,
      data: {
        branches: repo.data.branches,
        currentBranch: repo.data.currentBranch,
        status: repo.data.status,
        statusLoaded: repo.data.statusLoaded,
      },
      ui: {
        selectedBranch: repo.ui.selectedBranch,
        branchViewMode: repo.ui.branchViewMode,
        detailTab: repo.ui.detailTab,
      },
    }
    useReposStore.setState({
      repos: {
        [REPO_ID]: replaceRepo(repo, (r) => {
          r.data.logsByBranch = { main: createLogState('a') }
        }),
      },
      repoCache: { [REPO_ID]: cached },
    })

    useReposStore.getState().selectLog(REPO_ID, 'main', 'b')

    expect(useReposStore.getState().repos[REPO_ID]?.data.logsByBranch.main?.selectedHash).toBe('b')
    expect(useReposStore.getState().repoCache[REPO_ID]).toBe(cached)
  })

  test('ignores hashes that are not in the loaded branch log', () => {
    seedRepo({ selectedBranch: 'main', detailTab: 'commits' })
    updateRepoForTest((r) => {
      r.data.logsByBranch = { main: createLogState('a') }
    })

    useReposStore.getState().selectLog(REPO_ID, 'main', 'missing')

    expect(useReposStore.getState().repos[REPO_ID]?.data.logsByBranch.main?.selectedHash).toBe('a')
  })

  test('keeps the current log selection when the hash is already selected', () => {
    seedRepo({ selectedBranch: 'main', detailTab: 'commits' })
    updateRepoForTest((r) => {
      r.data.logsByBranch = { main: createLogState('a') }
    })
    const repoBefore = useReposStore.getState().repos[REPO_ID]

    useReposStore.getState().selectLog(REPO_ID, 'main', 'a')

    expect(useReposStore.getState().repos[REPO_ID]).toBe(repoBefore)
  })
})

function createLogState(selectedHash: string): BranchLogState {
  return {
    entries: [
      { hash: 'a', shortHash: 'a', message: 'a', author: 'a', date: '2026-01-01' },
      { hash: 'b', shortHash: 'b', message: 'b', author: 'b', date: '2026-01-02' },
    ],
    selectedHash,
    loading: false,
  }
}
