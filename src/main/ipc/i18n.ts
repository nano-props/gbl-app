// i18n IPC. The renderer pulls `{lang, pref, dict}` once at boot, then
// subscribes to `app:i18n-changed` for live updates. Setting the pref
// rebuilds the menu (so menu labels stay in sync) and broadcasts.

import { ipcMain, BrowserWindow } from 'electron'
import { getCurrentLang, getDictionary, resolveLang, setCurrentLang, type LangPref } from '#/main/i18n/index.ts'
import { loadSettings, setLangPref } from '#/main/settings.ts'
import { buildAppMenu } from '#/main/menu.ts'

export function wireI18nIpc(): void {
  ipcMain.handle('i18n:get', async () => {
    const settings = await loadSettings()
    return {
      lang: getCurrentLang(),
      pref: settings.lang,
      dict: getDictionary(),
    }
  })

  ipcMain.handle('i18n:set-pref', async (_e, pref: LangPref) => {
    if (pref !== 'auto' && pref !== 'en' && pref !== 'zh' && pref !== 'ko' && pref !== 'ja') return null
    await setLangPref(pref)
    const lang = resolveLang(pref)
    setCurrentLang(lang)
    // Rebuild menu so File / View / Window labels reflect the new lang.
    buildAppMenu()
    const payload = { lang, pref, dict: getDictionary() }
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('app:i18n-changed', payload)
    }
    return payload
  })
}
