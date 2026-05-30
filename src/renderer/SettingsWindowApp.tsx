import { ErrorBoundary } from '#/renderer/components/ErrorBoundary.tsx'
import { SettingsSurface } from '#/renderer/components/SettingsSurface.tsx'
import { Toaster } from '#/renderer/components/ui/sonner.tsx'
import { SETTINGS_WINDOW_TOP_INSET_PX } from '#/shared/settings-window.ts'
import { isSettingsPage, type SettingsPage } from '#/shared/settings-pages.ts'
import { useWindowLifecycle } from '#/renderer/hooks/useWindowLifecycle.ts'
import { useWindowPageState } from '#/renderer/hooks/useWindowPageState.ts'
import { useSettingsWindowBootstrap } from '#/renderer/hooks/useSettingsWindowBootstrap.ts'

export function SettingsWindowApp() {
  useSettingsWindowBootstrap()
  useWindowLifecycle('settings')
  const [page, setPage] = useWindowPageState<SettingsPage>({
    windowKey: 'settings',
    defaultPage: 'general',
    isPage: isSettingsPage,
  })

  return (
    <ErrorBoundary>
      <div className="flex h-full flex-col">
        <SettingsSurface
          page={page}
          onPageChange={setPage}
          topInset={SETTINGS_WINDOW_TOP_INSET_PX}
          autoFocusSelected={false}
        />
        <Toaster position="bottom-right" closeButton />
      </div>
    </ErrorBoundary>
  )
}
