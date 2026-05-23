import { describe, expect, test } from 'vitest'
import { ellipsizeLeftPath } from '#/renderer/lib/display-path.ts'

describe('ellipsizeLeftPath', () => {
  test('keeps paths that fit unchanged', () => {
    expect(ellipsizeLeftPath('apps/web/src/App.tsx', 20)).toBe('apps/web/src/App.tsx')
  })

  test('keeps the longest fitting suffix', () => {
    expect(ellipsizeLeftPath('a/b/c/d/file.ts', 14)).toBe('…/c/d/file.ts')
  })

  test('drops left prefixes for deeply nested project paths', () => {
    expect(
      ellipsizeLeftPath(
        'seller_promotion_platform/seller-promotion-platform/seller-promotion-platform-frontend/free-exposure-promotion/src/ui/i18n/m-en.yaml',
        60,
      ),
    ).toBe('…/free-exposure-promotion/src/ui/i18n/m-en.yaml')
  })

  test('falls back to left ellipsis for long filenames', () => {
    expect(ellipsizeLeftPath('very-long-filename.component.tsx', 12)).toBe('…mponent.tsx')
  })

  test('never exceeds the requested character budget for tiny widths', () => {
    for (let maxChars = 0; maxChars <= 3; maxChars += 1) {
      expect(ellipsizeLeftPath('apps/web/src/App.tsx', maxChars).length).toBeLessThanOrEqual(maxChars)
    }
  })

  test('normalizes invalid and fractional character budgets', () => {
    expect(ellipsizeLeftPath('apps/web/src/App.tsx', Number.NaN)).toBe('')
    expect(ellipsizeLeftPath('apps/web/src/App.tsx', 14.9)).toBe('…/src/App.tsx')
  })
})
