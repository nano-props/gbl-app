import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorktree, removeWorktree } from '#/main/git/worktrees.ts'

let templateRepo: string | null = null
let tmp: string | null = null
const extraPaths: string[] = []

function runGit(cwd: string, args: string[]): void {
  execFileSync('git', args, { cwd, stdio: 'ignore' })
}

beforeAll(() => {
  templateRepo = mkdtempSync(path.join(os.tmpdir(), 'gbl-worktrees-template-'))
  runGit(templateRepo, ['init', '-b', 'main'])
  runGit(templateRepo, ['config', 'user.email', 'test@example.com'])
  runGit(templateRepo, ['config', 'user.name', 'Test User'])
  writeFileSync(path.join(templateRepo, 'README.md'), 'initial\n')
  runGit(templateRepo, ['add', 'README.md'])
  runGit(templateRepo, ['commit', '-q', '-m', 'initial'])
})

afterAll(() => {
  if (templateRepo) rmSync(templateRepo, { recursive: true, force: true })
  templateRepo = null
})

function createRepo(): string {
  tmp = mkdtempSync(path.join(os.tmpdir(), 'gbl-worktrees-test-'))
  cpSync(templateRepo!, tmp, { recursive: true })
  return tmp
}

function abortedSignal(): AbortSignal {
  const ctrl = new AbortController()
  ctrl.abort()
  return ctrl.signal
}

afterEach(() => {
  for (const p of extraPaths.splice(0)) rmSync(p, { recursive: true, force: true })
  if (tmp) rmSync(tmp, { recursive: true, force: true })
  tmp = null
})

describe('worktree git operations', () => {
  test('does not create a worktree when already aborted', async () => {
    const repo = createRepo()
    const worktreePath = path.join(path.dirname(repo), `${path.basename(repo)}-aborted-create-worktree`)
    extraPaths.push(worktreePath)

    const result = await createWorktree(repo, worktreePath, 'feature/aborted', 'main', abortedSignal())

    expect(result).toEqual({ ok: false, message: 'cancelled' })
    expect(existsSync(worktreePath)).toBe(false)
  })

  test('does not remove a worktree when already aborted', async () => {
    const repo = createRepo()
    const worktreePath = path.join(path.dirname(repo), `${path.basename(repo)}-aborted-remove-worktree`)
    extraPaths.push(worktreePath)
    runGit(repo, ['worktree', 'add', '-b', 'feature/remove', '--', worktreePath, 'main'])

    const result = await removeWorktree(repo, worktreePath, abortedSignal())

    expect(result).toEqual({ ok: false, message: 'cancelled' })
    expect(existsSync(worktreePath)).toBe(true)
  })
})
