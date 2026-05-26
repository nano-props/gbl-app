import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import { execaSync } from 'execa'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { getWorktreePatch } from '#/main/git/patch.ts'

let templateRepo: string | null = null
let tmp: string | null = null

function git(cwd: string, ...args: string[]) {
  execaSync('git', args, { cwd, stdio: 'ignore' })
}

beforeAll(() => {
  templateRepo = mkdtempSync(path.join(os.tmpdir(), 'gbl-patch-template-'))
  git(templateRepo, 'init')
  git(templateRepo, 'config', 'user.email', 'test@example.com')
  git(templateRepo, 'config', 'user.name', 'Test User')
  writeFileSync(path.join(templateRepo, 'README.md'), 'hello\n')
  git(templateRepo, 'add', 'README.md')
  git(templateRepo, 'commit', '-m', 'initial')
})

afterAll(() => {
  if (templateRepo) rmSync(templateRepo, { recursive: true, force: true })
  templateRepo = null
})

function initRepo(): string {
  tmp = mkdtempSync(path.join(os.tmpdir(), 'gbl-patch-test-'))
  cpSync(templateRepo!, tmp, { recursive: true })
  return tmp
}

afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true })
  tmp = null
})

describe('getWorktreePatch', () => {
  test('includes untracked files in the generated patch', async () => {
    const repo = initRepo()
    writeFileSync(path.join(repo, 'new file.txt'), 'untracked\n')

    const patch = await getWorktreePatch(repo)

    expect(patch).toContain('new file mode')
    expect(patch).toContain('new file.txt')
    expect(patch).toContain('+untracked')
  })
})
