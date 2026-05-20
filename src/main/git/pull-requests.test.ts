import { describe, expect, test } from 'bun:test'
import { normalizeGhPullRequest, pickPullRequest } from '#/main/git/pull-requests.ts'

describe('normalizeGhPullRequest', () => {
  test('normalizes open pull requests', () => {
    expect(
      normalizeGhPullRequest({
        number: 12,
        title: 'Feature',
        url: 'https://github.com/acme/repo/pull/12',
        state: 'OPEN',
        isDraft: true,
        baseRefName: 'main',
        headRefName: 'feature',
      }),
    ).toEqual({
      number: 12,
      title: 'Feature',
      url: 'https://github.com/acme/repo/pull/12',
      state: 'open',
      isDraft: true,
      baseRefName: 'main',
      headRefName: 'feature',
    })
  })

  test('uses mergedAt as the merged signal', () => {
    expect(
      normalizeGhPullRequest({
        number: 12,
        title: 'Feature',
        url: 'https://github.com/acme/repo/pull/12',
        state: 'CLOSED',
        mergedAt: '2026-05-20T10:00:00Z',
      })?.state,
    ).toBe('merged')
  })

  test('rejects incomplete records', () => {
    expect(normalizeGhPullRequest({ number: 12, title: 'Feature' })).toBeNull()
  })
})

describe('pickPullRequest', () => {
  test('prefers open over merged and merged over closed', () => {
    const closed = {
      number: 1,
      title: 'Closed',
      url: 'https://github.com/acme/repo/pull/1',
      state: 'closed' as const,
    }
    const merged = {
      number: 2,
      title: 'Merged',
      url: 'https://github.com/acme/repo/pull/2',
      state: 'merged' as const,
    }
    const open = {
      number: 3,
      title: 'Open',
      url: 'https://github.com/acme/repo/pull/3',
      state: 'open' as const,
    }

    expect(pickPullRequest(closed, merged)).toBe(merged)
    expect(pickPullRequest(merged, open)).toBe(open)
  })
})
