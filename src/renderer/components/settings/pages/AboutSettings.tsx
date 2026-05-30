import { ExternalLink, Hash, Tag } from 'lucide-react'
import { Button } from '#/renderer/components/ui/button.tsx'
import { GitHubMark } from '#/renderer/components/GitHubMark.tsx'
import { useT } from '#/renderer/stores/i18n.ts'
import { rpc } from '#/renderer/rpc.ts'
import { cn } from '#/renderer/lib/cn.ts'

const appIconUrl = new URL('../../../../../assets/icon.png', import.meta.url).href

export function AboutSettings() {
  const t = useT()
  const commit = __BUILD_INFO__.commit
  const openProjectGitHub = () => {
    void rpc.app.openProjectGitHub.mutate().catch((err) => {
      console.warn('[settings] open project GitHub failed', err)
    })
  }

  return (
    <ul className="overflow-hidden rounded-xl border border-border/60 bg-background/85 shadow-[var(--shadow-inset-highlight)]">
      <li className="flex min-h-14 items-center gap-3 px-4 py-2.5 [&+&]:border-t [&+&]:border-separator">
        <img src={appIconUrl} alt="Goblin" className="size-8 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <span className="truncate text-sm font-medium text-foreground">{t('about.app')}</span>
        </div>
      </li>
      <li className="flex min-h-14 items-center gap-3 px-4 py-2.5 [&+&]:border-t [&+&]:border-separator">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Tag size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="truncate text-sm font-medium text-foreground">{t('about.version')}</span>
        </div>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">v{__APP_VERSION__}</span>
      </li>
      <li className="flex min-h-14 items-center gap-3 px-4 py-2.5 [&+&]:border-t [&+&]:border-separator">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Hash size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="truncate text-sm font-medium text-foreground">{t('about.build')}</span>
        </div>
        <span className={cn('shrink-0 text-xs text-muted-foreground', commit ? 'font-mono' : 'font-sans')}>
          {commit || t('about.build.unknown')}
        </span>
      </li>
      <li className="flex min-h-14 items-center gap-3 px-4 py-2.5 [&+&]:border-t [&+&]:border-separator">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <GitHubMark className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="truncate text-sm font-medium text-foreground">{t('about.github')}</span>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{t('about.github.body')}</p>
        </div>
        <Button
          type="button"
          data-interactive
          variant="ghost"
          size="icon-lg"
          onClick={openProjectGitHub}
          className="shrink-0 text-muted-foreground hover:text-accent-foreground"
          aria-label={t('settings.open-github')}
        >
          <ExternalLink className="size-3.5" />
        </Button>
      </li>
    </ul>
  )
}
