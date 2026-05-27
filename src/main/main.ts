import { app } from 'electron'
import { activateMainWindow } from '#/main/window.ts'
import { initTheme } from '#/main/theme.ts'
import { loadSettings, flushSettings } from '#/main/settings.ts'
import { buildAppMenu } from '#/main/menu.ts'
import { assertDictionaryParity, resolveLang, setCurrentLang } from '#/main/i18n/index.ts'
import { wireRpcIpc } from '#/main/rpc.ts'
import { wireTerminalIpc } from '#/main/terminal.ts'
import { syncGlobalShortcuts, unregisterAppShortcuts } from '#/main/shortcuts.ts'

function activateMainWindowFromEvent(): void {
  void activateMainWindow().catch((err) => {
    console.error('[window] failed to activate main window', err)
  })
}

async function main(): Promise<void> {
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  }

  app.on('second-instance', () => {
    activateMainWindowFromEvent()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('will-quit', () => {
    unregisterAppShortcuts()
  })

  // Drain debounced settings writes before exit so the last theme pick,
  // window resize, or session change isn't lost. `isQuitting` guards
  // the second pass — app.exit fires before-quit again, and without
  // the guard we'd loop.
  let isQuitting = false
  app.on('before-quit', async (event) => {
    if (isQuitting) return
    event.preventDefault()
    isQuitting = true
    try {
      const flushed = await flushSettings()
      if (!flushed) console.error('[settings] final flush failed before quit')
    } finally {
      app.exit(0)
    }
  })

  await app.whenReady()

  // Settings before theme — initTheme reads the persisted pref.
  const settings = await loadSettings()
  await initTheme()

  // Resolve language BEFORE buildMenu — every menu label runs through
  // `t()` and would otherwise render in the default ('en') for the
  // first frame.
  assertDictionaryParity(!app.isPackaged)
  setCurrentLang(resolveLang(settings.lang))

  wireRpcIpc()
  wireTerminalIpc()

  buildAppMenu()
  syncGlobalShortcuts(settings.globalShortcutDisabled, settings.globalShortcut)

  await activateMainWindow()
  app.on('activate', activateMainWindowFromEvent)
}

void main()
