// Settings overlay — theme pref, language, auto-fetch interval, recents
// management. Mounted unconditionally and gated by `open`; the modal
// itself returns null when closed.

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '#/renderer/components/Modal.tsx'
import { useThemeStore } from '#/renderer/stores/theme.ts'
import { useSettingsStore } from '#/renderer/stores/settings.ts'
import { useI18nStore, useT } from '#/renderer/stores/i18n.ts'
import { cn } from '#/renderer/lib/cn.ts'
import type { LangPref, ThemePref } from '#/renderer/types-bridge.ts'

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsPanel({ open, onClose }: Props) {
  const t = useT()
  const themePref = useThemeStore((s) => s.pref)
  const setThemePref = useThemeStore((s) => s.setPref)
  const langPref = useI18nStore((s) => s.pref)
  const setLangPref = useI18nStore((s) => s.setPref)
  const fetchInterval = useSettingsStore((s) => s.fetchIntervalSec)
  const setFetchInterval = useSettingsStore((s) => s.setFetchInterval)
  const recents = useSettingsStore((s) => s.recents)
  const clearRecents = useSettingsStore((s) => s.clearRecents)
  const [confirming, setConfirming] = useState(false)

  const themeOptions: { value: ThemePref; labelKey: string }[] = [
    { value: 'auto', labelKey: 'settings.theme.auto' },
    { value: 'light', labelKey: 'settings.theme.light' },
    { value: 'dark', labelKey: 'settings.theme.dark' },
  ]
  const langOptions: { value: LangPref; labelKey: string }[] = [
    { value: 'auto', labelKey: 'settings.lang.auto' },
    { value: 'en', labelKey: 'settings.lang.en' },
    { value: 'zh', labelKey: 'settings.lang.zh' },
    { value: 'ko', labelKey: 'settings.lang.ko' },
    { value: 'ja', labelKey: 'settings.lang.ja' },
  ]
  const intervalOptions: { value: number; labelKey: string }[] = [
    { value: 0, labelKey: 'settings.fetch.off' },
    { value: 30, labelKey: 'settings.fetch.30s' },
    { value: 60, labelKey: 'settings.fetch.1m' },
    { value: 300, labelKey: 'settings.fetch.5m' },
    { value: 900, labelKey: 'settings.fetch.15m' },
  ]

  const buildInfo = `GBL · v${__APP_VERSION__}`

  return (
    <Modal open={open} title={t('settings.title')} onClose={onClose} widthClass="max-w-lg">
      <div className="space-y-6">
        <Section label={t('settings.appearance')}>
          <SegmentedControl
            value={themePref}
            options={themeOptions.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
            onChange={(v) => void setThemePref(v as ThemePref)}
          />
        </Section>

        <Section label={t('settings.lang')}>
          <SegmentedControl
            value={langPref}
            options={langOptions.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
            onChange={(v) => void setLangPref(v as LangPref)}
          />
        </Section>

        <Section label={t('settings.fetch')} hint={t('settings.fetchHint')}>
          <SegmentedControl
            value={fetchInterval}
            options={intervalOptions.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
            onChange={(v) => void setFetchInterval(v as number)}
          />
        </Section>

        <Section label={t('settings.recents')} hint={t('settings.recentsCount', { n: recents.length })}>
          <button
            type="button"
            disabled={recents.length === 0}
            onClick={() => {
              if (confirming) {
                void clearRecents()
                setConfirming(false)
              } else {
                setConfirming(true)
              }
            }}
            onBlur={() => setConfirming(false)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs',
              recents.length === 0
                ? 'border-line-2 text-ink-4 cursor-not-allowed'
                : confirming
                  ? 'border-[rgb(var(--color-danger-rgb)/0.4)] bg-[rgb(var(--color-danger-rgb)/0.08)] text-danger'
                  : 'border-line-2 text-ink-2 hover:text-ink hover:bg-bg-deep',
            )}
          >
            <Trash2 size={12} />
            {confirming ? t('settings.clearRecentsConfirm') : t('settings.clearRecents')}
          </button>
        </Section>

        <div className="border-t border-line pt-3 text-xs text-ink-4">{buildInfo}</div>
      </div>
    </Modal>
  )
}

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      {hint && <div className="mb-2 text-xs text-ink-3">{hint}</div>}
      {children}
    </div>
  )
}

interface SegmentedProps<T extends string | number> {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

function SegmentedControl<T extends string | number>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="inline-flex rounded-md border border-line-2 bg-bg-deep p-0.5">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'h-7 px-3 rounded text-xs',
            opt.value === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
