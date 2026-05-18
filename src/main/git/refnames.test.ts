import { describe, expect, test } from 'bun:test'
import { isSafeBranchName } from '#/main/git/refnames.ts'

describe('isSafeBranchName', () => {
  test('accepts ordinary branch names', () => {
    expect(isSafeBranchName('feature/worktree-actions')).toBe(true)
    expect(isSafeBranchName('jizhao_fix-123')).toBe(true)
  })

  test('rejects option-like and refspec-unsafe names', () => {
    for (const branch of [
      '-f',
      'has space',
      'bad\0name',
      'bad..name',
      'bad~name',
      'bad^name',
      'bad:name',
      'bad\\name',
    ]) {
      expect(isSafeBranchName(branch)).toBe(false)
    }
  })
})
