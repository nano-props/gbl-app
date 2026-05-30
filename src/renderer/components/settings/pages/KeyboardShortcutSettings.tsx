import type { ReactNode } from 'react'
import { ShortcutSettings } from '#/renderer/components/settings/ShortcutSettings.tsx'
import { SettingsGroup } from '#/renderer/components/settings/SettingsPrimitives.tsx'
import { useSettingsStore } from '#/renderer/stores/settings.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import { helpShortcutSections, type HelpShortcutRow, type HelpShortcutSection } from '#/renderer/keyboard/help-shortcuts.ts'

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.map((k, i) => (
        <span key={i} className="inline-flex items-center gap-0.5">
          {i > 0 && <span className="text-[10px] text-muted-foreground/60">+</span>}
          <span className="kbd">{k}</span>
        </span>
      ))}
    </span>
  )
}

function KeyCombos({ combos }: { combos: string[][] }) {
  return (
    <span className="flex shrink-0 flex-wrap justify-end gap-x-1 gap-y-0.5">
      {combos.map((combo, i) => (
        <span key={`${combo.join('+')}:${i}`} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-[11px] text-muted-foreground/60">/</span>}
          <KeyCombo keys={combo} />
        </span>
      ))}
    </span>
  )
}

function ShortcutRow({ row }: { row: HelpShortcutRow }) {
  const t = useT()
  return (
    <li className="flex min-h-9 items-center justify-between gap-3 border-t border-separator px-3 py-1.5">
      <span className="min-w-0 pr-2 text-[13px] leading-snug text-foreground">{t(row.labelKey)}</span>
      <KeyCombos combos={row.combos} />
    </li>
  )
}

function ShortcutList({ sections }: { sections: HelpShortcutSection[] }) {
  const t = useT()
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-background/85 shadow-[var(--shadow-inset-highlight)]">
      {sections.map((section) => (
        <section key={section.titleKey} className="[&+&]:border-t [&+&]:border-separator">
          <div className="flex h-8 items-center bg-muted/35 px-3 text-[11px] font-medium text-muted-foreground">
            {t(section.titleKey)}
          </div>
          <ul>
            {section.rows.map((row) => (
              <ShortcutRow key={`${row.labelKey}:${row.combos.map((combo) => combo.join('+')).join('/')}`} row={row} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function KeyboardShortcutSettings() {
  const t = useT()
  const globalShortcut = useSettingsStore((s) => s.globalShortcut)
  const swapCloseShortcuts = useSettingsStore((s) => s.swapCloseShortcuts)
  return (
    <>
      <SettingsGroup label={t('settings.shortcuts')}>
        <ShortcutSettings />
      </SettingsGroup>
      <SettingsGroup label={t('help.title')} hint={t('help.hint')}>
        <ShortcutList sections={helpShortcutSections(globalShortcut, swapCloseShortcuts)} />
      </SettingsGroup>
    </>
  )
}
