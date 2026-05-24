// Single source of truth for the user's theme. Mirrors deck-app's design:
// pref ('auto' | 'light' | 'dark') persists; resolved ('light' | 'dark')
// is computed against `nativeTheme.shouldUseDarkColors` when pref === 'auto'.
// Renderers pull `{ pref, resolved }` at boot and subscribe to changes —
// they never read prefers-color-scheme themselves.

import { nativeTheme } from 'electron'
import { loadSettings, setThemePref as persistThemePref } from '#/main/settings.ts'
import type { ResolvedTheme, ThemePref, ThemeState } from '#/shared/rpc.ts'

type Listener = (state: ThemeState) => void

let currentPref: ThemePref = 'auto'
let currentResolved: ResolvedTheme = 'light'
const listeners = new Set<Listener>()
let inited = false
let transitionDepth = 0

function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref === 'light' || pref === 'dark') return pref
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
}

function applyToNativeTheme(pref: ThemePref): void {
  // Drive native dialogs / menus to match the user's pick.
  nativeTheme.themeSource = pref === 'auto' ? 'system' : pref
}

function emit(): void {
  const state: ThemeState = { pref: currentPref, resolved: currentResolved }
  for (const l of listeners) {
    try {
      l(state)
    } catch (err) {
      console.warn('[theme] listener threw', err)
    }
  }
}

export async function initTheme(): Promise<void> {
  if (inited) return
  inited = true
  const settings = await loadSettings()
  currentPref = settings.theme
  applyToNativeTheme(currentPref)
  currentResolved = resolveTheme(currentPref)

  // Fires both on OS appearance changes AND when we assign themeSource
  // ourselves. We only care about the former, only when pref === 'auto'.
  nativeTheme.on('updated', () => {
    if (transitionDepth > 0) return
    if (currentPref !== 'auto') return
    const next = resolveTheme('auto')
    if (next === currentResolved) return
    currentResolved = next
    emit()
  })
}

export function getTheme(): ThemeState {
  return { pref: currentPref, resolved: currentResolved }
}

export async function setThemePref(pref: ThemePref): Promise<ThemeState> {
  if (pref === currentPref) return { pref: currentPref, resolved: currentResolved }
  transitionDepth++
  try {
    await persistThemePref(pref)
    currentPref = pref
    applyToNativeTheme(pref)
    currentResolved = resolveTheme(pref)
    emit()
    return { pref: currentPref, resolved: currentResolved }
  } finally {
    transitionDepth--
  }
}

export function subscribeTheme(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
