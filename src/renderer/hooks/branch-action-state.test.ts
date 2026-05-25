import { describe, expect, test } from 'vitest'
import { branchActionItemIdFromOperation, isBranchActionBlocked } from '#/renderer/hooks/branch-action-state.ts'
import { idleOperation, queueOperation, runningOperation } from '#/renderer/stores/repos/operations.ts'
import { emptyRepo } from '#/renderer/stores/repos/helpers.ts'

describe('isBranchActionBlocked', () => {
  test('returns false while branch actions are idle', () => {
    const repo = emptyRepo('/tmp/gbl-branch-action-state', 'repo')

    expect(isBranchActionBlocked(repo)).toBe(false)
  })

  test('uses repo branch action state for cross-button blocking', () => {
    const repo = emptyRepo('/tmp/gbl-branch-action-blocked', 'repo')
    repo.ops.branchAction = runningOperation({ requestId: 7, reason: 'branch:push' })

    expect(isBranchActionBlocked(repo)).toBe(true)
  })

  test('treats queued branch actions as blocked', () => {
    const repo = emptyRepo('/tmp/gbl-branch-action-queued', 'repo')
    repo.ops.branchAction = idleOperation()
    queueOperation(repo.ops.branchAction, 8, { reason: 'branch:checkout' })

    expect(isBranchActionBlocked(repo)).toBe(true)
  })
})

describe('branchActionItemIdFromOperation', () => {
  test('maps store-backed branch operation reasons to UI actions', () => {
    const repo = emptyRepo('/tmp/gbl-branch-action-operation', 'repo')

    repo.ops.branchAction = runningOperation({ reason: 'branch:checkout', target: 'feature/a' })
    expect(branchActionItemIdFromOperation(repo, 'feature/a')).toBe('checkout')

    repo.ops.branchAction = runningOperation({ reason: 'branch:pull', target: 'feature/a' })
    expect(branchActionItemIdFromOperation(repo, 'feature/a')).toBe('pull')

    repo.ops.branchAction = runningOperation({ reason: 'branch:push', target: 'feature/a' })
    expect(branchActionItemIdFromOperation(repo, 'feature/a')).toBe('push')

    repo.ops.branchAction = runningOperation({ reason: 'branch:deleteBranch', target: 'feature/a' })
    expect(branchActionItemIdFromOperation(repo, 'feature/a')).toBe('deleteBranch')

    repo.ops.branchAction = runningOperation({ reason: 'branch:removeWorktree', target: 'feature/a' })
    expect(branchActionItemIdFromOperation(repo, 'feature/a')).toBe('removeWorktree')
  })

  test('only marks the target branch action item as busy', () => {
    const repo = emptyRepo('/tmp/gbl-branch-action-operation-target', 'repo')

    repo.ops.branchAction = runningOperation({ reason: 'branch:pull', target: 'feature/a' })

    expect(branchActionItemIdFromOperation(repo, 'feature/a')).toBe('pull')
    expect(branchActionItemIdFromOperation(repo, 'feature/b')).toBeNull()
  })

  test('returns null when idle or when no branch action item owns the operation', () => {
    const repo = emptyRepo('/tmp/gbl-branch-action-operation-idle', 'repo')

    expect(branchActionItemIdFromOperation(repo, 'feature/a')).toBeNull()

    repo.ops.branchAction = runningOperation({ reason: 'branch:createWorktree', target: 'feature/a' })
    expect(branchActionItemIdFromOperation(repo, 'feature/a')).toBeNull()
  })
})
