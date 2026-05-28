import { describe, expect, test } from 'vitest'
import { branchActionMenuItemDisabled } from '#/renderer/components/BranchActionsMenu.tsx'
import type { BranchActionItem } from '#/renderer/hooks/useBranchActionItems.ts'

function item(overrides: Partial<BranchActionItem> = {}): BranchActionItem {
  return {
    id: 'pull',
    label: 'Pull',
    disabled: false,
    busy: false,
    visible: true,
    icon: null,
    onSelect: () => {},
    ...overrides,
  }
}

describe('branchActionMenuItemDisabled', () => {
  test('keeps busy items disabled', () => {
    expect(branchActionMenuItemDisabled(item({ id: 'pull', busy: true }), 'pull')).toBe(true)
  })

  test('blocks other items while one item is busy', () => {
    expect(branchActionMenuItemDisabled(item({ id: 'push' }), 'pull')).toBe(true)
  })
})
