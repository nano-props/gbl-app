import { useCallback, useMemo, useState } from 'react'
import type { SettingsPage } from '#/renderer/components/SettingsPanel.tsx'
import { useOverlayRegistry } from '#/renderer/hooks/useOverlayRegistry.ts'

const APP_OVERLAY_KEYS = ['settings', 'clone', 'openRepo'] as const
type AppOverlayKey = (typeof APP_OVERLAY_KEYS)[number]

export function useAppOverlays() {
  // App-level orchestration layer: compose the generic open/close registry with
  // any overlay-specific payload (such as settingsPage). New app overlays
  // should usually be wired here rather than expanding useOverlayRegistry.
  const registry = useOverlayRegistry<AppOverlayKey>(APP_OVERLAY_KEYS)
  const { anyOpen, close, closeAll, open, setOpen, state: openByKey } = registry
  const [settingsPage, setSettingsPage] = useState<SettingsPage>('general')

  const openSettings = useCallback((page: SettingsPage = 'general') => {
    setSettingsPage(page)
    open('settings')
  }, [open])

  const closeSettings = useCallback(() => {
    close('settings')
    setSettingsPage('general')
  }, [close])

  const openCloneRepo = useCallback(() => {
    open('clone')
  }, [open])

  const setCloneOpen = useCallback((open: boolean) => {
    setOpen('clone', open)
  }, [setOpen])

  const openRepoPathDialog = useCallback(() => {
    open('openRepo')
  }, [open])

  const setOpenRepoOpen = useCallback((open: boolean) => {
    setOpen('openRepo', open)
  }, [setOpen])

  const closeAllOverlays = useCallback(() => {
    closeAll()
    setSettingsPage('general')
  }, [closeAll])

  const state = useMemo(() => ({
    settings: { open: openByKey.settings, page: settingsPage },
    clone: { open: openByKey.clone },
    openRepo: { open: openByKey.openRepo },
  }), [openByKey.clone, openByKey.openRepo, openByKey.settings, settingsPage])

  return {
    state,
    anyOpen,
    openSettings,
    closeSettings,
    openCloneRepo,
    setCloneOpen,
    openRepoPathDialog,
    setOpenRepoOpen,
    closeAllOverlays,
  }
}
