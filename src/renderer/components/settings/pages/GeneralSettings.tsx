import { useState, type ReactNode } from 'react'
import { Laptop, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/renderer/components/ui/button.tsx'
import { Switch } from '#/renderer/components/ui/switch.tsx'
import { SettingsGroup, SettingsList, SettingsRow, SettingsSelect } from '#/renderer/components/settings/SettingsPrimitives.tsx'
import { useThemeStore } from '#/renderer/stores/theme.ts'
import { useSettingsStore } from '#/renderer/stores/settings.ts'
import { useI18nStore, useT } from '#/renderer/stores/i18n.ts'
import { COLOR_THEMES } from '#/shared/color-theme.ts'
import type { ColorTheme } from '#/shared/color-theme.ts'
import type { LangPref, ThemePref } from '#/shared/rpc.ts'
import { terminalBridge } from '#/renderer/terminal.ts'

export function GeneralSettings() {
  const t = useT()
  const themePref = useThemeStore((s) => s.pref)
  const setThemePref = useThemeStore((s) => s.setPref)
  const colorTheme = useThemeStore((s) => s.colorTheme)
  const setColorTheme = useThemeStore((s) => s.setColorTheme)
  const toggleDetailOnActionBarBlankClick = useSettingsStore((s) => s.toggleDetailOnActionBarBlankClick)
  const setToggleDetailOnActionBarBlankClick = useSettingsStore((s) => s.setToggleDetailOnActionBarBlankClick)
  const terminalNotificationsEnabled = useSettingsStore((s) => s.terminalNotificationsEnabled)
  const setTerminalNotificationsEnabled = useSettingsStore((s) => s.setTerminalNotificationsEnabled)
  const langPref = useI18nStore((s) => s.pref)
  const setLangPref = useI18nStore((s) => s.setPref)
  const [testingTerminalNotification, setTestingTerminalNotification] = useState(false)
  const appearanceOptions: { value: ThemePref; labelKey: string; icon: ReactNode }[] = [
    { value: 'auto', labelKey: 'settings.appearance.auto', icon: <Laptop className="size-4" /> },
    { value: 'light', labelKey: 'settings.appearance.light', icon: <Sun className="size-4" /> },
    { value: 'dark', labelKey: 'settings.appearance.dark', icon: <Moon className="size-4" /> },
  ]
  const themePresetOptions: { value: ColorTheme; labelKey: string }[] = COLOR_THEMES.map((value) => ({
    value,
    labelKey: `settings.theme-preset.${value}`,
  }))
  const langOptions: { value: LangPref; labelKey: string; emoji: string }[] = [
    { value: 'auto', labelKey: 'settings.lang.auto', emoji: '🌐' },
    { value: 'en', labelKey: 'settings.lang.en', emoji: '🇺🇸' },
    { value: 'zh', labelKey: 'settings.lang.zh', emoji: '🇨🇳' },
    { value: 'ko', labelKey: 'settings.lang.ko', emoji: '🇰🇷' },
    { value: 'ja', labelKey: 'settings.lang.ja', emoji: '🇯🇵' },
  ]
  const save = (fn: () => Promise<unknown>, label: string) => {
    void fn().catch((err) => console.warn(`[settings] ${label} update failed`, err))
  }
  const testTerminalNotification = () => {
    if (testingTerminalNotification) return
    setTestingTerminalNotification(true)
    void terminalBridge
      .sendTestNotification()
      .then((shown) => {
        if (shown) {
          toast.success(t('settings.terminal-notifications-test-sent'))
        } else {
          toast.error(t('settings.terminal-notifications-test-failed'), {
            description: t('settings.terminal-notifications-test-failed-hint'),
          })
        }
      })
      .catch((err) => {
        console.warn('[settings] terminal notification test failed', err)
        toast.error(t('settings.terminal-notifications-test-failed'), {
          description: t('settings.terminal-notifications-test-failed-hint'),
        })
      })
      .finally(() => {
        setTestingTerminalNotification(false)
      })
  }

  return (
    <>
      <SettingsGroup label={t('settings.group.general')}>
        <SettingsList>
          <SettingsRow
            controlId="settings-theme-preset"
            label={t('settings.theme-preset')}
            control={
              <SettingsSelect
                id="settings-theme-preset"
                value={colorTheme}
                options={themePresetOptions.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                onChange={(v) => save(() => setColorTheme(v), 'theme preset')}
              />
            }
          />
          <SettingsRow
            controlId="settings-appearance"
            label={t('settings.appearance')}
            control={
              <SettingsSelect
                id="settings-appearance"
                value={themePref}
                options={appearanceOptions.map((o) => ({ value: o.value, label: t(o.labelKey), icon: o.icon }))}
                onChange={(v) => save(() => setThemePref(v), 'appearance')}
              />
            }
          />
          <SettingsRow
            controlId="settings-language"
            label={t('settings.lang')}
            control={
              <SettingsSelect
                id="settings-language"
                value={langPref}
                options={langOptions.map((o) => ({ value: o.value, label: `${o.emoji} ${t(o.labelKey)}` }))}
                onChange={(v) => save(() => setLangPref(v), 'language')}
              />
            }
          />
          <SettingsRow
            controlId="settings-action-bar-blank-toggle"
            label={t('settings.action-bar-blank-toggle')}
            hint={t('settings.action-bar-blank-toggle-hint')}
            control={
              <Switch
                id="settings-action-bar-blank-toggle"
                checked={toggleDetailOnActionBarBlankClick}
                onCheckedChange={(enabled) => save(() => setToggleDetailOnActionBarBlankClick(enabled), 'action bar blank toggle')}
                aria-label={t('settings.action-bar-blank-toggle')}
              />
            }
          />
          <SettingsRow
            controlId="settings-terminal-notifications"
            label={t('settings.terminal-notifications')}
            hint={t('settings.terminal-notifications-hint')}
            control={
              <Switch
                id="settings-terminal-notifications"
                checked={terminalNotificationsEnabled}
                onCheckedChange={(enabled) => save(() => setTerminalNotificationsEnabled(enabled), 'terminal notifications')}
                aria-label={t('settings.terminal-notifications')}
              />
            }
          />
          <SettingsRow
            controlId="settings-terminal-notifications-test"
            label={t('settings.terminal-notifications-test')}
            hint={t('settings.terminal-notifications-test-hint')}
            control={
              <Button
                id="settings-terminal-notifications-test"
                type="button"
                data-interactive
                size="sm"
                variant="outline"
                onClick={testTerminalNotification}
                disabled={testingTerminalNotification}
              >
                {t('settings.terminal-notifications-test-button')}
              </Button>
            }
          />
        </SettingsList>
      </SettingsGroup>
      <SettingsGroup label={t('settings.general.open-from-terminal-title')} hint={t('settings.general.open-from-terminal-body')}>
        <div className="overflow-hidden rounded-xl border border-border/60 bg-background/85 shadow-[var(--shadow-inset-highlight)]">
          <div className="px-4 py-3">
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-snug text-muted-foreground">
              {t('settings.general.open-from-terminal-command')}
            </pre>
          </div>
        </div>
      </SettingsGroup>
    </>
  )
}
