export const SETTINGS_PAGES = ['general', 'github', 'apps', 'sync', 'proxy', 'shortcuts', 'about'] as const

export type SettingsPage = (typeof SETTINGS_PAGES)[number]

export function isSettingsPage(value: string | null | undefined): value is SettingsPage {
  return value !== undefined && value !== null && SETTINGS_PAGES.includes(value as SettingsPage)
}
