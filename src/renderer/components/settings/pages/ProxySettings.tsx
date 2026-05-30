import { Badge } from '#/renderer/components/ui/badge.tsx'
import { SettingsGroup } from '#/renderer/components/settings/SettingsPrimitives.tsx'
import { useT } from '#/renderer/stores/i18n.ts'

export function ProxySettings() {
  const t = useT()
  return (
    <>
      <SettingsGroup label={t('settings.proxy.ssh-title')} hint={t('settings.proxy.ssh-body')}>
        <div className="overflow-hidden rounded-xl border border-border/60 bg-background/85 shadow-[var(--shadow-inset-highlight)]">
          <div className="px-4 py-3">
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-snug text-muted-foreground">
              {t('settings.proxy.ssh-example')}
            </pre>
          </div>
        </div>
      </SettingsGroup>
      <SettingsGroup
        label={
          <span className="inline-flex items-center gap-1.5">
            <span>{t('settings.proxy.http-title')}</span>
            <Badge variant="outline" className="border-border/60 text-muted-foreground/75">
              {t('settings.proxy.external-badge')}
            </Badge>
          </span>
        }
        hint={t('settings.proxy.http-body')}
      >
        <div className="overflow-hidden rounded-xl border border-border/60 bg-background/85 shadow-[var(--shadow-inset-highlight)]">
          <div className="px-4 py-3">
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-snug text-muted-foreground">
              {t('settings.proxy.http-example')}
            </pre>
          </div>
        </div>
      </SettingsGroup>
    </>
  )
}
