import { describe, expect, test } from 'vitest'
import { isTerminalDescriptorLive, terminalSessionKey } from '#/renderer/components/terminal/terminal-session-utils.ts'
import { createBranch, seedRepoState } from '#/renderer/stores/repos/test-utils.ts'
import type { ReposStore } from '#/renderer/stores/repos/types.ts'

describe('terminal session utils', () => {
  test('builds stable worktree-scoped keys', () => {
    expect(terminalSessionKey('/repo', '/repo/worktree')).toBe('/repo\0/repo/worktree')
  })

  test('checks whether a terminal descriptor still has a live worktree', () => {
    const repo = seedRepoState({
      id: '/repo',
      branches: [createBranch('main', { worktreePath: '/repo' }), createBranch('feature')],
    })
    const repos: ReposStore['repos'] = { '/repo': repo }

    expect(
      isTerminalDescriptorLive(repos, {
        key: terminalSessionKey('/repo', '/repo'),
        repoRoot: '/repo',
        branch: 'main',
        worktreePath: '/repo',
      }),
    ).toBe(true)
    expect(
      isTerminalDescriptorLive(repos, {
        key: terminalSessionKey('/repo', '/missing'),
        repoRoot: '/repo',
        branch: 'missing',
        worktreePath: '/missing',
      }),
    ).toBe(false)
  })
})
