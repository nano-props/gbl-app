import type { BranchUiAction } from '#/renderer/hooks/useBranchActions.tsx'

type BranchActionShortcutHandler = (action: BranchUiAction) => void

let handler: BranchActionShortcutHandler | null = null

export function setBranchActionShortcutHandler(next: BranchActionShortcutHandler): () => void {
  handler = next
  return () => {
    if (handler === next) handler = null
  }
}

export function runBranchActionShortcut(action: BranchUiAction) {
  handler?.(action)
}
