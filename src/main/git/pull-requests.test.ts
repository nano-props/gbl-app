import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { execaSync } from 'execa'
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  getBranchPullRequest,
  getBranchPullRequests,
  normalizeGhPullRequest,
  pickPullRequest,
} from '#/main/git/pull-requests.ts'

const execaMock = vi.hoisted(() => vi.fn())
const canQueryGitHubHostMock = vi.hoisted(() => vi.fn())

vi.mock('execa', async () => {
  const actual = await vi.importActual<typeof import('execa')>('execa')
  return {
    ...actual,
    execa: ((file: string, args?: readonly string[], options?: Record<string, unknown>) =>
      file === 'gh' ? execaMock(file, args, options) : actual.execa(file, args, options as any)) as typeof actual.execa,
  }
})

vi.mock('#/main/system/github-cli.ts', () => ({
  buildGitHubCliPath: vi.fn(() => process.env.PATH ?? ''),
  canQueryGitHubHost: vi.fn((host: string) => canQueryGitHubHostMock(host)),
}))

let templateRepo: string | null = null
let tmp: string | null = null

beforeAll(() => {
  templateRepo = mkdtempSync(path.join(os.tmpdir(), 'gbl-pr-template-'))
  execaSync('git', ['init', templateRepo], { stdio: 'ignore' })
  execaSync('git', ['remote', 'add', 'origin', 'https://github.com/acme/repo.git'], {
    cwd: templateRepo,
    stdio: 'ignore',
  })
})

beforeEach(() => {
  execaMock.mockReset()
  canQueryGitHubHostMock.mockReset()
  canQueryGitHubHostMock.mockResolvedValue(true)
})

afterAll(() => {
  if (templateRepo) rmSync(templateRepo, { recursive: true, force: true })
  templateRepo = null
})

function initGitHubRepo(): string {
  tmp = mkdtempSync(path.join(os.tmpdir(), 'gbl-pr-test-'))
  cpSync(templateRepo!, tmp, { recursive: true })
  return tmp
}

function git(cwd: string, ...args: string[]): string {
  return execaSync('git', args, { cwd }).stdout.trim()
}

function pullRequestNode(number: number, headRefName: string) {
  return {
    number,
    title: `PR ${number}`,
    url: `https://github.com/acme/repo/pull/${number}`,
    state: 'OPEN',
    isDraft: false,
    baseRefName: 'main',
    headRefName,
    isCrossRepository: false,
  }
}

function graphqlPullRequests(nodes: unknown[]) {
  return JSON.stringify({
    data: {
      repository: {
        pullRequests: {
          nodes,
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    },
  })
}

function installGhGraphqlMock(handler: (payload: { variables?: Record<string, unknown> }) => string | Promise<string>): void {
  execaMock.mockImplementation(async (_cmd, _args, options) => ({ stdout: await handler(JSON.parse(String(options?.input))) }))
}

afterEach(() => {
  vi.restoreAllMocks()
  if (tmp) rmSync(tmp, { recursive: true, force: true })
  tmp = null
})

describe('pull request normalization', () => {
  test('normalizes open pull requests', () => {
    expect(
      normalizeGhPullRequest({
        number: 12,
        title: 'Feature',
        url: 'https://github.com/acme/repo/pull/12',
        state: 'OPEN',
        isDraft: true,
        createdAt: '2026-05-20T10:00:00Z',
        author: { login: 'octocat' },
        baseRefName: 'main',
        headRefName: 'feature',
        headRepositoryOwner: { login: 'acme' },
        isCrossRepository: false,
      }),
    ).toMatchObject({
      number: 12,
      title: 'Feature',
      url: 'https://github.com/acme/repo/pull/12',
      state: 'open',
      isDraft: true,
      createdAt: '2026-05-20T10:00:00Z',
      author: 'octocat',
      baseRefName: 'main',
      headRefName: 'feature',
      headRepositoryOwner: 'acme',
      isCrossRepository: false,
    })
  })
})

describe('pull request selection', () => {
  test('prefers open over merged over closed', () => {
    const merged = { number: 1, title: 'Merged', url: 'https://example.com/1', state: 'merged' as const, isDraft: false }
    const open = { number: 2, title: 'Open', url: 'https://example.com/2', state: 'open' as const, isDraft: false }
    const closed = { number: 3, title: 'Closed', url: 'https://example.com/3', state: 'closed' as const, isDraft: false }

    expect(pickPullRequest(merged, open)).toBe(open)
    expect(pickPullRequest(open, closed)).toBe(open)
  })
})

describe('branch pull request lookup', () => {
  test('uses the branch upstream GitHub remote for single-branch queries', async () => {
    const repo = initGitHubRepo()
    git(repo, 'remote', 'set-url', 'origin', 'https://github.com/me/fork.git')
    git(repo, 'remote', 'add', 'upstream', 'https://github.com/acme/repo.git')
    git(repo, 'config', 'branch.feature.remote', 'upstream')
    git(repo, 'config', 'branch.feature.merge', 'refs/heads/main')
    const queriedRepos: Array<{ owner?: string; repo?: string; headRefName?: string }> = []
    installGhGraphqlMock(async (body) => {
      queriedRepos.push((body.variables ?? {}) as { owner?: string; repo?: string; headRefName?: string })
      return graphqlPullRequests([pullRequestNode(42, 'feature')])
    })

    const result = await getBranchPullRequests(repo, new Set(['feature']), { mode: 'summary' })

    expect(result?.get('feature')?.number).toBe(42)
    expect(queriedRepos[0]).toMatchObject({ owner: 'acme', repo: 'repo', headRefName: 'feature' })
  })

  test('keeps single-branch PR cache entries isolated by selected GitHub repo', async () => {
    const repo = initGitHubRepo()
    git(repo, 'remote', 'set-url', 'origin', 'https://github.com/me/fork.git')
    git(repo, 'remote', 'add', 'upstream', 'https://github.com/acme/repo.git')
    git(repo, 'config', 'branch.feature.remote', 'upstream')
    git(repo, 'config', 'branch.feature.merge', 'refs/heads/main')
    const queriedRepos: Array<{ owner?: string; repo?: string; headRefName?: string }> = []
    installGhGraphqlMock(async (body) => {
      const variables = (body.variables ?? {}) as { owner?: string; repo?: string; headRefName?: string }
      queriedRepos.push(variables)
      return graphqlPullRequests([pullRequestNode(variables.headRefName === 'feature' ? 42 : 7, variables.headRefName ?? '')])
    })

    const upstreamBranch = await getBranchPullRequests(repo, new Set(['feature']), { mode: 'summary' })
    const originBranch = await getBranchPullRequests(repo, new Set(['other']), { mode: 'summary' })

    expect(upstreamBranch?.get('feature')?.number).toBe(42)
    expect(originBranch?.get('other')?.number).toBe(7)
    expect(queriedRepos).toEqual([
      expect.objectContaining({ owner: 'acme', repo: 'repo', headRefName: 'feature' }),
      expect.objectContaining({ owner: 'me', repo: 'fork', headRefName: 'other' }),
    ])
  })

  test('does not treat a repo-wide cache miss as a definitive single-branch miss', async () => {
    const repo = initGitHubRepo()
    const queriedHeads: Array<string | undefined> = []
    installGhGraphqlMock(async (body) => {
      const headRefName = body.variables?.headRefName as string | undefined
      const states = body.variables?.states as string[] | undefined
      queriedHeads.push(headRefName)
      if (headRefName === 'hidden') return graphqlPullRequests([pullRequestNode(99, 'hidden')])
      if (states?.includes('OPEN')) return graphqlPullRequests([pullRequestNode(1, 'cached')])
      return graphqlPullRequests([])
    })

    const repoWide = await getBranchPullRequests(repo, undefined, { mode: 'full' })
    const hidden = await getBranchPullRequest(repo, 'hidden')

    expect(repoWide?.get('cached')?.number).toBe(1)
    expect(hidden?.number).toBe(99)
    expect(queriedHeads).toContain('hidden')
  })

  test('skips single-branch pull request fetches when host capability is unavailable', async () => {
    const repo = initGitHubRepo()
    canQueryGitHubHostMock.mockResolvedValueOnce(false)

    const result = await getBranchPullRequest(repo, 'feature')

    expect(result).toBeNull()
    expect(execaMock).not.toHaveBeenCalled()
  })
})

describe('getBranchPullRequests request coordination', () => {
  test('does not let a signaled caller abort an unsignaled shared request', async () => {
    const repo = initGitHubRepo()
    const ctrl = new AbortController()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let releaseFirstFetch!: () => void
    let fetchCalls = 0
    const firstFetchStarted = new Promise<void>((resolve) => {
      execaMock.mockImplementation(async (_cmd, _args, options) => {
        fetchCalls += 1
        if (fetchCalls === 1) {
          resolve()
          const release = new Promise<void>((resolveFirstFetch) => {
            releaseFirstFetch = resolveFirstFetch
          })
          const aborted = new Promise<never>((_resolve, reject) => {
            options?.cancelSignal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), {
              once: true,
            })
          })
          await Promise.race([release, aborted])
        }
        return { stdout: graphqlPullRequests([pullRequestNode(7, 'feature/a')]) }
      })
    })

    const first = getBranchPullRequests(repo, undefined, { mode: 'summary', signal: ctrl.signal })
    await firstFetchStarted
    const second = getBranchPullRequests(repo, undefined, { mode: 'summary' })
    ctrl.abort()
    releaseFirstFetch()

    const [, secondResult] = await Promise.all([first, second])
    expect(secondResult?.get('feature/a')?.number).toBe(7)
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('[pull-requests]'), expect.anything())
  })

  test('shares pending requests for callers using the same signal', async () => {
    const repo = initGitHubRepo()
    const ctrl = new AbortController()
    let releaseFetch!: () => void
    let fetchCalls = 0
    const firstFetchStarted = new Promise<void>((resolve) => {
      execaMock.mockImplementation(async () => {
        fetchCalls += 1
        resolve()
        await new Promise<void>((release) => {
          releaseFetch = release
        })
        return { stdout: graphqlPullRequests([pullRequestNode(8, 'feature/shared')]) }
      })
    })

    const first = getBranchPullRequests(repo, undefined, { mode: 'summary', signal: ctrl.signal })
    await firstFetchStarted
    const second = getBranchPullRequests(repo, undefined, { mode: 'summary', signal: ctrl.signal })
    releaseFetch()

    const [firstResult, secondResult] = await Promise.all([first, second])
    expect(fetchCalls).toBe(1)
    expect(firstResult?.get('feature/shared')?.number).toBe(8)
    expect(secondResult?.get('feature/shared')?.number).toBe(8)
  })

  test('stops full-repo queries when aborted after open pull requests load', async () => {
    const repo = initGitHubRepo()
    const ctrl = new AbortController()
    let fetchCalls = 0
    execaMock.mockImplementation(async () => {
      fetchCalls += 1
      ctrl.abort()
      return { stdout: graphqlPullRequests([pullRequestNode(9, 'feature/open')]) }
    })

    const result = await getBranchPullRequests(repo, undefined, { mode: 'full', signal: ctrl.signal })

    expect(result).toBeNull()
    expect(fetchCalls).toBe(1)
  })

  test('does not overwrite a successful repo cache when an unexpected refresh error occurs', async () => {
    const repo = initGitHubRepo()
    execaMock.mockResolvedValueOnce({ stdout: graphqlPullRequests([pullRequestNode(3, 'cached')]) })
    const summary = await getBranchPullRequests(repo, undefined, { mode: 'summary' })
    expect(summary?.get('cached')?.number).toBe(3)

    vi.spyOn(console, 'warn').mockImplementation(() => {
      throw new Error('logger unavailable')
    })
    execaMock.mockRejectedValueOnce(Object.assign(new Error('server down'), { stderr: 'gh: server down (HTTP 500)' }))
    await expect(getBranchPullRequests(repo, undefined, { mode: 'full' })).rejects.toThrow(
      'GoblinPullRequests failed on github.com: HTTP_ERROR HTTP 500 (retryable) - gh: server down (HTTP 500)',
    )
    vi.mocked(console.warn).mockRestore()
    const cached = await getBranchPullRequests(repo, undefined, { mode: 'summary' })

    expect(cached?.get('cached')?.number).toBe(3)
  })

  test('skips repo-wide pull request fetches when host capability is unavailable', async () => {
    const repo = initGitHubRepo()
    canQueryGitHubHostMock.mockResolvedValueOnce(false)

    const result = await getBranchPullRequests(repo, undefined, { mode: 'full' })

    expect(result).toBeNull()
    expect(execaMock).not.toHaveBeenCalled()
  })
})
