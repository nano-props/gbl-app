// Global keyboard shortcuts. Mounted once in App.tsx — all bindings
// live here so adding/removing one is a single-file change.
//
// Shortcuts that are also wired through the application menu (⌘O,
// ⌘W, ⌘1..4, ⌘[ , ⌘]) are handled by Electron's accelerator system
// and forwarded via `app:menu-invoke`. We only handle the "no
// modifier" keys here (j/k/?/Enter/Esc) so we don't fight the menu.
//
// Modal awareness: when an overlay is open (Settings / Help / commit
// detail) the j/k/Enter shortcuts are suppressed — otherwise typing
// j with the help dialog open would jump rows in the list behind it.

import { useEffect } from 'react'
import { useReposStore } from '#/renderer/stores/repos.ts'

interface Options {
  onShowHelp: () => void
  /** Returns true when a Settings or Help modal is currently mounted.
   *  Commit-detail overlay is checked from the active repo state. */
  isOverlayOpen: () => boolean
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export function useKeyboard({ onShowHelp, isOverlayOpen }: Options) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) return

      const state = useReposStore.getState()
      const repoId = state.activeId
      const repo = repoId ? state.repos[repoId] : null

      // Help (?) is allowed at any time — even with a modal open it's
      // a useful escape hatch (Modal will handle its own Esc; ? lets
      // the user discover other shortcuts).
      if (e.key === '?') {
        e.preventDefault()
        onShowHelp()
        return
      }

      // Block list-movement / Enter when overlays are visible.
      const overlayOpen = isOverlayOpen() || !!repo?.openCommit

      switch (e.key) {
        case 'j':
        case 'ArrowDown': {
          if (overlayOpen || !repo) break
          if (repo.rightTab === 'branches' && repo.branches.length > 0) {
            e.preventDefault()
            const idx = repo.branches.findIndex((b) => b.name === repo.selectedBranch)
            const nextIdx = Math.min(repo.branches.length - 1, idx < 0 ? 0 : idx + 1)
            const next = repo.branches[nextIdx]
            if (next) state.selectBranch(repo.id, next.name)
          }
          break
        }
        case 'k':
        case 'ArrowUp': {
          if (overlayOpen || !repo) break
          if (repo.rightTab === 'branches' && repo.branches.length > 0) {
            e.preventDefault()
            const idx = repo.branches.findIndex((b) => b.name === repo.selectedBranch)
            const nextIdx = Math.max(0, idx < 0 ? 0 : idx - 1)
            const next = repo.branches[nextIdx]
            if (next) state.selectBranch(repo.id, next.name)
          }
          break
        }
        case 'Enter': {
          if (overlayOpen) break
          if (!repo || repo.rightTab !== 'branches') break
          e.preventDefault()
          // Eligibility (current branch / worktree-occupied) is
          // checked inside the store action — keep this tight.
          void state.checkoutSelected()
          break
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onShowHelp, isOverlayOpen])
}
