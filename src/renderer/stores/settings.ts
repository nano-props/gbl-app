// Renderer-side mirror of the persistable settings (excluding theme,
// which has its own dedicated store because of the broadcast machinery
// around dark/light flips).
//
// Hydrate at boot pulls the full snapshot via IPC; `setFetchInterval`
// writes through to main, which broadcasts a change so any other
// window we eventually open stays in sync.

import { create } from 'zustand'
import type { SessionState } from '#/renderer/types-bridge.ts'

interface SettingsStore {
  fetchIntervalSec: number
  /** Saved session from previous run — consumed once by App.tsx during
   *  hydration, then irrelevant. We keep it in state for diagnostics. */
  savedSession: SessionState

  hydrate: () => Promise<SessionState>
  setFetchInterval: (sec: number) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  fetchIntervalSec: 60,
  savedSession: { openRepos: [], activeRepo: null },

  async hydrate() {
    const snap = await window.gbl.settings.get()
    set({
      fetchIntervalSec: snap.fetchIntervalSec,
      savedSession: snap.session,
    })
    // Subscribe to interval changes pushed from main (e.g. settings
    // window in the future). Listener is process-lifetime — we don't
    // unsubscribe.
    window.gbl.settings.onFetchIntervalChange((sec) => set({ fetchIntervalSec: sec }))
    return snap.session
  },

  async setFetchInterval(sec) {
    const clamped = Math.max(0, Math.min(3600, Math.round(sec)))
    await window.gbl.settings.setFetchInterval(clamped)
    set({ fetchIntervalSec: clamped })
  },
}))
