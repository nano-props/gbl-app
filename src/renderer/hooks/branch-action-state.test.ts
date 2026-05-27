import { afterEach, describe, expect, test } from 'vitest'
import {
  branchActionBusyItemId,
  branchActionDisplayPhase,
  cancelableBranchActionItemId,
  isBranchActionBlocked,
} from '#/renderer/hooks/branch-action-state.ts'
import { emptyRepo } from '#/renderer/stores/repos/helpers.ts'
import { startBranchActionResource } from '#/renderer/stores/repos/resources.ts'
import { disposeRepoRuntime } from '#/renderer/stores/repos/runtime.ts'

const REPO_ID = '/tmp/gbl-branch-action-state'

afterEach(() => {
  disposeRepoRuntime(REPO_ID)
})

describe('isBranchActionBlocked', () => {
  test('returns false while branch actions are idle', () => {
    const repo = emptyRepo(REPO_ID, 'repo')

    expect(isBranchActionBlocked(repo)).toBe(false)
  })

  test('uses repo branch action resource state for cross-button blocking', () => {
    const repo = emptyRepo('/tmp/gbl-branch-action-blocked', 'repo')
    startBranchActionResource(repo.resources.branchAction, 'push', 'feature/a')

    expect(isBranchActionBlocked(repo)).toBe(true)
  })

  test('treats non-running branch action resources as unblocked', () => {
    const repo = emptyRepo('/tmp/gbl-branch-action-queued', 'repo')

    expect(isBranchActionBlocked(repo)).toBe(false)
  })
})

describe('branchActionDisplayPhase', () => {
  test('returns queued for queued branch action resources', () => {
    const repo = emptyRepo(REPO_ID, 'repo')
    startBranchActionResource(repo.resources.branchAction, 'pull', 'feature/a', { actionPhase: 'queued' })

    expect(branchActionDisplayPhase(repo, 'feature/a')).toBe('queued')
  })

  test('returns running for active branch actions', () => {
    const repo = emptyRepo(REPO_ID, 'repo')
    startBranchActionResource(repo.resources.branchAction, 'push', 'feature/a')

    expect(branchActionDisplayPhase(repo, 'feature/a')).toBe('running')
  })

  test('defaults busy resources without actionPhase to running', () => {
    const repo = emptyRepo(REPO_ID, 'repo')
    startBranchActionResource(repo.resources.branchAction, 'pull', 'feature/a')
    repo.resources.branchAction.actionPhase = null

    expect(branchActionDisplayPhase(repo, 'feature/a')).toBe('running')
  })
})

describe('cancelableBranchActionItemId', () => {
  test('returns pull and push actions while busy', () => {
    const repo = emptyRepo(REPO_ID, 'repo')
    startBranchActionResource(repo.resources.branchAction, 'pull', 'feature/a')
    expect(cancelableBranchActionItemId(repo, 'feature/a')).toBe('pull')

    startBranchActionResource(repo.resources.branchAction, 'push', 'feature/a', { actionPhase: 'queued' })
    expect(cancelableBranchActionItemId(repo, 'feature/a')).toBe('push')
  })

  test('returns null for non-network branch actions', () => {
    const repo = emptyRepo(REPO_ID, 'repo')
    startBranchActionResource(repo.resources.branchAction, 'checkout', 'feature/a')

    expect(cancelableBranchActionItemId(repo, 'feature/a')).toBeNull()
  })
})

describe('branchActionBusyItemId', () => {
  test('maps store-backed branch action resource kinds to UI actions', () => {
    const repo = emptyRepo('/tmp/gbl-branch-action-operation', 'repo')

    startBranchActionResource(repo.resources.branchAction, 'checkout', 'feature/a')
    expect(branchActionBusyItemId(repo, 'feature/a')).toBe('checkout')

    startBranchActionResource(repo.resources.branchAction, 'pull', 'feature/a')
    expect(branchActionBusyItemId(repo, 'feature/a')).toBe('pull')

    startBranchActionResource(repo.resources.branchAction, 'push', 'feature/a')
    expect(branchActionBusyItemId(repo, 'feature/a')).toBe('push')

    startBranchActionResource(repo.resources.branchAction, 'deleteBranch', 'feature/a')
    expect(branchActionBusyItemId(repo, 'feature/a')).toBe('deleteBranch')

    startBranchActionResource(repo.resources.branchAction, 'removeWorktree', 'feature/a')
    expect(branchActionBusyItemId(repo, 'feature/a')).toBe('removeWorktree')
  })

  test('only marks the target branch action item as busy', () => {
    const repo = emptyRepo('/tmp/gbl-branch-action-operation-target', 'repo')

    startBranchActionResource(repo.resources.branchAction, 'pull', 'feature/a')

    expect(branchActionBusyItemId(repo, 'feature/a')).toBe('pull')
    expect(branchActionBusyItemId(repo, 'feature/b')).toBeNull()
  })

  test('returns null when idle or when no branch action item owns the operation', () => {
    const repo = emptyRepo('/tmp/gbl-branch-action-operation-idle', 'repo')

    expect(branchActionBusyItemId(repo, 'feature/a')).toBeNull()

    startBranchActionResource(repo.resources.branchAction, 'createWorktree', 'feature/a')
    expect(branchActionBusyItemId(repo, 'feature/a')).toBeNull()
  })
})
