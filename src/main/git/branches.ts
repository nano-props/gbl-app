import { git, gitResult } from '#/main/git/helper.ts'
import { FIELD_SEP, parseBranches, parseLog } from '#/main/git/parsers.ts'
import type { BranchInfo, ExecResult, LogEntry, WorktreeInfo } from '#/main/git/types.ts'

export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await git(cwd, ['rev-parse', '--is-inside-work-tree'])
    return true
  } catch {
    return false
  }
}

export async function getRepoRoot(cwd: string): Promise<string> {
  try {
    return await git(cwd, ['rev-parse', '--show-toplevel'])
  } catch {
    return ''
  }
}

export async function getRepoName(cwd: string): Promise<string> {
  const root = await getRepoRoot(cwd)
  if (!root) return ''
  // git rev-parse always emits forward slashes, but a user-typed cwd may
  // contain backslashes on Windows — handle both.
  const idx = Math.max(root.lastIndexOf('/'), root.lastIndexOf('\\'))
  return idx >= 0 ? root.slice(idx + 1) : root
}

export async function getCurrentBranch(cwd: string): Promise<string> {
  // `symbolic-ref` fails on detached HEAD — exactly what we want.
  // `rev-parse --abbrev-ref HEAD` would return literal "HEAD" there.
  try {
    return await git(cwd, ['symbolic-ref', '--short', 'HEAD'])
  } catch {
    return ''
  }
}

export async function getBranches(cwd: string, worktrees?: WorktreeInfo[]): Promise<BranchInfo[]> {
  try {
    const format = [
      '%(refname:short)',
      '%(objectname:short)',
      '%(subject)',
      '%(authordate:relative)',
      '%(authorname)',
      '%(upstream:short)',
      '%(upstream:track)',
    ].join(FIELD_SEP)

    const output = await git(cwd, ['for-each-ref', `--format=${format}`, 'refs/heads/'])
    const currentBranch = await getCurrentBranch(cwd)
    return parseBranches(output, currentBranch, worktrees)
  } catch {
    return []
  }
}

export async function getLog(cwd: string, branch: string, count = 100): Promise<LogEntry[]> {
  try {
    const format = ['%H', '%h', '%s', '%an', '%ar'].join(FIELD_SEP)
    const output = await git(cwd, ['log', `--format=${format}`, '-n', String(count), branch])
    return parseLog(output)
  } catch {
    return []
  }
}

export async function checkoutBranch(cwd: string, name: string): Promise<ExecResult> {
  return gitResult(cwd, 'checkout', name)
}
