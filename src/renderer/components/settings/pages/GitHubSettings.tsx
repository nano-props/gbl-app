import { useEffect, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { Badge } from '#/renderer/components/ui/badge.tsx'
import { Button } from '#/renderer/components/ui/button.tsx'
import { SettingsGroup, SettingsList, SettingsRow } from '#/renderer/components/settings/SettingsPrimitives.tsx'
import { useSettingsStore } from '#/renderer/stores/settings.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import { cn } from '#/renderer/lib/cn.ts'

function hostLoginCommand(host: string): string {
  return host === 'github.com' ? 'gh auth login' : `gh auth login --hostname ${host}`
}

export function GitHubSettings() {
  const t = useT()
  const githubCliAvailable = useSettingsStore((s) => s.githubCliAvailable)
  const githubCliVersion = useSettingsStore((s) => s.githubCliVersion)
  const githubCliHosts = useSettingsStore((s) => s.githubCliHosts)
  const refreshGitHubCli = useSettingsStore((s) => s.refreshGitHubCli)
  const hostStates = Object.values(githubCliHosts).sort((a, b) => a.host.localeCompare(b.host))
  const [refreshingGitHubCli, setRefreshingGitHubCli] = useState(false)

  useEffect(() => {
    void refreshGitHubCli().catch((err) => {
      console.warn('[settings] initial GitHub CLI refresh failed', err)
    })
  }, [])

  const handleGitHubCliRefresh = () => {
    if (refreshingGitHubCli) return
    setRefreshingGitHubCli(true)
    void refreshGitHubCli()
      .catch((err) => {
        console.warn('[settings] GitHub CLI refresh failed', err)
      })
      .finally(() => {
        setRefreshingGitHubCli(false)
      })
  }

  return (
    <SettingsGroup label={t('settings.github.title')} hint={t('settings.github.body')}>
      <SettingsList>
        <SettingsRow
          controlId="settings-github-cli"
          label={
            <span className="inline-flex items-center gap-2">
              <span>{t('settings.github.cli-label')}</span>
              <Badge
                variant={githubCliAvailable ? 'success' : 'outline'}
                className={cn(githubCliAvailable ? '' : 'text-muted-foreground')}
              >
                {t(githubCliAvailable ? 'settings.github.status-available' : 'settings.github.status-unavailable')}
              </Badge>
            </span>
          }
          hint={githubCliAvailable ? githubCliVersion ?? t('settings.github.hint-installed') : t('settings.github.hint-missing')}
          control={
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                data-interactive
                variant="outline"
                size="sm"
                onClick={handleGitHubCliRefresh}
                disabled={refreshingGitHubCli}
              >
                <RotateCw className={cn('size-3', refreshingGitHubCli && 'animate-spin')} />
                {t('settings.github.refresh')}
              </Button>
            </div>
          }
        />
        {hostStates.length > 0 ? (
          hostStates.map((hostState) => (
            <SettingsRow
              key={hostState.host}
              controlId={`settings-github-host-${hostState.host}`}
              label={
                <span className="inline-flex items-center gap-2">
                  <span className="font-mono text-xs">{hostState.host}</span>
                  <Badge
                    variant={hostState.authenticated ? 'success' : 'outline'}
                    className={cn(hostState.authenticated ? '' : 'text-muted-foreground')}
                  >
                    {t(hostState.authenticated ? 'settings.github.auth-signed-in' : 'settings.github.auth-signed-out')}
                  </Badge>
                </span>
              }
              hint={
                hostState.authenticated
                  ? hostState.activeLogin
                    ? `${t('settings.github.auth-account')} ${hostState.activeLogin}`
                    : t('settings.github.auth-signed-in-hint')
                  : `${t('settings.github.auth-login-required')} ${hostLoginCommand(hostState.host)}`
              }
              control={
                <div className="flex w-72 items-center justify-end gap-2 text-xs text-muted-foreground">
                  {hostState.tokenSource ? (
                    <span className="truncate">
                      {t('settings.github.auth-token-source')} {hostState.tokenSource}
                    </span>
                  ) : hostState.logins.length > 1 ? (
                    <span className="truncate">{hostState.logins.join(', ')}</span>
                  ) : null}
                </div>
              }
            />
          ))
        ) : (
          <div className="px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">{t('settings.github.no-hosts')}</div>
        )}
      </SettingsList>
    </SettingsGroup>
  )
}
