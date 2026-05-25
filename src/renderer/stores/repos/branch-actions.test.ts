import { beforeEach, describe, expect, test } from 'vitest'
import { useReposStore } from '#/renderer/stores/repos/store.ts'
import {
  createBranch,
  installGoblinTestBridge,
  resetReposStore,
  seedRepoState,
} from '#/renderer/stores/repos/test-utils.ts'

const REPO_ID = '/tmp/gbl-branch-actions-test-repo'

beforeEach(() => {
  resetReposStore()
  seedRepoState({
    id: REPO_ID,
    instanceToken: 1,
    branches: [createBranch('feature/a'), createBranch('feature/b')],
  })
})

describe('runBranchAction', () => {
  test('tracks branch action operation state while the action is running', async () => {
    let release!: () => void
    installGoblinTestBridge({
      'repo.push': () =>
        new Promise((resolve) => {
          release = () => resolve({ ok: false, message: 'cancelled' })
        }),
    })

    const work = useReposStore.getState().runBranchAction(REPO_ID, { kind: 'push', branch: 'feature/a' })
    const running = useReposStore.getState().repos[REPO_ID]

    expect(running?.ops.branchAction.phase).toBe('running')
    expect(running?.ops.branchAction.target).toBe('feature/a')

    release()
    await work

    const settled = useReposStore.getState().repos[REPO_ID]
    expect(settled?.ops.branchAction.phase).toBe('idle')
    expect(settled?.ops.branchAction.target).toBeNull()
  })

  test('tracks create worktree operation state while the action is running', async () => {
    let release!: () => void
    installGoblinTestBridge({
      'repo.createWorktree': () =>
        new Promise((resolve) => {
          release = () => resolve({ ok: false, message: 'cancelled' })
        }),
    })

    const work = useReposStore.getState().runBranchAction(REPO_ID, {
      kind: 'createWorktree',
      worktreePath: '/tmp/gbl-branch-actions-test-worktree',
      newBranch: 'feature/new',
      baseBranch: 'feature/a',
    })
    const running = useReposStore.getState().repos[REPO_ID]

    expect(running?.ops.branchAction.phase).toBe('running')
    expect(running?.ops.branchAction.target).toBe('feature/new')

    release()
    await work

    const settled = useReposStore.getState().repos[REPO_ID]
    expect(settled?.ops.branchAction.phase).toBe('idle')
    expect(settled?.ops.branchAction.target).toBeNull()
  })
})
