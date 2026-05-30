import { lastPathSegment } from '#/renderer/lib/paths.ts'
import { useSettingsStore } from '#/renderer/stores/settings.ts'
import { terminalBridge } from '#/renderer/terminal.ts'
import type { TerminalBellEvent, TerminalDescriptor } from '#/renderer/components/terminal/types.ts'

const BELL_NOTIFICATION_DEBOUNCE_MS = 5000

export interface TerminalBellController {
  hasBell: (key: string) => boolean
  clear: (key: string) => boolean
  remove: (key: string) => void
  reset: () => void
  handleBell: (descriptor: TerminalDescriptor, event: TerminalBellEvent) => void
}

export function createTerminalBellController(
  notify: () => void,
  onBadgeChange: (count: number) => void,
): TerminalBellController {
  const unreadKeys = new Set<string>()
  const lastNotificationAt = new Map<string, number>()

  function notifyAndBadge() {
    notify()
    onBadgeChange(unreadKeys.size)
  }

  return {
    hasBell(key) {
      return unreadKeys.has(key)
    },
    clear(key) {
      const changed = unreadKeys.delete(key)
      if (changed) notifyAndBadge()
      return changed
    },
    remove(key) {
      const had = unreadKeys.has(key)
      unreadKeys.delete(key)
      lastNotificationAt.delete(key)
      if (had) onBadgeChange(unreadKeys.size)
    },
    reset() {
      const had = unreadKeys.size > 0
      unreadKeys.clear()
      lastNotificationAt.clear()
      if (had) onBadgeChange(0)
    },
    handleBell(descriptor, event) {
      const windowFocused = typeof document !== 'undefined' ? document.hasFocus() : true
      if (event.visible && windowFocused) return
      const changed = !unreadKeys.has(descriptor.key)
      unreadKeys.add(descriptor.key)
      if (changed) notifyAndBadge()
      if (!useSettingsStore.getState().terminalNotificationsEnabled) return
      const now = Date.now()
      const lastNotifiedAt = lastNotificationAt.get(descriptor.key) ?? 0
      if (now - lastNotifiedAt < BELL_NOTIFICATION_DEBOUNCE_MS) return
      lastNotificationAt.set(descriptor.key, now)
      const repoName = lastPathSegment(descriptor.repoRoot)
      const bodyParts = [descriptor.branch]
      if (event.processName) bodyParts.push(event.processName)
      void terminalBridge
        .notifyBell({ title: repoName, body: bodyParts.join('\n'), repoRoot: descriptor.repoRoot })
        .catch(() => {})
    },
  }
}
