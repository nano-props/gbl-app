import path from 'node:path'
import type { WorktreeInfo } from '#/shared/git-types.ts'

type RemovableWorktreeResult =
  | { ok: true; path: string }
  | { ok: false; message: 'error.cannotRemoveMainWorktree' | 'error.worktreeNotFoundForBranch' }

type KnownWorktreeResult =
  | { ok: true; path: string }
  | { ok: false; message: 'error.invalidWorktreePath' | 'error.worktreeNotFoundForBranch' }

export function resolveKnownWorktree(
  worktrees: WorktreeInfo[],
  worktreePath: string,
  branch?: string,
): KnownWorktreeResult {
  const target = worktrees.find(
    (wt) => path.resolve(wt.path) === path.resolve(worktreePath) && (!branch || wt.branch === branch),
  )
  if (!target) return { ok: false, message: branch ? 'error.worktreeNotFoundForBranch' : 'error.invalidWorktreePath' }
  return { ok: true, path: target.path }
}

export function resolveRemovableWorktree(
  worktrees: WorktreeInfo[],
  branch: string,
  worktreePath: string,
  repoRoot: string,
): RemovableWorktreeResult {
  const target = worktrees.find((wt) => path.resolve(wt.path) === path.resolve(worktreePath) && wt.branch === branch)
  if (!target) return { ok: false, message: 'error.worktreeNotFoundForBranch' }
  if (!repoRoot || !target.path || target.isPrimary || path.resolve(target.path) === path.resolve(repoRoot)) {
    return { ok: false, message: 'error.cannotRemoveMainWorktree' }
  }
  return { ok: true, path: target.path }
}
