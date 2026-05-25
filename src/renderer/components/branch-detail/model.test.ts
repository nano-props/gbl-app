import { describe, expect, test } from 'vitest'
import {
  getSelectedBranchDetail,
  getSelectedBranchDetailPresentation,
} from '#/renderer/components/branch-detail/model.ts'
import { emptyRepo } from '#/renderer/stores/repos/helpers.ts'
import { idleOperation, runningOperation } from '#/renderer/stores/repos/operations.ts'
import { createBranch } from '#/renderer/stores/repos/test-utils.ts'

describe('getSelectedBranchDetailPresentation', () => {
  test('returns empty selected detail when no branch is selected', () => {
    const repo = emptyRepo('/tmp/gbl-detail-presentation-empty', 'repo')
    repo.data.branches = [createBranch('main')]
    repo.ui.selectedBranch = null

    expect(getSelectedBranchDetail(repo)).toEqual({
      branch: null,
      branchLog: undefined,
      selectedStatus: [],
      statusCount: 0,
    })
  })

  test('returns empty selected detail when the selected branch no longer exists', () => {
    const repo = emptyRepo('/tmp/gbl-detail-presentation-missing', 'repo')
    repo.data.branches = [createBranch('main')]
    repo.ui.selectedBranch = 'feature/missing'

    expect(getSelectedBranchDetailPresentation(repo).branch).toBeNull()
  })

  test('derives log loading from operations instead of log data', () => {
    const repo = emptyRepo('/tmp/gbl-detail-presentation-log', 'repo')
    repo.data.branches = [createBranch('main')]
    repo.ui.selectedBranch = 'main'
    repo.data.logsByBranch.main = { entries: [], selectedHash: null, hasMore: false }
    repo.ops.logsByBranch.main = runningOperation({ reason: 'log' })

    const detail = getSelectedBranchDetailPresentation(repo)

    expect(detail.loading.log).toBe(true)
    expect(detail.loading.logInitial).toBe(true)
    expect(detail.loading.logAppend).toBe(false)
    expect(detail.loading.commits).toBe(true)
  })

  test('distinguishes append log loading from initial log loading', () => {
    const repo = emptyRepo('/tmp/gbl-detail-presentation-log-append', 'repo')
    repo.data.branches = [createBranch('main')]
    repo.ui.selectedBranch = 'main'
    repo.data.logsByBranch.main = {
      entries: [{ hash: 'a', shortHash: 'a', message: 'a', author: 'a', date: '2026-01-01' }],
      selectedHash: 'a',
      hasMore: true,
    }
    repo.ops.logsByBranch.main = runningOperation({ reason: 'log' })

    const detail = getSelectedBranchDetailPresentation(repo)

    expect(detail.loading.logInitial).toBe(false)
    expect(detail.loading.logAppend).toBe(true)
  })

  test('surfaces status loading and errors from status operations', () => {
    const repo = emptyRepo('/tmp/gbl-detail-presentation-status', 'repo')
    repo.data.branches = [createBranch('main', { worktreePath: '/tmp/worktree' })]
    repo.data.status = [
      {
        path: '/tmp/worktree',
        branch: 'main',
        isMain: true,
        entries: [{ x: 'M', y: ' ', path: 'README.md' }],
      },
    ]
    repo.ui.selectedBranch = 'main'
    repo.ops.status = { ...idleOperation(), error: 'status failed' }

    let detail = getSelectedBranchDetailPresentation(repo)
    expect(detail.statusCount).toBe(1)
    expect(detail.errors.status).toBe('status failed')
    expect(detail.loading.status).toBe(false)

    repo.ops.status = runningOperation({ reason: 'status' })
    detail = getSelectedBranchDetailPresentation(repo)
    expect(detail.loading.status).toBe(true)
    expect(detail.loading.pullRequests).toBe(false)
  })
})
