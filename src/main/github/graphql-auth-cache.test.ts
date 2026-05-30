import { afterEach, describe, expect, test, vi } from 'vitest'

const TOKEN_ENV_KEYS = ['GH_TOKEN', 'GITHUB_TOKEN', 'GH_ENTERPRISE_TOKEN', 'GITHUB_ENTERPRISE_TOKEN'] as const
const repo = { host: 'github.com', owner: 'acme', name: 'repo' }
const credentialsManagerMock = vi.hoisted(() => ({
  getGitHubToken: vi.fn<(host?: string) => string | null>(() => null),
}))
const originalEnv = Object.fromEntries(TOKEN_ENV_KEYS.map((key) => [key, process.env[key]])) as Record<
  (typeof TOKEN_ENV_KEYS)[number],
  string | undefined
>

vi.mock('#/main/security/credentials.ts', () => ({
  getCredentialsManager: () => credentialsManagerMock,
}))

describe('GitHub auth token cache', () => {
  afterEach(() => {
    credentialsManagerMock.getGitHubToken.mockReset()
    credentialsManagerMock.getGitHubToken.mockReturnValue(null)
    vi.resetModules()
    globalThis.fetch = originalFetch
    for (const key of TOKEN_ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key]
      else process.env[key] = originalEnv[key]
    }
  })

  const originalFetch = globalThis.fetch

  test('does not cache aborted token lookups as token misses', async () => {
    vi.resetModules()
    for (const key of TOKEN_ENV_KEYS) delete process.env[key]
    let authCalls = 0
    credentialsManagerMock.getGitHubToken.mockImplementation(() => {
      authCalls += 1
      return null
    })
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as unknown as typeof fetch
    const { graphqlRequestResult } = await import('#/main/github/graphql.ts')
    const ctrl = new AbortController()
    ctrl.abort()

    await graphqlRequestResult('/tmp/repo', repo, 'query Test { viewer { login } }', {}, 'Test', ctrl.signal)
    process.env.GH_TOKEN = 'env-token'
    const result = await graphqlRequestResult<{ ok: boolean }>(
      '/tmp/repo',
      repo,
      'query Test { viewer { login } }',
      {},
      'Test',
    )

    expect(authCalls).toBe(2)
    expect(result).toEqual({ ok: true, data: { ok: true } })
  })

  test('returns a token miss when no configured token or env token is available', async () => {
    vi.resetModules()
    for (const key of TOKEN_ENV_KEYS) delete process.env[key]
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const { graphqlRequestResult } = await import('#/main/github/graphql.ts')

    const result = await graphqlRequestResult('/tmp/repo', repo, 'query Test { viewer { login } }', {}, 'Test')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('NO_AUTH_TOKEN')
  })

  test('returns a configured safeStorage token before checking env tokens', async () => {
    vi.resetModules()
    process.env.GH_TOKEN = 'env-token'
    credentialsManagerMock.getGitHubToken.mockReturnValue('stored-token')
    const fetchMock = vi.fn(async (_input, init) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer stored-token')
      return new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const { graphqlRequestResult } = await import('#/main/github/graphql.ts')

    const result = await graphqlRequestResult<{ ok: boolean }>('/tmp/repo', repo, 'query Test { viewer { login } }', {}, 'Test')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true, data: { ok: true } })
  })

  test('does not apply a stored github.com token to custom enterprise hosts', async () => {
    vi.resetModules()
    delete process.env.GH_TOKEN
    delete process.env.GITHUB_TOKEN
    process.env.GH_ENTERPRISE_TOKEN = 'enterprise-token'
    credentialsManagerMock.getGitHubToken.mockImplementation((host?: string) =>
      host === 'github.com' ? 'stored-public-token' : null,
    )
    const enterpriseRepo = { host: 'github.example.com', owner: 'acme', name: 'repo' }
    const fetchMock = vi.fn(async (_input, init) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer enterprise-token')
      return new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const { graphqlRequestResult } = await import('#/main/github/graphql.ts')

    const result = await graphqlRequestResult<{ ok: boolean }>(
      '/tmp/repo',
      enterpriseRepo,
      'query Test { viewer { login } }',
      {},
      'Test',
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true, data: { ok: true } })
  })

  test('does not fetch when aborted before a queued GraphQL request starts', async () => {
    vi.resetModules()
    process.env.GH_TOKEN = 'env-token'
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: { ok: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const { graphqlRequestResult } = await import('#/main/github/graphql.ts')
    const ctrl = new AbortController()
    ctrl.abort()

    const result = await graphqlRequestResult<{ ok: boolean }>(
      '/tmp/repo',
      repo,
      'query Test { viewer { login } }',
      {},
      'Test',
      ctrl.signal,
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('TIMEOUT')
  })

  test('settles queued GraphQL requests promptly when aborted before they start', async () => {
    vi.resetModules()
    process.env.GH_TOKEN = 'env-token'
    const releases: Array<() => void> = []
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          releases.push(() =>
            resolve(
              new Response(JSON.stringify({ data: { ok: true } }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            ),
          )
        }),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const { graphqlRequestResult } = await import('#/main/github/graphql.ts')
    const running = Array.from({ length: 3 }, (_, index) =>
      graphqlRequestResult<{ ok: boolean }>(
        '/tmp/repo',
        repo,
        `query Test${index} { viewer { login } }`,
        {},
        `Test${index}`,
      ),
    )
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    const ctrl = new AbortController()
    const queued = graphqlRequestResult<{ ok: boolean }>(
      '/tmp/repo',
      repo,
      'query Test { viewer { login } }',
      {},
      'Test',
      ctrl.signal,
    )

    ctrl.abort()
    const settled = await Promise.race([
      queued.then(() => 'settled'),
      new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 25)),
    ])
    releases.forEach((release) => release())
    await Promise.all(running)

    expect(settled).toBe('settled')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    await expect(queued).resolves.toMatchObject({ ok: false })
  })
})
