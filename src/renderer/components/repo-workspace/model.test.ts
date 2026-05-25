import { describe, expect, test } from 'vitest'
import { getRepoWorkspacePresentation } from '#/renderer/components/repo-workspace/model.ts'
import { emptyRepo } from '#/renderer/stores/repos/helpers.ts'
import { runningOperation } from '#/renderer/stores/repos/operations.ts'
import { createBranch } from '#/renderer/stores/repos/test-utils.ts'

describe('getRepoWorkspacePresentation', () => {
  test('reports missing repos without initial loading', () => {
    expect(getRepoWorkspacePresentation(undefined)).toEqual({
      exists: false,
      initialLoading: false,
    })
  })

  test('shows initial loading only while the first snapshot has no branches yet', () => {
    const repo = emptyRepo('/tmp/gbl-workspace-loading', 'repo')
    repo.ops.snapshot = runningOperation({ requestId: 1, reason: 'snapshot' })

    expect(getRepoWorkspacePresentation(repo)).toEqual({
      exists: true,
      initialLoading: true,
    })
  })

  test('keeps cached branch data visible during snapshot refreshes', () => {
    const repo = emptyRepo('/tmp/gbl-workspace-cached-loading', 'repo')
    repo.data.branches = [createBranch('main')]
    repo.ops.snapshot = runningOperation({ requestId: 1, reason: 'snapshot' })

    expect(getRepoWorkspacePresentation(repo)).toEqual({
      exists: true,
      initialLoading: false,
    })
  })
})
