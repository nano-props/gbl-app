// Settings IPC. Exposes the subset of `settings.ts` that the renderer
// needs — theme pref + fetch interval + recents + session state.
// Theme has its own `theme:*` channel pair (set + broadcast) defined in
// `ipc/theme.ts`; here we expose the simpler one-shot setters.
//
// Also wires the settings write-error broadcast so the renderer can
// show a toast instead of silently losing prefs when the disk is full /
// userData is read-only / iCloud holds the lock.

import { ipcMain, BrowserWindow } from 'electron'
import {
  clearRecents,
  loadSettings,
  onSettingsWriteError,
  setFetchInterval,
  setSession,
  type SessionState,
} from '#/main/settings.ts'

export function wireSettingsIpc(): void {
  // Hydrate the renderer at boot. The full settings blob is small
  // enough that one IPC trip is cheaper than per-field handlers.
  ipcMain.handle('settings:get', async () => {
    const s = await loadSettings()
    return {
      theme: s.theme,
      fetchIntervalSec: s.fetchIntervalSec,
      recents: s.recents,
      session: s.session,
    }
  })

  ipcMain.handle('settings:set-fetch-interval', async (_e, sec: number) => {
    if (typeof sec !== 'number') return
    await setFetchInterval(sec)
    broadcastFetchInterval(sec)
  })

  ipcMain.handle('settings:clear-recents', async () => {
    await clearRecents()
  })

  ipcMain.handle('settings:save-session', async (_e, session: SessionState) => {
    if (!session || !Array.isArray(session.openRepos)) return
    const cleaned: SessionState = {
      openRepos: session.openRepos.filter((p) => typeof p === 'string'),
      activeRepo: typeof session.activeRepo === 'string' ? session.activeRepo : null,
    }
    await setSession(cleaned)
  })

  // Surface persistence failures to the renderer. Listener is
  // process-lifetime — we don't unsubscribe.
  onSettingsWriteError((err) => {
    const message = err instanceof Error ? err.message : String(err)
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('app:settings-write-error', message)
    }
  })
}

function broadcastFetchInterval(sec: number): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('app:fetch-interval-changed', sec)
  }
}
