import type { ResolvedEditorApp, ResolvedTerminalApp } from '#/shared/rpc.ts'
import { Code2, Terminal } from 'lucide-react'
import { AppleTerminalIcon } from '#/renderer/components/ExternalAppIcon/AppleTerminalIcon.tsx'
import { CursorIcon } from '#/renderer/components/ExternalAppIcon/CursorIcon.tsx'
import { GhosttyIcon } from '#/renderer/components/ExternalAppIcon/GhosttyIcon.tsx'
import type { AppIconProps } from '#/renderer/components/ExternalAppIcon/types.ts'
import { VSCodeIcon } from '#/renderer/components/ExternalAppIcon/VSCodeIcon.tsx'
import { WindsurfIcon } from '#/renderer/components/ExternalAppIcon/WindsurfIcon.tsx'
import { svgClass } from '#/renderer/components/ExternalAppIcon/svg-class.ts'

type TerminalIconPref = ResolvedTerminalApp | 'auto'
type EditorIconPref = ResolvedEditorApp | 'auto'

export function TerminalAppIcon({ pref, className }: AppIconProps & { pref: TerminalIconPref }) {
  if (pref === 'auto') return <Terminal className={svgClass(className)} />
  return pref === 'terminal' ? <AppleTerminalIcon className={className} /> : <GhosttyIcon className={className} />
}

export function EditorAppIcon({ pref, className }: AppIconProps & { pref: EditorIconPref }) {
  if (pref === 'auto') return <Code2 className={svgClass(className)} />
  if (pref === 'cursor') return <CursorIcon className={className} />
  if (pref === 'windsurf') return <WindsurfIcon className={className} />
  return <VSCodeIcon className={className} />
}

export { AppleTerminalIcon } from '#/renderer/components/ExternalAppIcon/AppleTerminalIcon.tsx'
export { CursorIcon } from '#/renderer/components/ExternalAppIcon/CursorIcon.tsx'
export { GhosttyIcon } from '#/renderer/components/ExternalAppIcon/GhosttyIcon.tsx'
export { VSCodeIcon } from '#/renderer/components/ExternalAppIcon/VSCodeIcon.tsx'
export { WindsurfIcon } from '#/renderer/components/ExternalAppIcon/WindsurfIcon.tsx'
