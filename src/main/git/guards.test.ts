import { describe, expect, test } from 'bun:test'
import { resolveKnownWorktree, resolveRemovableWorktree } from '#/main/git/guards.ts'

describe('resolveKnownWorktree', () => {
  test('resolves a known worktree without a branch constraint', () => {
    const result = resolveKnownWorktree(
      [
        { path: '/repo', branch: 'main', isBare: false, isPrimary: true },
        { path: '/repo-linked', branch: 'feature', isBare: false, isPrimary: false },
      ],
      '/repo-linked',
    )
    expect(result).toEqual({ ok: true, path: '/repo-linked' })
  })

  test('rejects an unknown worktree path', () => {
    const result = resolveKnownWorktree(
      [{ path: '/repo', branch: 'main', isBare: false, isPrimary: true }],
      '/tmp/other',
    )
    expect(result).toEqual({ ok: false, message: 'error.invalidWorktreePath' })
  })

  test('rejects a known path checked out on a different branch', () => {
    const result = resolveKnownWorktree(
      [{ path: '/repo-linked', branch: 'feature', isBare: false, isPrimary: false }],
      '/repo-linked',
      'other',
    )
    expect(result).toEqual({ ok: false, message: 'error.worktreeNotFoundForBranch' })
  })
})

describe('resolveRemovableWorktree', () => {
  test('rejects the primary worktree even when cwd is another worktree', () => {
    const result = resolveRemovableWorktree(
      [
        { path: '/repo', branch: 'main', isBare: false, isPrimary: true },
        { path: '/repo-linked', branch: 'feature', isBare: false, isPrimary: false },
      ],
      'main',
      '/repo',
      '/repo-linked',
    )
    expect(result).toEqual({ ok: false, message: 'error.cannotRemoveMainWorktree' })
  })

  test('resolves a matching linked worktree path', () => {
    const result = resolveRemovableWorktree(
      [
        { path: '/repo', branch: 'main', isBare: false, isPrimary: true },
        { path: '/repo-linked', branch: 'feature', isBare: false, isPrimary: false },
      ],
      'feature',
      '/repo-linked',
      '/repo',
    )
    expect(result).toEqual({ ok: true, path: '/repo-linked' })
  })

  test('rejects mismatched branch or path', () => {
    const result = resolveRemovableWorktree(
      [{ path: '/repo-linked', branch: 'feature', isBare: false, isPrimary: false }],
      'other',
      '/repo-linked',
      '/repo',
    )
    expect(result).toEqual({ ok: false, message: 'error.worktreeNotFoundForBranch' })
  })

  test('rejects removal when repo root could not be resolved', () => {
    const result = resolveRemovableWorktree(
      [{ path: '/repo-linked', branch: 'feature', isBare: false, isPrimary: false }],
      'feature',
      '/repo-linked',
      '',
    )
    expect(result).toEqual({ ok: false, message: 'error.cannotRemoveMainWorktree' })
  })
})
