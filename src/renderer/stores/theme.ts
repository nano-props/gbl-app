// Renderer-side mirror of main's theme state. Hydrate at boot pulls
// `{pref, resolved}` over IPC; the subscription keeps html[data-theme]
// in lock-step with cross-window changes (and OS-appearance flips when
// pref === 'auto'). Renderers don't read prefers-color-scheme on their
// own — main is the single source of truth.

import { create } from 'zustand'
import type { ResolvedTheme, ThemePref, ThemeState } from '#/renderer/types-bridge.ts'

interface ThemeStore extends ThemeState {
  setPref: (pref: ThemePref) => Promise<void>
  hydrate: () => Promise<void>
}

function applyHtmlAttr(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved)
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  // index.html's inline boot script sets data-theme before stylesheets
  // load — read it back here so the initial render doesn't disagree
  // with first paint.
  pref: 'auto',
  resolved: (document.documentElement.getAttribute('data-theme') as ResolvedTheme) ?? 'light',

  async hydrate() {
    const state = await window.gbl.theme.get()
    applyHtmlAttr(state.resolved)
    set(state)
    window.gbl.theme.onChange((next) => {
      applyHtmlAttr(next.resolved)
      set(next)
    })
  },

  async setPref(pref) {
    if (pref === get().pref) return
    const next = await window.gbl.theme.setPref(pref)
    applyHtmlAttr(next.resolved)
    set(next)
  },
}))
