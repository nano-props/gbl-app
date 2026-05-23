// Terminal backend registry. Each terminal app implements TerminalBackend
// and registers itself here. The resolver picks the right one based on
// the user's TerminalPref setting.
//
// Adding a new terminal:
// 1. Create src/main/system/<name>.ts implementing TerminalBackend
// 2. Register it in the `backends` map below
// 3. Add the new id to TerminalPref in main/settings.ts and shared/rpc.ts
// 4. Add i18n keys for the settings picker

import type { TerminalPref } from '#/main/settings.ts'
import { isGhosttyInstalled, openInGhostty } from '#/main/system/ghostty.ts'
import { openInAppleTerminal } from '#/main/system/apple-terminal.ts'

export interface TerminalBackend {
  /** Whether this terminal is available on the current system.
   *  Sync — backed by file-existence checks that are cheap on macOS.
   *  If a future backend needs async detection (e.g. mdfind), resolve
   *  it at registration time and cache the result. */
  isInstalled: () => boolean
  /** Open a directory in this terminal. */
  open: (path: string) => Promise<{ ok: boolean; message: string }>
}

/** Concrete terminal pref values (excludes 'auto'). */
type ConcreteTerminalId = Exclude<TerminalPref, 'auto'>

const backends: Record<ConcreteTerminalId, TerminalBackend> = {
  ghostty: { isInstalled: isGhosttyInstalled, open: openInGhostty },
  terminal: { isInstalled: () => true, open: openInAppleTerminal },
}

/** Auto-detection priority — first installed backend wins. */
const AUTO_PRIORITY: ConcreteTerminalId[] = ['ghostty', 'terminal']

function resolveBackend(pref: TerminalPref): TerminalBackend | null {
  if (pref !== 'auto') {
    const backend = backends[pref]
    return backend.isInstalled() ? backend : null
  }
  for (const id of AUTO_PRIORITY) {
    const backend = backends[id]
    if (backend.isInstalled()) return backend
  }
  // Unreachable on macOS (Terminal.app is always available), but
  // a safe fallback.
  return backends.terminal
}

/** Open `path` in the terminal selected by `pref`. */
export function openInPreferredTerminal(path: string, pref: TerminalPref): Promise<{ ok: boolean; message: string }> {
  return resolveBackend(pref)?.open(path) ?? Promise.resolve({ ok: false, message: 'error.terminal-not-installed' })
}

export function isTerminalAvailable(pref: TerminalPref): boolean {
  return resolveBackend(pref) !== null
}
