// Root layout — three-region shell:
//   row 1 (40px): Topbar (always)
//   row 2 (1fr):  RepoTabs sidebar + active RepoView body
//
// Boots in this order:
//   1. theme.hydrate()       — pulls main's resolved theme + subscribes
//   2. settings.hydrate()    — fetch interval, recents, saved session
//   3. repos.hydrateSession  — re-opens the repos that were open last run
//
// After hydration, side-effects run for the lifetime of the app:
//   - background fetch loop (active repo only, debounced by interval)
//   - session persistence (any change to open repos / active id writes
//     through to main so the next launch can restore)
//   - menu-action listener (forwards `app:menu-invoke` to store actions)
//   - settings write-error toast (warns the user if prefs aren't
//     persisting instead of silently dropping their changes)

import { useEffect, useRef, useState } from 'react'
import { Topbar } from '#/renderer/components/Topbar.tsx'
import { ErrorBoundary } from '#/renderer/components/ErrorBoundary.tsx'
import { RepoTabs } from '#/renderer/components/RepoTabs.tsx'
import { RepoView } from '#/renderer/components/RepoView.tsx'
import { SettingsPanel } from '#/renderer/components/SettingsPanel.tsx'
import { HelpOverlay } from '#/renderer/components/HelpOverlay.tsx'
import { useReposStore } from '#/renderer/stores/repos.ts'
import { useSettingsStore } from '#/renderer/stores/settings.ts'
import { useThemeStore } from '#/renderer/stores/theme.ts'
import { useI18nStore, useT } from '#/renderer/stores/i18n.ts'
import { useKeyboard } from '#/renderer/hooks/useKeyboard.ts'

export function App() {
  const activeId = useReposStore((s) => s.activeId)
  const order = useReposStore((s) => s.order)
  const sessionReady = useReposStore((s) => s.sessionReady)
  const backgroundFetch = useReposStore((s) => s.backgroundFetch)
  const refreshAll = useReposStore((s) => s.refreshAll)
  const closeRepo = useReposStore((s) => s.closeRepo)
  const cycleActive = useReposStore((s) => s.cycleActive)
  const setRightTab = useReposStore((s) => s.setRightTab)
  const hydrateSession = useReposStore((s) => s.hydrateSession)
  const fetchIntervalSec = useSettingsStore((s) => s.fetchIntervalSec)
  const hydrateSettings = useSettingsStore((s) => s.hydrate)
  const hydrateTheme = useThemeStore((s) => s.hydrate)
  const hydrateI18n = useI18nStore((s) => s.hydrate)
  const cycleTheme = useThemeStore((s) => s.setPref)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [writeError, setWriteError] = useState<string | null>(null)

  // ---- Boot hydration -----------------------------------------------------
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    void (async () => {
      await Promise.all([hydrateTheme(), hydrateSettings(), hydrateI18n()])
      const session = useSettingsStore.getState().savedSession
      await hydrateSession(session.openRepos, session.activeRepo)
    })()
  }, [hydrateTheme, hydrateSettings, hydrateI18n, hydrateSession])

  // ---- Session persistence -----------------------------------------------
  useEffect(() => {
    if (!sessionReady) return
    void window.gbl.settings.saveSession({ openRepos: order, activeRepo: activeId })
  }, [sessionReady, order, activeId])

  // ---- Settings write-error toast ----------------------------------------
  useEffect(() => {
    const off = window.gbl.settings.onWriteError((message) => setWriteError(message))
    return off
  }, [])

  // ---- Background fetch loop ---------------------------------------------
  useEffect(() => {
    if (!activeId || fetchIntervalSec <= 0) return
    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      await backgroundFetch(activeId)
    }
    const interval = setInterval(tick, fetchIntervalSec * 1000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activeId, fetchIntervalSec, backgroundFetch])

  // ---- Menu action receiver ----------------------------------------------
  useEffect(() => {
    const off = window.gbl.onMenuAction(async (action) => {
      const state = useReposStore.getState()
      switch (action) {
        case 'open-repo': {
          const path = await window.gbl.openDialog()
          if (path) await state.openRepo(path)
          break
        }
        case 'close-repo': {
          // ⌘W: close active repo tab if there is one. If no repo is
          // open, fall through to closing the window — macOS convention.
          if (state.activeId) {
            closeRepo(state.activeId)
          } else {
            window.close()
          }
          break
        }
        case 'next-repo':
          cycleActive(1)
          break
        case 'prev-repo':
          cycleActive(-1)
          break
        case 'refresh':
          if (state.activeId) await refreshAll(state.activeId)
          break
        case 'tab-branches':
          if (state.activeId) setRightTab(state.activeId, 'branches')
          break
        case 'tab-log':
          if (state.activeId) setRightTab(state.activeId, 'log')
          break
        case 'tab-status':
          if (state.activeId) setRightTab(state.activeId, 'status')
          break
        case 'tab-worktrees':
          if (state.activeId) setRightTab(state.activeId, 'worktrees')
          break
        case 'toggle-theme': {
          // Read pref from store, not closure: the menu effect runs once
          // (deps: []) so a captured themePref would go stale after the
          // user changes the theme via the Settings panel.
          const current = useThemeStore.getState().pref
          const next = current === 'auto' ? 'light' : current === 'light' ? 'dark' : 'auto'
          await cycleTheme(next)
          break
        }
        case 'open-settings':
          setSettingsOpen(true)
          break
        case 'show-help':
          setHelpOpen(true)
          break
      }
    })
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useKeyboard({
    onShowHelp: () => setHelpOpen(true),
    isOverlayOpen: () => settingsOpen || helpOpen,
  })

  return (
    // Outer ErrorBoundary catches crashes in Topbar/Sidebar — without
    // this, a corrupt settings.json or rendering bug elsewhere blanks
    // the entire window. The inner ErrorBoundary around RepoView still
    // exists so a tab-specific crash doesn't take down the rest of the
    // app.
    <ErrorBoundary>
      <div className="flex h-full flex-col">
        <Topbar onOpenSettings={() => setSettingsOpen(true)} onShowHelp={() => setHelpOpen(true)} />
        <div className="flex flex-1 min-h-0">
          <RepoTabs />
          <main className="flex flex-1 min-w-0">
            <ErrorBoundary resetKey={activeId}>
              {activeId ? <RepoView repoId={activeId} /> : <EmptyState />}
            </ErrorBoundary>
          </main>
        </div>
        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
        {writeError && <WriteErrorToast message={writeError} onDismiss={() => setWriteError(null)} />}
      </div>
    </ErrorBoundary>
  )
}

function EmptyState() {
  const t = useT()
  // Body is rendered as React fragments rather than dangerouslySet
  // because the dictionary text contains a placeholder for "Open" and
  // a kbd chip — both of which are easier to express as real elements
  // and remove the only XSS risk vector for this string.
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="text-sm font-medium text-ink mb-1">{t('empty.title')}</div>
        <div className="text-xs text-ink-3 leading-relaxed">
          {t('empty.body.before')}
          <span className="text-ink-2">{t('empty.body.openLabel')}</span>
          {t('empty.body.middle')}
          <span className="kbd">?</span>
          {t('empty.body.after')}
        </div>
      </div>
    </div>
  )
}

function WriteErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const t = useT()
  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md border border-[rgb(var(--color-danger-rgb)/0.4)] bg-[rgb(var(--color-danger-rgb)/0.08)] p-3 shadow-card text-xs text-danger animate-in fade-in-0 slide-in-from-right-1"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="font-semibold mb-0.5">{t('error.settingsWriteTitle')}</div>
          <div className="text-ink-2 break-words">{message}</div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-ink-3 hover:text-ink shrink-0"
          aria-label={t('dialog.close')}
        >
          ×
        </button>
      </div>
    </div>
  )
}
