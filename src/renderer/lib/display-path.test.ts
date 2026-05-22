import { describe, expect, test } from 'bun:test'
import { compactDisplayDir, splitDisplayPath } from '#/renderer/lib/display-path.ts'

describe('splitDisplayPath', () => {
  test('splits a nested path into directory and file', () => {
    expect(splitDisplayPath('apps/web/src/App.tsx')).toEqual({ dir: 'apps/web/src', file: 'App.tsx' })
  })

  test('keeps bare filenames without a directory', () => {
    expect(splitDisplayPath('README.md')).toEqual({ dir: '', file: 'README.md' })
  })
})

describe('compactDisplayDir', () => {
  test('keeps short directories unchanged', () => {
    expect(compactDisplayDir('apps/web/src')).toBe('apps/web/src')
  })

  test('compacts long directories around the most useful segments', () => {
    expect(compactDisplayDir('seller_promotion_platform/seller-promotion-platform/frontend/src/main')).toBe(
      'seller_promotion_platform/…/src/main',
    )
  })
})
