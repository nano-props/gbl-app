// Top app bar. Holds the Open button + ambient utilities (help / settings).
// The .topbar CSS rule turns this into the OS drag region; child buttons
// opt out via -webkit-app-region: no-drag (set globally on `button` and
// any element with `data-interactive`).

import { FolderOpen, HelpCircle, Settings } from 'lucide-react'
import { useReposStore } from '#/renderer/stores/repos.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import { Tip } from '#/renderer/components/Tip.tsx'
import { Logo } from '#/renderer/components/Logo.tsx'
import { Button } from '#/renderer/components/ui/button.tsx'

interface Props {
  onOpenSettings: () => void
  onShowHelp: () => void
}

export function Topbar({ onOpenSettings, onShowHelp }: Props) {
  const t = useT()
  const openRepo = useReposStore((s) => s.openRepo)

  async function handleOpen() {
    const path = await window.gbl.openDialog()
    if (!path) return
    await openRepo(path)
  }

  return (
    <div className="topbar relative flex h-10 items-center gap-2 border-b border-border bg-background text-sm">
      {/* Brand wordmark, centred over the title bar like a native macOS
       * window chrome (cf. Apple's HIG title-bar layout). Absolute so
       * its position is independent of how many action buttons sit on
       * the right; pointer-events-none keeps the OS drag region
       * unblocked beneath it. Hidden below md (≥768px) so the wordmark
       * doesn't overlap the right-side action cluster on a narrow
       * window — the project's minWidth is 800px, so this only kicks
       * in if the user resizes mid-session. */}
      <div className="pointer-events-none absolute inset-0 hidden md:flex items-center justify-center">
        <Logo />
      </div>

      <div className="flex-1" />

      {/* Topbar actions are ghost-icon-only — same idiom as macOS title
       * bars and the deck-app reference: hover surfaces the button,
       * tooltips name the action. Keeping all three to one visual class
       * (no mixed text+icon buttons) reads as a single chrome cluster
       * rather than a "primary action + utilities" split, which fits
       * a tool whose primary action lives in the repo body, not the
       * top bar. */}
      <Tip label={t('topbar.open')}>
        <Button variant="ghost" size="icon" onClick={handleOpen} aria-label={t('topbar.open')}>
          <FolderOpen />
        </Button>
      </Tip>

      <Tip label={t('topbar.help')}>
        <Button variant="ghost" size="icon" onClick={onShowHelp} aria-label={t('topbar.help')}>
          <HelpCircle />
        </Button>
      </Tip>
      <Tip label={t('topbar.settings')}>
        <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label={t('topbar.settings')}>
          <Settings />
        </Button>
      </Tip>
    </div>
  )
}
