import { useEffect, useRef } from 'react'
import { useI18nStore } from '#/renderer/stores/i18n.ts'
import { useSettingsStore } from '#/renderer/stores/settings.ts'
import { useThemeStore } from '#/renderer/stores/theme.ts'

export function useSettingsWindowBootstrap() {
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    void (async () => {
      const externalAppsHydrate = useSettingsStore
        .getState()
        .hydrateExternalApps()
        .catch((err) => console.warn('[settings-window] external apps hydrate failed', err))
      try {
        await Promise.all([useThemeStore.getState().hydrate(), useSettingsStore.getState().hydrate(), useI18nStore.getState().hydrate()])
        await externalAppsHydrate
      } catch (err) {
        console.warn('[settings-window] bootstrap failed', err)
      }
    })()
  }, [])
}
