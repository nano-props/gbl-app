// Top app bar. Holds the Open button and Recents dropdown.
// The .topbar CSS rule turns this into the OS drag region; child buttons
// opt out via -webkit-app-region: no-drag (set globally on `button` and
// any element with `data-interactive`).

import { useEffect, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Folder, HelpCircle, Settings } from 'lucide-react'
import { useReposStore } from '#/renderer/stores/repos.ts'
import { useSettingsStore } from '#/renderer/stores/settings.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import { Tip } from '#/renderer/components/Tip.tsx'
import { cn } from '#/renderer/lib/cn.ts'

interface Props {
  onOpenSettings: () => void
  onShowHelp: () => void
}

export function Topbar({ onOpenSettings, onShowHelp }: Props) {
  const t = useT()
  const openRepo = useReposStore((s) => s.openRepo)
  const recents = useSettingsStore((s) => s.recents)
  const refreshRecents = useSettingsStore((s) => s.refreshRecents)
  const [recentsOpen, setRecentsOpen] = useState(false)

  useEffect(() => {
    void refreshRecents()
  }, [refreshRecents])

  async function handleOpen() {
    const path = await window.gbl.openDialog()
    if (!path) return
    await openRepo(path)
    void refreshRecents()
  }

  async function handleOpenRecent(p: string) {
    setRecentsOpen(false)
    await openRepo(p)
    void refreshRecents()
  }

  return (
    <div className="topbar flex h-10 items-center gap-2 border-b border-line bg-bg-deep text-sm">
      <div className="flex-1" />

      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-2 bg-surface px-2.5 text-ink-2 hover:text-ink hover:bg-bg shadow-sm"
      >
        <Folder size={14} />
        <span>{t('topbar.open')}</span>
      </button>

      {/* Recents popover. Radix wires Esc, click-outside, focus
       * management and arrow-key navigation for free, replacing the
       * earlier hand-rolled `useState + onClick` toggle. */}
      <Popover.Root open={recentsOpen} onOpenChange={setRecentsOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="inline-flex h-7 items-center rounded-md border border-line-2 bg-surface px-2.5 text-ink-2 hover:text-ink hover:bg-bg shadow-sm"
          >
            {t('topbar.recents')}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            sideOffset={6}
            align="end"
            className="z-40 w-80 rounded-md border border-line-2 bg-surface shadow-card scroll-thin overflow-auto max-h-80 animate-in fade-in-0 zoom-in-95"
          >
            {recents.length === 0 ? (
              <div className="p-3 text-ink-3 text-xs">{t('topbar.recentsEmpty')}</div>
            ) : (
              recents.map((r) => (
                <button
                  key={r.path}
                  type="button"
                  onClick={() => handleOpenRecent(r.path)}
                  className={cn(
                    'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left',
                    'hover:bg-bg-deep border-b border-line last:border-b-0',
                  )}
                >
                  <span className="text-ink truncate w-full">{r.name}</span>
                  <span className="text-ink-3 text-xs truncate w-full">{r.path}</span>
                </button>
              ))
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Tip label={t('topbar.help')}>
        <button
          type="button"
          onClick={onShowHelp}
          aria-label={t('topbar.help')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line-2 bg-surface text-ink-2 hover:text-ink hover:bg-bg shadow-sm"
        >
          <HelpCircle size={14} />
        </button>
      </Tip>
      <Tip label={t('topbar.settings')}>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label={t('topbar.settings')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line-2 bg-surface text-ink-2 hover:text-ink hover:bg-bg shadow-sm"
        >
          <Settings size={14} />
        </button>
      </Tip>
    </div>
  )
}
