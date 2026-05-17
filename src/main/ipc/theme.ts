import { ipcMain, BrowserWindow } from 'electron'
import { getTheme, setThemePref, subscribeTheme } from '#/main/theme.ts'
import type { ThemePref } from '#/main/settings.ts'

let wired = false

export function wireThemeIpc(): void {
  // Idempotent. If wireThemeIpc is ever called twice (HMR / tests /
  // accidental double-init) we don't want to register a second
  // ipcMain.handle (which throws) or a second theme listener (which
  // would double-broadcast every change).
  if (wired) return
  wired = true

  ipcMain.handle('theme:get', () => getTheme())

  ipcMain.handle('theme:set-pref', async (_e, pref: ThemePref) => {
    if (pref !== 'auto' && pref !== 'light' && pref !== 'dark') return getTheme()
    return setThemePref(pref)
  })

  // Broadcast theme changes to every window. Listener stays alive for the
  // process lifetime — we don't unsubscribe.
  subscribeTheme((state) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('app:theme-changed', state)
    }
  })
}
