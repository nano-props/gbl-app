// Keyboard shortcuts cheat-sheet. Dismissed via Esc / click-outside /
// the close button (all handled by Modal).

import { Modal } from '#/renderer/components/Modal.tsx'
import { useT } from '#/renderer/stores/i18n.ts'

interface Props {
  open: boolean
  onClose: () => void
}

const SECTIONS: { titleKey: string; rows: { keys: string[]; labelKey: string }[] }[] = [
  {
    titleKey: 'help.section.nav',
    rows: [
      { keys: ['j', '↓'], labelKey: 'help.row.nextBranch' },
      { keys: ['k', '↑'], labelKey: 'help.row.prevBranch' },
      { keys: ['⌘', ']'], labelKey: 'help.row.nextRepo' },
      { keys: ['⌘', '['], labelKey: 'help.row.prevRepo' },
    ],
  },
  {
    titleKey: 'help.section.views',
    rows: [
      { keys: ['⌘', '1'], labelKey: 'help.row.viewBranches' },
      { keys: ['⌘', '2'], labelKey: 'help.row.viewStatus' },
      { keys: ['⌘', '3'], labelKey: 'help.row.viewLog' },
    ],
  },
  {
    titleKey: 'help.section.actions',
    rows: [
      { keys: ['Enter'], labelKey: 'help.row.checkout' },
      { keys: ['⌘', 'O'], labelKey: 'help.row.openRepo' },
      { keys: ['⌘', '⇧', 'W'], labelKey: 'help.row.closeRepo' },
      { keys: ['⌘', 'R'], labelKey: 'help.row.refresh' },
      { keys: ['⌘', ','], labelKey: 'help.row.settings' },
      { keys: ['?'], labelKey: 'help.row.thisHelp' },
      { keys: ['Esc'], labelKey: 'help.row.dismiss' },
    ],
  },
]

export function HelpOverlay({ open, onClose }: Props) {
  const t = useT()
  return (
    <Modal open={open} title={t('help.title')} onClose={onClose} widthClass="max-w-md">
      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <div key={section.titleKey}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">{t(section.titleKey)}</div>
            <ul className="space-y-1.5">
              {section.rows.map((row) => (
                <li key={row.labelKey} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink-2">{t(row.labelKey)}</span>
                  <span className="flex gap-1 shrink-0">
                    {row.keys.map((k, i) => (
                      <span key={i} className="kbd">
                        {k}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  )
}
