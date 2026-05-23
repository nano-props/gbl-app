// Editor backend registry. Each editor app implements EditorBackend
// and registers itself here. The resolver picks the right one based on
// the user's EditorPref setting.
//
// Adding a new editor:
// 1. Create src/main/system/<name>.ts implementing EditorBackend
// 2. Register it in the `backends` map below
// 3. Add the new id to EditorPref in main/settings.ts and shared/rpc.ts
// 4. Add i18n keys for the settings picker and dependencies overlay

import type { EditorPref } from '#/main/settings.ts'
import { isVSCodeInstalled, openInVSCode } from '#/main/system/vscode.ts'
import { isCursorInstalled, openInCursor } from '#/main/system/cursor.ts'
import { isWindsurfInstalled, openInWindsurf } from '#/main/system/windsurf.ts'

export interface EditorBackend {
  /** Whether this editor is available on the current system.
   *  Sync — backed by file-existence checks that are cheap on macOS.
   *  If a future backend needs async detection, resolve it at
   *  registration time and cache the result. */
  isInstalled: () => boolean
  /** Open a directory in this editor. */
  open: (path: string) => Promise<{ ok: boolean; message: string }>
}

/** Concrete editor pref values (excludes 'auto'). */
type ConcreteEditorId = Exclude<EditorPref, 'auto'>

const backends: Record<ConcreteEditorId, EditorBackend> = {
  vscode: { isInstalled: isVSCodeInstalled, open: openInVSCode },
  cursor: { isInstalled: isCursorInstalled, open: openInCursor },
  windsurf: { isInstalled: isWindsurfInstalled, open: openInWindsurf },
}

/** Auto-detection priority — first installed editor wins. */
const AUTO_PRIORITY: ConcreteEditorId[] = ['vscode', 'cursor', 'windsurf']

function resolveBackend(pref: EditorPref): EditorBackend | null {
  if (pref !== 'auto') {
    const backend = backends[pref]
    return backend.isInstalled() ? backend : null
  }
  for (const id of AUTO_PRIORITY) {
    const backend = backends[id]
    if (backend.isInstalled()) return backend
  }
  return null
}

/** Open `path` in the editor selected by `pref`.
 *  Returns null if no editor is available (auto mode, none installed). */
export function openInPreferredEditor(
  path: string,
  pref: EditorPref,
): Promise<{ ok: boolean; message: string }> | null {
  const backend = resolveBackend(pref)
  return backend ? backend.open(path) : null
}

/** Whether any editor is available for the given pref. */
export function isEditorAvailable(pref: EditorPref): boolean {
  return resolveBackend(pref) !== null
}
