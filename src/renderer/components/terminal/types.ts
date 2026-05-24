import type { TerminalExitEvent, TerminalOutputEvent } from '#/shared/terminal.ts'

export type TerminalPhase = 'opening' | 'open' | 'ended' | 'error'

export interface TerminalDescriptor {
  key: string
  repoRoot: string
  branch: string
  worktreePath: string
}

export interface TerminalSnapshot {
  phase: TerminalPhase
  message: string | null
  exitCode?: number
}

export interface TerminalSessionContextValue {
  version: number
  attach: (descriptor: TerminalDescriptor, host: HTMLElement) => void
  detach: (key: string, host: HTMLElement) => void
  restart: (key: string) => void
  snapshot: (key: string) => TerminalSnapshot
  isTerminalFocusTarget: (key: string, target: EventTarget | null) => boolean
}

export interface ManagedTerminalSessionLike {
  descriptor: TerminalDescriptor
  updateDescriptor: (descriptor: TerminalDescriptor) => void
  attach: (host: HTMLElement) => void
  detach: (host: HTMLElement, parkingRoot: HTMLElement) => void
  restart: () => void
  dispose: () => void
  snapshot: () => TerminalSnapshot
  isTerminalFocusTarget: (target: EventTarget | null) => boolean
  handleOutput: (event: TerminalOutputEvent) => void
  handleExit: (event: TerminalExitEvent) => void
}
