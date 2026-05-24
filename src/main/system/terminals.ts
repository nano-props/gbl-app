// Terminal backend registry. Each terminal app implements TerminalBackend
// and registers itself here. The resolver picks the right one based on
// the user's TerminalPref setting.
//
// Adding a new terminal:
// 1. Create src/main/system/<name>.ts implementing TerminalBackend
// 2. Register it in the `backends` map below
// 3. Add the new id to TerminalPref in shared/rpc.ts
// 4. Add i18n keys for the settings picker

import type { ResolvedTerminalApp, TerminalPref } from '#/shared/rpc.ts'
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
const backends: Record<ResolvedTerminalApp, TerminalBackend> = {
  ghostty: { isInstalled: isGhosttyInstalled, open: openInGhostty },
  terminal: { isInstalled: () => true, open: openInAppleTerminal },
}

/** Auto-detection priority — first installed backend wins. */
const AUTO_PRIORITY: ResolvedTerminalApp[] = ['ghostty', 'terminal']

function resolveTerminalApp(pref: TerminalPref): ResolvedTerminalApp | null {
  if (pref !== 'auto') {
    const backend = backends[pref]
    return backend.isInstalled() ? pref : null
  }
  for (const id of AUTO_PRIORITY) {
    const backend = backends[id]
    if (backend.isInstalled()) return id
  }
  // Unreachable on macOS (Terminal.app is always available), but
  // a safe fallback.
  return 'terminal'
}

/** Open `path` in the terminal selected by `pref`. */
export function openInPreferredTerminal(path: string, pref: TerminalPref): Promise<{ ok: boolean; message: string }> {
  const resolved = resolveTerminalApp(pref)
  return resolved ? backends[resolved].open(path) : Promise.resolve({ ok: false, message: 'error.terminal-not-installed' })
}

export function getResolvedTerminalApp(pref: TerminalPref): ResolvedTerminalApp | null {
  return resolveTerminalApp(pref)
}
